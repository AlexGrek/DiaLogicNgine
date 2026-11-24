/**
 * Reference index over a raw game.json: every place one entity names another,
 * with a JSON Pointer and a setter, so `refs`, `show`, `graph` and `rename` all
 * agree on what "a reference" is. Built from the same field knowledge as
 * dialogic/src/game/verify.ts and sanityCheck.ts.
 */
import { collectScriptLeaves } from "../../dialogic/src/game/verify";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type J = any;

export type RefKind =
  | "dialog" | "window" | "char" | "loc" | "item" | "fact" | "prop" | "role"
  | "pac" | "situation" | "eventhost" | "questline" | "quest" | "task";

export const REF_KINDS: RefKind[] = ["dialog", "window", "char", "loc", "item", "fact", "prop", "role", "pac", "situation", "eventhost", "questline", "quest", "task"];

export interface Ref {
  kind: RefKind;
  /** The referenced id. Windows: "dialog/window"; quests: "line/quest"; tasks: "line/quest/task". */
  target: string;
  /** Human-readable location. */
  where: string;
  /** JSON Pointer of the field holding the reference. */
  pointer: string;
  /** What kind of field: "local link", "actor", "script", … */
  via: string;
  /** Who refers: "dialog/window", "loc:x", "char:x", "pac:x", "event:x", "(root)", … */
  from: string;
  /** Replace the referenced id (only the part this reference names). */
  set(newId: string): void;
  /** True for the entity's own definition (its uid/name field). */
  definition?: boolean;
}

const esc = (s: string) => String(s).replace(/~/g, "~0").replace(/\//g, "~1");
const arr = (v: unknown): J[] => (Array.isArray(v) ? v : []);
const isObj = (v: unknown): v is Record<string, J> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Last segment of a composite id ("a/b/c" → "c"). */
const lastPart = (id: string) => id.split("/").pop() ?? id;

export function buildIndex(game: J): Ref[] {
  const refs: Ref[] = [];

  const field = (kind: RefKind, target: string, obj: J, key: string | number, pointer: string, where: string, via: string, from: string, definition = false) => {
    if (target === undefined || target === null || target === "") return;
    refs.push({ kind, target: String(target), where, pointer, via, from, definition, set: (id) => { obj[key] = lastPart(id) } });
  };

  /** {dialog, window} object (qualified directions, startupDialog, events, reactions). */
  const qualified = (qd: J, pointer: string, where: string, via: string, from: string) => {
    if (!isObj(qd)) return;
    if (qd.dialog) field("dialog", qd.dialog, qd, "dialog", `${pointer}/dialog`, where, via, from);
    if (qd.dialog && qd.window) field("window", `${qd.dialog}/${qd.window}`, qd, "window", `${pointer}/window`, where, via, from);
  };

  const direction = (dir: J, pointer: string, where: string, dialogName: string | null, from: string) => {
    if (!isObj(dir)) return;
    const t = dir.type;
    if (t === "local" && dir.direction && dialogName !== null) {
      field("window", `${dialogName}/${dir.direction}`, dir, "direction", `${pointer}/direction`, where, "local link", from);
    } else if (t === "push" || t === "jump" || t === "resetjump") {
      qualified(dir.qualifiedDirection, `${pointer}/qualifiedDirection`, where, `${t} link`, from);
    } else if (t === "tolocation" && dir.direction) {
      field("loc", dir.direction, dir, "direction", `${pointer}/direction`, where, "location link", from);
    } else if (t === "toperson" && dir.direction) {
      field("char", dir.direction, dir, "direction", `${pointer}/direction`, where, "talk link", from);
    }
  };

  const link = (l: J, pointer: string, where: string, dialogName: string | null, from: string) => {
    if (!isObj(l)) return;
    direction(l.mainDirection, `${pointer}/mainDirection`, where, dialogName, from);
    arr(l.alternativeDirections).forEach((alt, i) => direction(alt, `${pointer}/alternativeDirections/${i}`, `${where} → alternative ${i + 1}`, dialogName, from));
    if (l.changeLocationInBg) field("loc", l.changeLocationInBg, l, "changeLocationInBg", `${pointer}/changeLocationInBg`, where, "changeLocationInBg", from);
  };

  const hostList = (hosts: J, pointer: string, where: string, from: string) => {
    arr(hosts).forEach((h, i) => field("eventhost", h, hosts, i, `${pointer}/${i}`, where, "event host", from));
  };

  // ── dialogs ──
  arr(game.dialogs).forEach((d, di) => {
    const dp = `/dialogs/${di}`;
    field("dialog", d?.name, d, "name", `${dp}/name`, `dialog "${d?.name}"`, "definition", "(root)", true);
    arr(d?.windows).forEach((w, wi) => {
      const wp = `${dp}/windows/${wi}`;
      const where = `dialog "${d?.name}" → window "${w?.uid}"`;
      const from = `${d?.name}/${w?.uid}`;
      field("window", `${d?.name}/${w?.uid}`, w, "uid", `${wp}/uid`, where, "definition", "(root)", true);
      arr(w?.links).forEach((l, li) => link(l, `${wp}/links/${li}`, `${where} → link ${li + 1}`, d?.name, from));
      if (isObj(w?.actor) && w.actor.character && !w.actor.currentCharacter) {
        field("char", w.actor.character, w.actor, "character", `${wp}/actor/character`, where, "actor", from);
      }
      arr(w?.stage).forEach((s, si) => {
        if (isObj(s) && s.character && !s.currentCharacter) field("char", s.character, s, "character", `${wp}/stage/${si}/character`, where, "stage person", from);
      });
      if (w?.changeLocationInBg) field("loc", w.changeLocationInBg, w, "changeLocationInBg", `${wp}/changeLocationInBg`, where, "changeLocationInBg", from);
      if (w?.changeSituation) field("situation", w.changeSituation, w, "changeSituation", `${wp}/changeSituation`, where, "changeSituation", from);
      if (typeof w?.specialWidget === "string" && w.specialWidget.startsWith("pac::")) {
        const id = w.specialWidget.slice(5);
        refs.push({ kind: "pac", target: id, where, pointer: `${wp}/specialWidget`, via: "special widget", from, set: (n) => { w.specialWidget = `pac::${n}` } });
      }
    });
  });

  // ── startup ──
  qualified(game.startupDialog, "/startupDialog", "startupDialog", "startup", "(root)");

  // ── locations ──
  arr(game.locs).forEach((l, i) => {
    const p = `/locs/${i}`;
    const where = `location "${l?.uid}"`;
    const from = `loc:${l?.uid}`;
    field("loc", l?.uid, l, "uid", `${p}/uid`, where, "definition", "(root)", true);
    arr(l?.links).forEach((lk, li) => link(lk, `${p}/links/${li}`, `${where} → link ${li + 1}`, null, from));
    arr(l?.routes).forEach((r, ri) => field("loc", r, l.routes, ri, `${p}/routes/${ri}`, where, "route", from));
    arr(l?.goto).forEach((g, gi) => field("loc", g, l.goto, gi, `${p}/goto/${gi}`, where, "goto", from));
    hostList(l?.eventHosts, `${p}/eventHosts`, where, from);
  });

  // ── characters ──
  arr(game.chars).forEach((c, i) => {
    const p = `/chars/${i}`;
    const where = `character "${c?.uid}"`;
    const from = `char:${c?.uid}`;
    field("char", c?.uid, c, "uid", `${p}/uid`, where, "definition", "(root)", true);
    arr(c?.roles).forEach((r, ri) => field("role", r, c.roles, ri, `${p}/roles/${ri}`, where, "role", from));
    const dlg = c?.dialog;
    if (!isObj(dlg)) return;
    arr(dlg.links).forEach((lk, li) => link(lk, `${p}/dialog/links/${li}`, `${where} → dialog link ${li + 1}`, null, from));
    hostList(dlg.eventHosts, `${p}/dialog/eventHosts`, where, from);
    arr(dlg.behavior?.reactions).forEach((rx, ri) => {
      const rp = `${p}/dialog/behavior/reactions/${ri}`;
      const rwhere = `${where} → reaction ${ri + 1}`;
      const tr = rx?.trigger;
      if (isObj(tr)) {
        const kinds: [string, RefKind][] = [["facts", "fact"], ["chars", "char"], ["items", "item"], ["places", "loc"]];
        for (const [k, kind] of kinds) arr(tr[k]).forEach((u, ui) => field(kind, u, tr[k], ui, `${rp}/trigger/${k}/${ui}`, rwhere, "reaction trigger", from));
      }
      qualified(rx?.dialogWindow, `${rp}/dialogWindow`, rwhere, "reaction window", from);
    });
  });

  // ── roles, props, facts, items, situations, event hosts ──
  arr(game.roles).forEach((r, i) => field("role", r?.name, r, "name", `/roles/${i}/name`, `role "${r?.name}"`, "definition", "(root)", true));
  arr(game.props).forEach((pr, i) => {
    field("prop", pr?.name, pr, "name", `/props/${i}/name`, `prop "${pr?.name}"`, "definition", "(root)", true);
    if (pr?.datatype === "location" && pr.defaultValue) field("loc", pr.defaultValue, pr, "defaultValue", `/props/${i}/defaultValue`, `prop "${pr.name}"`, "default value", "(root)");
  });
  arr(game.facts).forEach((f, i) => field("fact", f?.uid, f, "uid", `/facts/${i}/uid`, `fact "${f?.uid}"`, "definition", "(root)", true));
  arr(game.items).forEach((it, i) => field("item", it?.uid, it, "uid", `/items/${i}/uid`, `item "${it?.uid}"`, "definition", "(root)", true));
  arr(game.situations).forEach((s, i) => field("situation", s, game.situations, i, `/situations/${i}`, "situations", "definition", "(root)", true));
  arr(game.eventHosts).forEach((h, i) => field("eventhost", h, game.eventHosts, i, `/eventHosts/${i}`, "eventHosts", "definition", "(root)", true));

  // ── events ──
  arr(game.events).forEach((e, i) => {
    const p = `/events/${i}`;
    const where = `event "${e?.name}"`;
    const from = `event:${e?.name}`;
    qualified(e?.link, `${p}/link`, where, "event link", from);
    arr(e?.targets).forEach((t, ti) => {
      const s = String(t);
      const implicit = /^(loc|char):(.+)$/.exec(s);
      if (implicit) {
        const kind: RefKind = implicit[1] === "loc" ? "loc" : "char";
        refs.push({ kind, target: implicit[2], where, pointer: `${p}/targets/${ti}`, via: "event target", from, set: (n) => { e.targets[ti] = `${implicit[1]}:${n}` } });
      } else {
        field("eventhost", s, e.targets, ti, `${p}/targets/${ti}`, where, "event target", from);
      }
    });
  });

  // ── point-and-click ──
  arr(game.pacWidgets).forEach((pac, i) => {
    const p = `/pacWidgets/${i}`;
    const from = `pac:${pac?.id}`;
    field("pac", pac?.id, pac, "id", `${p}/id`, `point-and-click "${pac?.id}"`, "definition", "(root)", true);
    hostList(pac?.eventHosts, `${p}/eventHosts`, `point-and-click "${pac?.id}"`, from);
    arr(pac?.zones).forEach((z, zi) => {
      const where = `point-and-click "${pac?.id}" → zone "${z?.name || z?.id}"`;
      direction(z?.mainDirection, `${p}/zones/${zi}/mainDirection`, where, null, from);
      arr(z?.alternativeDirections).forEach((alt, ai) => direction(alt, `${p}/zones/${zi}/alternativeDirections/${ai}`, where, null, from));
    });
  });

  // ── objectives ──
  arr(game.objectives).forEach((line, li) => {
    const lp = `/objectives/${li}`;
    field("questline", line?.uid, line, "uid", `${lp}/uid`, `questline "${line?.uid}"`, "definition", "(root)", true);
    arr(line?.quests).forEach((q, qi) => {
      const qp = `${lp}/quests/${qi}`;
      const qid = `${line?.uid}/${q?.uid}`;
      field("quest", qid, q, "uid", `${qp}/uid`, `quest "${qid}"`, "definition", "(root)", true);
      if (Array.isArray(q?.path)) {
        field("questline", q.path[0], q.path, 0, `${qp}/path/0`, `quest "${qid}"`, "quest path", "(root)");
        if (q.path.length > 1) field("quest", `${q.path[0]}/${q.path[1]}`, q.path, 1, `${qp}/path/1`, `quest "${qid}"`, "quest path", "(root)");
      }
      arr(q?.tasks).forEach((t, ti) => {
        const tp = `${qp}/tasks/${ti}`;
        const tid = `${qid}/${t?.uid}`;
        field("task", tid, t, "uid", `${tp}/uid`, `task "${tid}"`, "definition", "(root)", true);
        if (Array.isArray(t?.path)) {
          field("questline", t.path[0], t.path, 0, `${tp}/path/0`, `task "${tid}"`, "task path", "(root)");
          if (t.path.length > 1) field("quest", `${t.path[0]}/${t.path[1]}`, t.path, 1, `${tp}/path/1`, `task "${tid}"`, "task path", "(root)");
          if (t.path.length > 2) field("task", `${t.path[0]}/${t.path[1]}/${t.path[2]}`, t.path, 2, `${tp}/path/2`, `task "${tid}"`, "task path", "(root)");
        }
      });
    });
  });

  // ── hooks ──
  const hookKinds: [string, RefKind, number][] = [
    ["FACTS::DISCOVERED::", "fact", 1], ["ITEMS::ACQUIRED::", "item", 1], ["ITEMS::LOST::", "item", 1],
    ["SITUATION::STARTED::", "situation", 1], ["SITUATION::ENDED::", "situation", 1],
    ["QUESTLINE::OPENED::", "questline", 1], ["QUESTLINE::CLOSED::", "questline", 1],
    ["QUEST::OPENED::", "quest", 2], ["QUEST::COMPLETED::", "quest", 2], ["QUEST::FAILED::", "quest", 2],
    ["TASK::OPENED::", "task", 3], ["TASK::COMPLETED::", "task", 3], ["TASK::FAILED::", "task", 3],
  ];
  hookKinds.sort((a, b) => b[0].length - a[0].length);
  arr(game.hooks).forEach((h, i) => {
    const s = String(h?.hook ?? "");
    const spec = hookKinds.find(([prefix]) => s.startsWith(prefix));
    if (!spec) return;
    const [prefix, kind, arity] = spec;
    const parts = s.slice(prefix.length).split("::");
    if (parts.length !== arity) return;
    const where = `hook "${h?.name || s}"`;
    // A quest hook also names its questline, a task hook its quest and questline.
    const levels: RefKind[] = kind === "task" ? ["questline", "quest", "task"] : kind === "quest" ? ["questline", "quest"] : [kind];
    levels.forEach((lvl, depth) => {
      refs.push({
        kind: lvl, target: parts.slice(0, depth + 1).join("/"), where, pointer: `/hooks/${i}/hook`, via: "hook", from: "(root)",
        set: (n) => {
          const cur = String(h.hook).slice(prefix.length).split("::");
          cur[depth] = lastPart(n);
          h.hook = prefix + cur.join("::");
        },
      });
    });
  });

  // ── scripts (by identifier) ──
  for (const leaf of collectScriptLeaves(game)) {
    const parentPtr = leaf.pointer.slice(0, leaf.pointer.lastIndexOf("/"));
    const key = leaf.pointer.slice(leaf.pointer.lastIndexOf("/") + 1).replace(/~1/g, "/").replace(/~0/g, "~");
    const holder = resolvePointer(game, parentPtr);
    const scriptRef = (kind: RefKind, target: string, pattern: (id: string) => RegExp, replacement: (id: string) => string) => {
      refs.push({
        kind, target, where: leaf.path, pointer: leaf.pointer, via: "script", from: "(script)",
        set: (n) => { holder[key] = String(holder[key]).replace(pattern(lastPart(target)), replacement(lastPart(n))) },
      });
    };
    const src = leaf.source;
    const idRe = (prefix: string) => (id: string) => new RegExp(`\\b${prefix.replace(/\./g, "\\.")}${escapeRe(id)}\\b`, "g");
    for (const m of new Set([...src.matchAll(/\brt\.props\.([A-Za-z_$][\w$]*)/g)].map((x) => x[1]))) {
      scriptRef("prop", m, idRe("rt.props."), (n) => `rt.props.${n}`);
    }
    for (const m of new Set([...src.matchAll(/\brt\.facts\.([A-Za-z_$][\w$]*)/g)].map((x) => x[1]))) {
      scriptRef("fact", m, idRe("rt.facts."), (n) => `rt.facts.${n}`);
    }
    for (const m of new Set([...src.matchAll(/\brt\.ch\.([A-Za-z_$][\w$]*)/g)].map((x) => x[1]))) {
      scriptRef("char", m, idRe("rt.ch."), (n) => `rt.ch.${n}`);
    }
    for (const m of new Set([...src.matchAll(/\brt\.items\.(?:add|remove|has|count)\(\s*['"]([^'"]+)['"]/g)].map((x) => x[1]))) {
      scriptRef("item", m, (id) => new RegExp(`(\\brt\\.items\\.(?:add|remove|has|count)\\(\\s*['"])${escapeRe(id)}(['"])`, "g"), (n) => `$1${n}$2`);
    }
    for (const m of new Set([...src.matchAll(/\bstate\.situation\s*(?:===?|!==?|=)\s*['"]([^'"]+)['"]/g)].map((x) => x[1]))) {
      scriptRef("situation", m, (id) => new RegExp(`(\\bstate\\.situation\\s*(?:===?|!==?|=)\\s*['"])${escapeRe(id)}(['"])`, "g"), (n) => `$1${n}$2`);
    }
    for (const m of src.matchAll(/\brt\.objectives\.([A-Za-z_$][\w$]*)(?:\.([A-Za-z_$][\w$]*))?(?:\.([A-Za-z_$][\w$]*))?/g)) {
      const parts = [m[1], m[2], m[3]].filter(Boolean);
      const methods = new Set(["open", "close", "complete", "fail", "status", "isCompleted", "isFailed", "isOpen"]);
      while (parts.length && methods.has(parts[parts.length - 1])) parts.pop();
      const levels: RefKind[] = ["questline", "quest", "task"];
      parts.forEach((_, depth) => {
        const target = parts.slice(0, depth + 1).join("/");
        if (refs.some((r) => r.pointer === leaf.pointer && r.kind === levels[depth] && r.target === target)) return;
        const prefixPath = parts.slice(0, depth).map((p) => `${escapeRe(p)}\\.`).join("");
        scriptRef(levels[depth], target,
          (id) => new RegExp(`(\\brt\\.objectives\\.${prefixPath})${escapeRe(id)}\\b`, "g"),
          (n) => `$1${n}`);
      });
    }
  }

  return refs;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function resolvePointer(doc: J, pointer: string): J {
  if (pointer === "" || pointer === "/") return doc;
  let cur = doc;
  for (const raw of pointer.replace(/^\//, "").split("/")) {
    const tok = raw.replace(/~1/g, "/").replace(/~0/g, "~");
    if (cur === undefined || cur === null) return undefined;
    cur = Array.isArray(cur) ? cur[Number(tok)] : cur[tok];
  }
  return cur;
}

/** Make a pointer from tokens. */
export function pointerOf(...tokens: (string | number)[]): string {
  return tokens.map((t) => `/${esc(String(t))}`).join("");
}

/** Where the definition of `kind:id` lives, or undefined. */
export function findDefinition(refs: Ref[], kind: RefKind, id: string): Ref | undefined {
  return refs.find((r) => r.definition && r.kind === kind && r.target === id);
}

/**
 * Parse a user reference: "dialog/window", "dialog:main", "char:bob", "loc:x",
 * "item:x", "quest:line/quest", … A bare id is looked up in every kind.
 */
export function parseRef(refs: Ref[], text: string): { kind: RefKind; id: string }[] {
  const m = /^([a-z]+):(.+)$/.exec(text);
  if (m && (REF_KINDS as string[]).includes(m[1])) return [{ kind: m[1] as RefKind, id: m[2] }];
  if (m && m[1] === "location") return [{ kind: "loc", id: m[2] }];
  if (m && m[1] === "character") return [{ kind: "char", id: m[2] }];
  const found = new Map<string, { kind: RefKind; id: string }>();
  for (const r of refs) {
    if (r.definition && r.target === text) found.set(`${r.kind}:${r.target}`, { kind: r.kind, id: r.target });
  }
  return [...found.values()];
}
