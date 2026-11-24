/**
 * Model-aware commands: they read the real game model (types, migration and
 * checks from dialogic/src) instead of treating game.json as opaque bytes.
 */
import Ajv from "ajv";
import jsonpatch from "fast-json-patch";
import { runSanityCheck } from "../../dialogic/src/game/sanityCheck";
import { VerifyIssue, verifyGame } from "../../dialogic/src/game/verify";
import { flagOn, parseFor, readText, UsageError } from "./args";
import { note, printJSON } from "./out";
import { REF_KINDS, Ref, RefKind, buildIndex, findDefinition, parseRef, resolvePointer } from "./refs";
import { GameSource, modelOf, openGame } from "./source";
import { syntaxError } from "./syntax";
import schemaJson from "../../backend/app/game_mcp/schema.json";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type J = any;

const arr = (v: unknown): J[] => (Array.isArray(v) ? v : []);
const text = (t: J): string => (typeof t === "string" ? t : (t?.main ?? ""));
const short = (s: string, n = 60) => {
  const one = String(s ?? "").replace(/\s+/g, " ").trim();
  return one.length > n ? one.slice(0, n - 1) + "…" : one;
};

// ── verify ──

export interface Finding {
  severity: "error" | "warning";
  source: "verify" | "schema" | "sanity";
  where: string;
  message: string;
}

export interface VerifyReport {
  game: string;
  errors: number;
  warnings: number;
  imagesChecked: boolean;
  findings: Finding[];
}

const schemaDefs = (schemaJson as { definitions: Record<string, J> }).definitions;

type Validator = ((data: unknown) => boolean) & { errors?: J[] | null };
let ajvValidate: Validator | null = null;
function schemaValidator(): Validator {
  if (!ajvValidate) {
    const ajv = new Ajv({ allErrors: true, strict: false });
    ajvValidate = ajv.compile(schemaJson as object) as unknown as Validator;
  }
  return ajvValidate;
}

/** All checks: deep static checks, schema, sanity check (images, plus links with -all). */
export async function verifySource(src: GameSource, opts: { allSanity?: boolean; noImages?: boolean } = {}): Promise<VerifyReport> {
  const findings: Finding[] = [];
  const add = (source: Finding["source"]) => (i: VerifyIssue) => findings.push({ source, severity: i.severity, where: i.where, message: i.message });

  verifyGame(src.raw, { checkSyntax: syntaxError }).forEach(add("verify"));

  let model;
  try {
    model = modelOf(src);
  } catch (e) {
    findings.push({ source: "verify", severity: "error", where: "(root)", message: `the game does not load: ${(e as Error).message}` });
    return summarize(src.label, findings, false);
  }

  for (const f of schemaFindings(model)) findings.push(f);

  const images = opts.noImages ? null : await src.images();
  const sanity = runSanityCheck(model, images);
  for (const i of sanity.issues) {
    if (i.category !== "file" && !opts.allSanity) continue; // links are covered by verify
    findings.push({ source: "sanity", severity: i.severity, where: i.location, message: i.message + (i.target ? ` (${i.target})` : "") });
  }
  return summarize(src.label, findings, sanity.checkedFiles);
}

function summarize(game: string, findings: Finding[], imagesChecked: boolean): VerifyReport {
  findings.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "error" ? -1 : 1));
  return {
    game,
    errors: findings.filter((f) => f.severity === "error").length,
    warnings: findings.filter((f) => f.severity === "warning").length,
    imagesChecked,
    findings,
  };
}

/**
 * JSON-schema check of the migrated model. Union types (Prop, links, …) make ajv
 * report one error per branch; those are folded into one finding at the union,
 * quoting the first branch's complaint.
 */
export function schemaFindings(model: unknown): Finding[] {
  const validate = schemaValidator();
  if (validate(model)) return [];
  const errors = validate.errors ?? [];
  const unions = errors.filter((e) => e.keyword === "anyOf" || e.keyword === "oneOf").map((e) => e.instancePath as string);
  const underUnion = (path: string) => unions.find((u) => path === u || path.startsWith(u + "/"));
  const out: Finding[] = [];
  const seen = new Set<string>();
  const describe = (e: J) => {
    const extra = e.keyword === "additionalProperties" ? ` "${e.params?.additionalProperty}"` : e.keyword === "enum" ? ` (${(e.params?.allowedValues ?? []).join(", ")})` : "";
    return `${e.instancePath || ""} ${e.message}${extra}`.trim();
  };
  for (const e of errors) {
    const path = e.instancePath as string;
    if (e.keyword === "anyOf" || e.keyword === "oneOf") {
      if (seen.has(path)) continue;
      seen.add(path);
      const first = errors.find((x) => x !== e && x.keyword !== "anyOf" && x.keyword !== "oneOf" && (x.instancePath === path || x.instancePath.startsWith(path + "/")));
      out.push({ source: "schema", severity: "warning", where: path || "(root)", message: `matches none of the allowed shapes${first ? ` (e.g. ${describe(first)})` : ""}` });
      continue;
    }
    if (underUnion(path)) continue;
    const key = `${path}|${e.keyword}|${e.message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ source: "schema", severity: "warning", where: path || "(root)", message: describe(e).slice(path.length).trim() });
  }
  return out;
}

export function printReport(r: VerifyReport, asText: boolean): void {
  if (!asText) {
    printJSON(r);
    return;
  }
  for (const f of r.findings) {
    process.stdout.write(`${f.severity === "error" ? "ERROR" : "warn "} [${f.source}] ${f.where}: ${f.message}\n`);
  }
  process.stdout.write(`${r.game}: ${r.errors} error(s), ${r.warnings} warning(s)${r.imagesChecked ? "" : " (image files not checked)"}\n`);
}

export async function cmdVerify(args: string[]): Promise<number> {
  const pa = parseFor(args, { bools: ["strict", "text", "all", "no_images", "no_schema"] });
  if (pa.pos.length !== 1) throw new UsageError("usage: dialogic verify GAME [-strict] [-text] [-all] [-no-images] [-no-schema]");
  const src = await openGame(pa.pos[0]);
  const report = await verifySource(src, { allSanity: flagOn(pa, "all"), noImages: flagOn(pa, "no_images") });
  if (flagOn(pa, "no_schema")) {
    report.findings = report.findings.filter((f) => f.source !== "schema");
    Object.assign(report, summarize(report.game, report.findings, report.imagesChecked));
  }
  printReport(report, flagOn(pa, "text"));
  return report.errors > 0 || (flagOn(pa, "strict") && report.warnings > 0) ? 1 : 0;
}

// ── ls ──

const LS_KINDS = ["dialogs", "windows", "chars", "locs", "props", "facts", "items", "quests", "events", "pac", "hooks", "functions", "roles", "meters", "situations", "images"] as const;

export function listing(raw: J, what: string, arg?: string): unknown[] {
  switch (what) {
    case "dialogs":
      return arr(raw.dialogs).map((d) => ({ name: d?.name, windows: arr(d?.windows).length }));
    case "windows": {
      const dialogs = arg ? arr(raw.dialogs).filter((d) => d?.name === arg) : arr(raw.dialogs);
      if (arg && !dialogs.length) throw new Error(`no dialog "${arg}"`);
      return dialogs.flatMap((d) => arr(d?.windows).map((w) => ({
        id: `${d.name}/${w?.uid}`,
        actor: w?.actor?.character ?? null,
        links: arr(w?.links).length,
        entryScript: Boolean(w?.entryScript),
        widget: w?.specialWidget ?? null,
        text: short(text(w?.text)),
      })));
    }
    case "chars":
      return arr(raw.chars).map((c) => ({ uid: c?.uid, name: text(c?.displayName), roles: c?.roles ?? [], talkable: Boolean(c?.dialog), reactions: arr(c?.dialog?.behavior?.reactions).length }));
    case "locs":
      return arr(raw.locs).map((l) => ({ uid: l?.uid, name: l?.displayName, routes: l?.routes ?? [], links: arr(l?.links).length, eventHosts: l?.eventHosts ?? null }));
    case "props":
      return arr(raw.props).map((p) => ({ name: p?.name, datatype: p?.datatype, default: p?.defaultValue, ...(p?.variants ? { variants: p.variants } : {}) }));
    case "facts":
      return arr(raw.facts).map((f) => ({ uid: f?.uid, short: f?.short, discussable: f?.discussable }));
    case "items":
      return arr(raw.items).map((i) => ({ uid: i?.uid, name: i?.name, stackable: i?.stackable, unique: i?.unique, tags: i?.tags ?? [] }));
    case "quests":
      return arr(raw.objectives).flatMap((l) => arr(l?.quests).map((q) => ({ id: `${l?.uid}/${q?.uid}`, name: q?.name, tasks: arr(q?.tasks).map((t) => t?.uid) })));
    case "events":
      return arr(raw.events).map((e) => ({ name: e?.name, probability: e?.probability, highPriority: e?.highPriority, targets: e?.targets ?? [], link: e?.link ? `${e.link.dialog}/${e.link.window}` : null }));
    case "pac":
      return arr(raw.pacWidgets).map((p) => ({ id: p?.id, background: p?.background, zones: arr(p?.zones).map((z) => z?.id) }));
    case "hooks":
      return arr(raw.hooks).map((h) => ({ name: h?.name, hook: h?.hook, body: short(h?.body ?? "") }));
    case "functions":
      return arr(raw.functions).map((f) => ({ name: f?.name, args: f?.args, description: f?.description }));
    case "roles":
      return arr(raw.roles).map((r) => ({ name: r?.name, props: arr(r?.props).map((p) => p?.name) }));
    case "meters":
      return arr(raw.uiElements?.meters).map((m) => ({ uid: m?.uid, name: m?.name, value: short(m?.value ?? ""), progressBar: Boolean(m?.progressBar) }));
    case "situations":
      return arr(raw.situations);
    default:
      throw new UsageError(`ls: unknown collection "${what}" (one of: ${LS_KINDS.join(", ")})`);
  }
}

export async function cmdLs(args: string[]): Promise<void> {
  const pa = parseFor(args, { bools: ["text"] });
  if (pa.pos.length < 1) throw new UsageError(`usage: dialogic ls GAME [${LS_KINDS.join("|")}] [DIALOG]`);
  const src = await openGame(pa.pos[0]);
  const what = pa.pos[1];
  if (!what) {
    const raw = src.raw as J;
    printJSON({
      game: src.label,
      name: raw.general?.name,
      engineVersion: raw.engineVersion,
      startupDialog: raw.startupDialog,
      counts: {
        dialogs: arr(raw.dialogs).length,
        windows: arr(raw.dialogs).reduce((n: number, d: J) => n + arr(d?.windows).length, 0),
        chars: arr(raw.chars).length,
        locs: arr(raw.locs).length,
        props: arr(raw.props).length,
        facts: arr(raw.facts).length,
        items: arr(raw.items).length,
        quests: arr(raw.objectives).reduce((n: number, l: J) => n + arr(l?.quests).length, 0),
        events: arr(raw.events).length,
        pac: arr(raw.pacWidgets).length,
        hooks: arr(raw.hooks).length,
        functions: arr(raw.functions).length,
        meters: arr(raw.uiElements?.meters).length,
      },
    });
    return;
  }
  if (what === "images") {
    printJSON((await src.images()) ?? []);
    return;
  }
  const rows = listing(src.raw, what, pa.pos[2]);
  if (flagOn(pa, "text")) {
    for (const r of rows) process.stdout.write((typeof r === "object" ? Object.values(r as object).map((v) => (typeof v === "object" ? JSON.stringify(v) : String(v))).join("\t") : String(r)) + "\n");
  } else {
    printJSON(rows);
  }
}

// ── refs / show ──

const refRow = (r: Ref) => ({ kind: r.kind, target: r.target, via: r.via, where: r.where, pointer: r.pointer });

function resolveOne(refs: Ref[], spec: string): { kind: RefKind; id: string } {
  const found = parseRef(refs, spec);
  if (found.length === 0) throw new Error(`nothing named "${spec}" (use KIND:ID, KIND one of ${REF_KINDS.join(", ")}; windows are DIALOG/WINDOW)`);
  if (found.length > 1) throw new Error(`"${spec}" is ambiguous: ${found.map((f) => `${f.kind}:${f.id}`).join(", ")}`);
  return found[0];
}

export async function cmdRefs(args: string[]): Promise<void> {
  const pa = parseFor(args, {});
  if (pa.pos.length !== 2) throw new UsageError("usage: dialogic refs GAME [KIND:]ID");
  const src = await openGame(pa.pos[0]);
  const refs = buildIndex(src.raw);
  const { kind, id } = resolveOne(refs, pa.pos[1]);
  printJSON({ kind, id, references: refs.filter((r) => r.kind === kind && r.target === id && !r.definition).map(refRow) });
}

export async function cmdShow(args: string[]): Promise<void> {
  const pa = parseFor(args, {});
  if (pa.pos.length !== 2) throw new UsageError("usage: dialogic show GAME [KIND:]ID   (e.g. main/start, char:bob, loc:market, quest:main/first)");
  const src = await openGame(pa.pos[0]);
  const refs = buildIndex(src.raw);
  const { kind, id } = resolveOne(refs, pa.pos[1]);
  const def = findDefinition(refs, kind, id);
  if (!def) throw new Error(`${kind}:${id} is referenced but not defined`);
  // the object holding the definition field (situations/eventHosts are plain strings)
  const ownerPtr = def.pointer.slice(0, def.pointer.lastIndexOf("/"));
  const owner = /^\/(situations|eventHosts)$/.test(ownerPtr) ? id : resolvePointer(src.raw, ownerPtr);
  const inside = (r: Ref) => typeof owner === "object" && r.pointer.startsWith(ownerPtr + "/") && !r.definition;
  printJSON({
    kind,
    id,
    pointer: typeof owner === "object" ? ownerPtr : def.pointer,
    definition: owner,
    uses: refs.filter(inside).map(refRow),
    usedBy: refs.filter((r) => r.kind === kind && r.target === id && !r.definition && !inside(r)).map(refRow),
  });
}

// ── graph ──

interface Edge { from: string; to: string; label: string }

export function linkGraph(raw: J, onlyDialog?: string): Edge[] {
  const edges: Edge[] = [];
  const refs = buildIndex(raw);
  for (const r of refs) {
    if (r.definition || r.from === "(root)" || r.from === "(script)") continue;
    if (!["window", "loc", "char", "pac"].includes(r.kind)) continue;
    if (r.via === "event host" || r.via === "reaction trigger" || r.via === "actor" || r.via === "stage person") continue;
    const to = r.kind === "window" ? r.target : `${r.kind}:${r.target}`;
    edges.push({ from: r.from, to, label: r.via });
  }
  // a qualified direction yields a dialog ref and a window ref; keep only window refs (dialog refs were skipped above)
  const filtered = onlyDialog
    ? edges.filter((e) => e.from.startsWith(`${onlyDialog}/`) || e.to.startsWith(`${onlyDialog}/`))
    : edges;
  const seen = new Set<string>();
  return filtered.filter((e) => {
    const k = `${e.from}|${e.to}|${e.label}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export async function cmdGraph(args: string[]): Promise<void> {
  const pa = parseFor(args, { values: ["dialog", "format"] });
  if (pa.pos.length !== 1) throw new UsageError("usage: dialogic graph GAME [-dialog NAME] [-format mermaid|dot|json]");
  const src = await openGame(pa.pos[0]);
  const edges = linkGraph(src.raw, pa.flags.dialog);
  const format = pa.flags.format ?? "mermaid";
  const ids = new Map<string, string>();
  const nid = (s: string) => {
    if (!ids.has(s)) ids.set(s, `n${ids.size}`);
    return ids.get(s)!;
  };
  if (format === "json") {
    printJSON(edges);
  } else if (format === "dot") {
    const lines = ["digraph game {", "  rankdir=LR;"];
    for (const e of edges) lines.push(`  ${JSON.stringify(e.from)} -> ${JSON.stringify(e.to)} [label=${JSON.stringify(e.label)}];`);
    lines.push("}");
    process.stdout.write(lines.join("\n") + "\n");
  } else if (format === "mermaid") {
    const lines = ["flowchart LR"];
    for (const e of edges) lines.push(`  ${nid(e.from)}[${JSON.stringify(e.from)}] -->|${e.label}| ${nid(e.to)}[${JSON.stringify(e.to)}]`);
    process.stdout.write(lines.join("\n") + "\n");
  } else {
    throw new UsageError("-format must be mermaid, dot or json");
  }
}

// ── schema ──

function typeOf(s: J): string {
  if (!s) return "any";
  if (s.$ref) return String(s.$ref).replace("#/definitions/", "");
  if (s.const !== undefined) return JSON.stringify(s.const);
  if (s.enum) return s.enum.map((v: unknown) => JSON.stringify(v)).join(" | ");
  if (s.anyOf) return s.anyOf.map(typeOf).join(" | ");
  if (s.type === "array") return `${typeOf(s.items)}[]`;
  if (s.type === "object" && s.additionalProperties && typeof s.additionalProperties === "object") return `{ [key]: ${typeOf(s.additionalProperties)} }`;
  if (Array.isArray(s.type)) return s.type.join(" | ");
  return s.type ?? "object";
}

export function schemaOf(type?: string): unknown {
  if (!type) return Object.keys(schemaDefs).sort();
  const def = schemaDefs[type] ?? Object.entries(schemaDefs).find(([k]) => k.toLowerCase() === type.toLowerCase())?.[1];
  if (!def) {
    const close = Object.keys(schemaDefs).filter((k) => k.toLowerCase().includes(type.toLowerCase()));
    throw new Error(`no type "${type}"${close.length ? ` — did you mean ${close.join(", ")}?` : ""} (run \`dialogic schema\` for the list)`);
  }
  if (!def.properties) return { type, is: typeOf(def), description: def.description };
  const required = new Set(def.required ?? []);
  return {
    type,
    description: def.description,
    fields: Object.entries(def.properties as Record<string, J>).map(([name, p]) => ({
      name,
      type: typeOf(p),
      required: required.has(name),
      ...(p.description ? { description: p.description } : {}),
    })),
  };
}

export async function cmdSchema(args: string[]): Promise<void> {
  const pa = parseFor(args, {});
  printJSON(schemaOf(pa.pos[0]));
}

// ── patch / rename (write back, verified) ──

async function writeChecked(src: GameSource, next: J, dry: boolean, force: boolean): Promise<number> {
  const before = await verifySource(src, { noImages: true });
  const after = await verifySource({ ...src, raw: next }, { noImages: true });
  const key = (f: Finding) => `${f.source}|${f.where}|${f.message}`;
  const old = new Set(before.findings.map(key));
  const introduced = after.findings.filter((f) => !old.has(key(f)));
  const newErrors = introduced.filter((f) => f.severity === "error");
  printJSON({ game: src.label, dryRun: dry, newErrors: newErrors.length, newFindings: introduced });
  if (newErrors.length && !force) {
    note("not saved: the change introduces errors (-force to save anyway)");
    return 1;
  }
  if (dry) {
    note("dry run: nothing saved");
    return 0;
  }
  await src.save(next);
  note(`saved ${src.label}`);
  return 0;
}

export async function cmdPatch(args: string[]): Promise<number> {
  const pa = parseFor(args, { bools: ["dry_run", "force"] });
  if (pa.pos.length !== 2) throw new UsageError("usage: dialogic patch GAME OPS.json|@file|- [-dry-run] [-force]   (RFC 6902 on the whole game)");
  const src = await openGame(pa.pos[0]);
  const spec = pa.pos[1];
  const opsText = spec === "-" || spec.startsWith("@") ? readText(spec) : spec.trim().startsWith("[") ? spec : readText(`@${spec}`);
  const ops = JSON.parse(opsText);
  if (!Array.isArray(ops)) throw new Error("patch must be a JSON array of RFC 6902 operations");
  const next = structuredClone(src.raw);
  const errors = jsonpatch.validate(ops, next);
  if (errors) throw new Error(`invalid patch: ${errors.message} (operation ${errors.index})`);
  jsonpatch.applyPatch(next, ops, true, true);
  return writeChecked(src, next, flagOn(pa, "dry_run"), flagOn(pa, "force"));
}

/** Rename an entity and every reference to it in a copy of `raw`; returns the copy and the touched pointers. */
export function renameIn(raw: J, kind: RefKind, oldId: string, newId: string): { next: J; changed: string[] } {
  const next = structuredClone(raw);
  const refs = buildIndex(next);
  if (!findDefinition(refs, kind, oldId)) throw new Error(`no ${kind} "${oldId}"`);
  const fullNew = kind === "window" || kind === "quest" || kind === "task" ? [...oldId.split("/").slice(0, -1), newId.split("/").pop()].join("/") : newId;
  if (findDefinition(refs, kind, fullNew)) throw new Error(`${kind} "${fullNew}" already exists`);
  const leaf = fullNew.split("/").pop() ?? fullNew;
  if (["prop", "fact", "questline", "quest", "task"].includes(kind) && !/^[A-Za-z_$][\w$]*$/.test(leaf)) {
    throw new Error(`"${leaf}" is not a JS identifier; ${kind} ids are used in scripts (rt.${kind === "prop" ? "props" : kind === "fact" ? "facts" : "objectives"}.…)`);
  }
  const changed: string[] = [];
  // windows of a renamed dialog keep their uid; their dialog part lives in "dialog" refs
  for (const r of refs) {
    const hit = r.kind === kind && r.target === oldId;
    // renaming a quest/questline also renames the prefix of deeper ids that only appear as path parts
    if (hit) {
      r.set(fullNew);
      changed.push(r.pointer);
    }
  }
  return { next, changed: [...new Set(changed)] };
}

export async function cmdRename(args: string[]): Promise<number> {
  const pa = parseFor(args, { bools: ["dry_run", "force"] });
  if (pa.pos.length !== 4) {
    throw new UsageError(`usage: dialogic rename GAME KIND OLD NEW [-dry-run] [-force]\n  KIND: ${REF_KINDS.join(", ")}; windows OLD = DIALOG/WINDOW, quests LINE/QUEST, tasks LINE/QUEST/TASK`);
  }
  const [game, kindArg, oldId, newId] = pa.pos;
  const kind = (kindArg === "location" ? "loc" : kindArg === "character" ? "char" : kindArg) as RefKind;
  if (!REF_KINDS.includes(kind)) throw new UsageError(`unknown KIND "${kindArg}" (one of ${REF_KINDS.join(", ")})`);
  const src = await openGame(game);
  const { next, changed } = renameIn(src.raw, kind, oldId, newId);
  note(`${changed.length} field(s) changed`);
  for (const p of changed) note(`  ${p}`);
  return writeChecked(src, next, flagOn(pa, "dry_run"), flagOn(pa, "force"));
}
