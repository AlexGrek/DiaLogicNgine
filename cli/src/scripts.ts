import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { isScriptKey } from "../../dialogic/src/game/verify";
import { gameGet, gamePut } from "./bulk";
import { Rest } from "./rest";
import { note, writeAtomic } from "./out";
import { syntaxError } from "./syntax";

/** Parameters every game script is compiled with. */
export const DEFAULT_PARAMS = "rt, state, props, ch, facts, objectives, situation, items, context";
export const MANIFEST_NAME = "scripts.json";

export interface ScriptRef {
  /** Readable relative path without ".js", e.g. dialogs/main/windows/start/entryScript */
  path: string;
  /** RFC 6901 pointer into game.json */
  pointer: string;
  src: string;
  /** Parameter list for syntax checking. */
  params: string;
}

export interface ManifestEntry {
  pointer: string;
  /** sha256 of the script, trailing newlines ignored */
  sha256: string;
  params?: string;
}

export interface Manifest {
  project: string;
  /** keyed by "<path>.js" */
  files: Record<string, ManifestEntry>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type J = any;

export const norm = (s: string) => s.replace(/\n+$/, "");
/** Manifest JSON with sorted file keys (stable diffs, same bytes as the Go CLI wrote). */
export function manifestText(man: Manifest): string {
  const files: Record<string, ManifestEntry> = {};
  for (const k of Object.keys(man.files).sort()) files[k] = man.files[k];
  return JSON.stringify({ project: man.project, files }, null, 2) + "\n";
}

export const sum = (s: string) => createHash("sha256").update(norm(s)).digest("hex");
const escTok = (s: string) => s.replace(/~/g, "~0").replace(/\//g, "~1");
const SAFE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

/** A readable, unique, filename-safe name per array element (uid, id or name), else the index. */
function elementNames(arr: J[]): string[] {
  const names = arr.map((el, i) => {
    if (el && typeof el === "object" && !Array.isArray(el)) {
      for (const k of ["uid", "id", "name"]) {
        const s = el[k];
        if (typeof s === "string" && SAFE_NAME.test(s) && !s.endsWith(".js")) return s;
      }
    }
    return String(i);
  });
  const seen = new Map<string, number>();
  for (const n of names) seen.set(n, (seen.get(n) ?? 0) + 1);
  return names.map((n, i) => ((seen.get(n) ?? 0) > 1 ? String(i) : n)); // duplicates → all fall back to the index
}

/** Every script in the game, in document order (object keys sorted, like the Go CLI). */
export function collectScripts(game: J): ScriptRef[] {
  const out: ScriptRef[] = [];
  const walk = (v: J, ptr: string, path: string) => {
    if (Array.isArray(v)) {
      const names = elementNames(v);
      v.forEach((el, i) => walk(el, `${ptr}/${i}`, `${path}/${names[i]}`));
    } else if (v && typeof v === "object") {
      for (const k of Object.keys(v).sort()) {
        const child = v[k];
        const p = `${ptr}/${escTok(k)}`, pa = `${path}/${k}`;
        if (typeof child === "string") {
          if (isScriptKey(k) && child.trim() && SAFE_NAME.test(k)) {
            const params = k === "body" && typeof v.args === "string" ? v.args : DEFAULT_PARAMS;
            out.push({ path: pa.replace(/^\//, ""), pointer: p, src: child, params });
          }
          continue;
        }
        walk(child, p, pa);
      }
    }
  };
  walk(game, "", "");
  return out;
}

function ptrTokens(ptr: string): string[] {
  return ptr.replace(/^\//, "").split("/").map((t) => t.replace(/~1/g, "/").replace(/~0/g, "~"));
}

function ptrParent(g: J, ptr: string): [J, string] {
  const toks = ptrTokens(ptr);
  let cur = g;
  for (const t of toks.slice(0, -1)) {
    if (Array.isArray(cur)) {
      const i = Number(t);
      if (!/^\d+$/.test(t) || i >= cur.length) throw new Error(`pointer ${ptr}: bad index ${JSON.stringify(t)}`);
      cur = cur[i];
    } else if (cur && typeof cur === "object") {
      cur = cur[t];
    } else {
      throw new Error(`pointer ${ptr} no longer resolves`);
    }
  }
  return [cur, toks[toks.length - 1]];
}

export function getScript(g: J, ptr: string): string | undefined {
  try {
    const [p, last] = ptrParent(g, ptr);
    if (!p || typeof p !== "object" || Array.isArray(p)) return undefined;
    return typeof p[last] === "string" ? p[last] : undefined;
  } catch {
    return undefined;
  }
}

export function setScript(g: J, ptr: string, val: string): void {
  const [p, last] = ptrParent(g, ptr);
  if (!isScriptKey(last)) throw new Error(`pointer ${ptr} is not a script field; refusing to write`);
  if (!p || typeof p !== "object" || Array.isArray(p)) throw new Error(`pointer ${ptr} no longer resolves`);
  if (typeof p[last] !== "string") throw new Error(`pointer ${ptr} is no longer a script`);
  p[last] = val;
}

export interface Change {
  file: string;
  pointer: string;
  params?: string;
  newSrc: string;
}

export interface Plan {
  changed: Change[];
  conflicts: string[];
  missing: string[];
  unchanged: number;
}

/** Compare the working files with the manifest and the live game. */
export function makePlan(man: Manifest, dir: string, game: J, force: boolean): Plan {
  const p: Plan = { changed: [], conflicts: [], missing: [], unchanged: 0 };
  for (const f of Object.keys(man.files).sort()) {
    const e = man.files[f];
    const path = join(dir, f);
    if (!existsSync(path)) {
      p.missing.push(f);
      continue;
    }
    const newSrc = norm(readFileSync(path, "utf8"));
    if (sum(newSrc) === e.sha256) {
      p.unchanged++;
      continue;
    }
    const cur = getScript(game, e.pointer);
    if (cur === undefined) p.conflicts.push(`${f} (script no longer exists remotely)`);
    else if (norm(cur) === newSrc) p.unchanged++; // already applied remotely
    else if (sum(cur) !== e.sha256 && !force) p.conflicts.push(`${f} (changed remotely since the dump)`);
    else p.changed.push({ file: f, pointer: e.pointer, params: e.params, newSrc });
  }
  return p;
}

// ── commands ──

export async function scriptsDump(r: Rest, project: string, dir: string): Promise<number> {
  const g = JSON.parse(await gameGet(r, project, true));
  const refs = collectScripts(g);
  const man: Manifest = { project, files: {} };
  for (const s of refs) {
    const file = `${s.path}.js`;
    writeAtomic(join(dir, file), s.src.endsWith("\n") ? s.src : s.src + "\n");
    const e: ManifestEntry = { pointer: s.pointer, sha256: sum(s.src) };
    if (s.params && s.params !== DEFAULT_PARAMS) e.params = s.params;
    man.files[file] = e;
  }
  writeAtomic(join(dir, MANIFEST_NAME), manifestText(man));
  return refs.length;
}

function readManifest(dir: string): Manifest {
  const path = join(dir, MANIFEST_NAME);
  if (!existsSync(path)) throw new Error(`${path} not found (run \`dialogic scripts dump\` first)`);
  return JSON.parse(readFileSync(path, "utf8")) as Manifest;
}

async function loadPlan(r: Rest, project: string, dir: string, force: boolean) {
  const man = readManifest(dir);
  if (man.project && man.project !== project) {
    throw new Error(`${dir} was dumped from project ${JSON.stringify(man.project)}, not ${JSON.stringify(project)}`);
  }
  const g = JSON.parse(await gameGet(r, project, true));
  return { man, g, plan: makePlan(man, dir, g, force) };
}

export async function scriptsStatus(r: Rest, project: string, dir: string): Promise<void> {
  const { plan } = await loadPlan(r, project, dir, false);
  for (const c of plan.changed) console.log("M ", c.file);
  for (const c of plan.conflicts) console.log("C ", c);
  for (const m of plan.missing) console.log("D ", m, "(file deleted locally — ignored)");
  note(`${plan.changed.length} modified, ${plan.conflicts.length} conflicts, ${plan.unchanged} unchanged`);
}

export async function scriptsPush(r: Rest, project: string, dir: string, force: boolean, dry: boolean, noCheck: boolean): Promise<void> {
  const { man, g, plan } = await loadPlan(r, project, dir, force);
  if (plan.conflicts.length) {
    throw new Error(`not pushing — conflicts (re-dump, merge, or pass -force to overwrite):\n  ${plan.conflicts.join("\n  ")}`);
  }
  if (!plan.changed.length) {
    note(`nothing to push (${plan.unchanged} unchanged)`);
    return;
  }
  if (!noCheck) {
    const bad = plan.changed
      .map((c) => [c.file, syntaxError(c.params || DEFAULT_PARAMS, c.newSrc)] as const)
      .filter(([, err]) => err)
      .map(([f, err]) => `${f}:\n${err}`);
    if (bad.length) throw new Error(`syntax errors, nothing pushed (-no-check to skip):\n${bad.join("\n")}`);
  }
  for (const c of plan.changed) console.log("M ", c.file);
  if (dry) {
    note(`dry run: ${plan.changed.length} script(s) would be pushed`);
    return;
  }
  for (const c of plan.changed) setScript(g, c.pointer, c.newSrc);
  await gamePut(r, project, JSON.stringify(g));
  for (const c of plan.changed) man.files[c.file].sha256 = sum(c.newSrc); // the working copy is now the baseline
  writeAtomic(join(dir, MANIFEST_NAME), manifestText(man));
  note(`pushed ${plan.changed.length} script(s)`);
}

export async function scriptsList(r: Rest, project: string): Promise<void> {
  for (const s of collectScripts(JSON.parse(await gameGet(r, project, true)))) console.log(s.path);
}

/** Patch one script, addressed by its `scripts list` path. */
export async function scriptsSet(r: Rest, project: string, path: string, src: string, noCheck: boolean): Promise<void> {
  const want = path.replace(/^\/+|\/+$/g, "").replace(/\.js$/, "");
  const g = JSON.parse(await gameGet(r, project, true));
  const s = collectScripts(g).find((x) => x.path === want);
  if (!s) throw new Error(`no script ${JSON.stringify(want)} (see \`dialogic scripts list ${project}\`)`);
  if (!noCheck) {
    const err = syntaxError(s.params, src);
    if (err) throw new Error(`syntax error, nothing pushed:\n${err}`);
  }
  setScript(g, s.pointer, norm(src));
  await gamePut(r, project, JSON.stringify(g));
  note(`patched ${want}`);
}
