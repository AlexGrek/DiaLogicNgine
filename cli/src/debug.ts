/**
 * Local debug player: the real engine (the Player MCP's GameSessionRunner) in a
 * sandbox, driven from a REPL, a move script (`run`) or a random walker (`explore`).
 * No server needed for local game files.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import jsonpatch from "fast-json-patch";
import type { State, UiObjectId } from "../../dialogic/src/exec/GameState";
import type { ActPayload, InspectSection, TurnPayload, TurnResult } from "../../player-runner/src/protocol";
import { flagOn, parseFor, readText, UsageError } from "./args";
import { Session, createEngine } from "./engine/engine";
import { note, printJSON } from "./out";
import { resolvePointer } from "./refs";
import { GameSource, openGame } from "./source";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type J = any;

// ── positions ──

/** "dialog/window", "loc:uid", "char:uid", or a JSON UiObjectId. */
export function parsePosition(text: string): UiObjectId {
  const t = text.trim();
  if (t.startsWith("{")) return JSON.parse(t) as UiObjectId;
  let m = /^(?:loc|location):(.+)$/.exec(t);
  if (m) return { kind: "location", location: m[1] };
  m = /^(?:char|chardialog):(.+)$/.exec(t);
  if (m) return { kind: "chardialog", char: m[1] };
  m = /^([^/]+)\/(.+)$/.exec(t);
  if (m) return { kind: "window", dialog: m[1], window: m[2] };
  throw new UsageError(`bad position "${text}" (use DIALOG/WINDOW, loc:UID, char:UID or JSON)`);
}

export function positionText(p: UiObjectId | undefined): string {
  if (!p) return "?";
  if (p.kind === "window") return `${p.dialog}/${p.window}`;
  if (p.kind === "location") return `loc:${p.location}`;
  if (p.kind === "chardialog") return `char:${p.char}`;
  return JSON.stringify(p);
}

// ── rendering a turn for people ──

export function turnText(turn: TurnPayload, state: State): string {
  const out: string[] = [];
  const pos = positionText(state.position);
  out.push(`── step ${turn.step} · ${pos}${turn.situation ? ` · situation ${turn.situation}` : ""} ──`);
  if (turn.scene.error) out.push(`!! ERROR: ${turn.scene.error}`);
  if (state.fatalError) out.push(`!! fatalError: ${state.fatalError.message}`);
  if (turn.scene.location) out.push(`[location ${turn.scene.location.name}]`);
  if (turn.scene.pac) out.push(`[point-and-click ${turn.scene.pac.id}]`);
  const speaker = turn.scene.speaker ? `${turn.scene.speaker.name}: ` : "";
  if (turn.scene.text) out.push(speaker + turn.scene.text);
  if (turn.scene.page_count > 1) out.push(`(page ${turn.scene.page_index + 1}/${turn.scene.page_count})`);
  const a = turn.actions;
  if (a.can_continue) out.push(`  c   continue (${a.continue_mode === "next_page" ? "next page" : "auto link"})`);
  for (const l of a.links) out.push(`  ${String(l.index).padEnd(3)} ${l.text || "(continue)"}${l.disabled ? `  [disabled${l.disabled_reason ? `: ${l.disabled_reason}` : ""}]` : ""}${l.visited ? "  (visited)" : ""}`);
  for (const r of a.routes) out.push(`  go ${r.uid}${r.disabled ? "  [disabled]" : ""}   (${r.name})`);
  for (const z of a.zones) out.push(`  zone ${z.id}${z.disabled ? "  [disabled]" : ""}   (${z.name})`);
  const t = a.discuss_topics;
  if (t) {
    const all = [...t.people.map((x) => `char ${x.uid}`), ...t.facts.map((x) => `fact ${x.uid}`), ...t.items.map((x) => `item ${x.uid}`), ...t.places.map((x) => `loc ${x.uid}`)];
    if (all.length) out.push(`  discuss: ${all.join(", ")}`);
  }
  if (a.usable_items.length) out.push(`  use: ${a.usable_items.map((i) => `${i.uid}×${i.quantity}`).join(", ")}`);
  if (turn.hud.length) out.push(`  HUD: ${turn.hud.map((h) => `${h.name || h.uid}=${h.value}`).join("  ")}`);
  for (const n of turn.new_notifications) out.push(`  * ${(n as J).text ?? JSON.stringify(n)}`);
  if (!a.can_continue && !a.links.length && !a.routes.length && !a.zones.length && !turn.scene.error) out.push("  (no way out: dead end)");
  return out.join("\n");
}

/** What changed between two states, for `trace`. */
export function stateDiff(prev: State, next: State): string[] {
  const out: string[] = [];
  const props = new Set([...Object.keys(prev.props ?? {}), ...Object.keys(next.props ?? {})]);
  for (const k of props) {
    if (JSON.stringify(prev.props?.[k]) !== JSON.stringify(next.props?.[k])) out.push(`props.${k}: ${JSON.stringify(prev.props?.[k])} → ${JSON.stringify(next.props?.[k])}`);
  }
  const listDiff = (name: string, a: unknown[] = [], b: unknown[] = []) => {
    const sa = new Set(a.map((x) => JSON.stringify(x))), sb = new Set(b.map((x) => JSON.stringify(x)));
    for (const x of sb) if (!sa.has(x)) out.push(`+${name} ${x}`);
    for (const x of sa) if (!sb.has(x)) out.push(`-${name} ${x}`);
  };
  listDiff("fact", prev.knownFacts, next.knownFacts);
  listDiff("item", prev.carriedItems, next.carriedItems);
  listDiff("person", prev.knownPeople, next.knownPeople);
  listDiff("place", prev.knownPlaces, next.knownPlaces);
  for (const k of ["openQuests", "completedQuests", "failedQuests", "openTasks", "completedTasks", "failedTasks"] as const) {
    listDiff(k, (prev.progress as J)?.[k], (next.progress as J)?.[k]);
  }
  if (prev.situation !== next.situation) out.push(`situation: ${prev.situation ?? "-"} → ${next.situation ?? "-"}`);
  if (prev.location !== next.location) out.push(`location: ${prev.location ?? "-"} → ${next.location ?? "-"}`);
  if (JSON.stringify(prev.positionStack) !== JSON.stringify(next.positionStack)) out.push(`positionStack: [${(next.positionStack ?? []).map(positionText).join(", ")}]`);
  return out;
}

// ── the debugger ──

export interface DebuggerOptions {
  at?: string;
  stateFile?: string;
  script?: string;
  noEntry?: boolean;
  seed?: number;
  deno?: boolean;
  verbose?: boolean;
  /** Per-move time limit for game scripts (ms, vm engine). */
  timeoutMs?: number;
}

/** One player session plus the debugging tools around it. Every command returns plain data. */
export class Debugger {
  history: TurnResult[] = [];
  current!: TurnResult;
  trace = false;
  watch: string[] = [];

  private constructor(public src: GameSource, public session: Session) {}

  static async open(gameArg: string, opts: DebuggerOptions = {}): Promise<Debugger> {
    const src = await openGame(gameArg);
    const engine = await createEngine({ deno: opts.deno, timeoutMs: opts.timeoutMs, log: opts.verbose ? (l) => note(`[engine] ${l}`) : undefined });
    if (opts.seed !== undefined) engine.seed(opts.seed);
    const dbg = new Debugger(src, new Session(engine));
    await dbg.start(opts);
    return dbg;
  }

  async start(opts: DebuggerOptions = {}): Promise<TurnResult> {
    let r: TurnResult;
    if (opts.stateFile) {
      r = await this.session.resume(this.src.raw, JSON.parse(readFileSync(opts.stateFile, "utf8")) as State);
    } else if (opts.at || opts.script) {
      r = await this.session.debugStart(this.src.raw, opts.at ? parsePosition(opts.at) : null, {
        script: opts.script ?? null,
        run_entry: !opts.noEntry,
      });
    } else {
      r = await this.session.newGame(this.src.raw);
    }
    this.history = [];
    this.current = r;
    return r;
  }

  get state(): State {
    return this.current.state;
  }

  private push(r: TurnResult): TurnResult {
    this.history.push(this.current);
    if (this.history.length > 200) this.history.shift();
    this.current = r;
    return r;
  }

  act(payload: ActPayload): Promise<TurnResult> {
    return this.session.act(payload).then((r) => this.push(r));
  }

  async edit(state: State, options: { position?: UiObjectId | null; script?: string | null; run_entry?: boolean }): Promise<TurnResult> {
    return this.push(await this.session.debugApply(state, { run_entry: false, ...options }));
  }

  async undo(): Promise<TurnResult> {
    const prev = this.history.pop();
    if (!prev) throw new Error("nothing to undo");
    await this.session.resume(this.src.raw, prev.state);
    this.current = prev;
    return prev;
  }

  /** Re-read the game (after editing it) and keep the current state. */
  async reload(): Promise<TurnResult> {
    this.src = await this.src.reload();
    return this.push(await this.session.resume(this.src.raw, this.state));
  }

  /**
   * Run one command line. Returns what to show: a turn, or other data. Throws on
   * errors (an impossible move, a bad pointer, a failing script).
   */
  async exec(line: string): Promise<{ turn?: TurnResult; data?: unknown; diff?: string[]; quit?: boolean }> {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return {};
    const sp = trimmed.indexOf(" ");
    const cmd = (sp < 0 ? trimmed : trimmed.slice(0, sp)).toLowerCase();
    const rest = sp < 0 ? "" : trimmed.slice(sp + 1).trim();
    const prev = this.state;
    const moved = async (p: Promise<TurnResult>) => {
      const turn = await p;
      return { turn, diff: stateDiff(prev, turn.state) };
    };
    const idOrIndex = (s: string) => (/^\d+$/.test(s) ? { index: Number(s) } : { target_id: s });

    if (/^\d+$/.test(cmd)) return moved(this.act({ action: "choose_link", index: Number(cmd) }));
    switch (cmd) {
      case "look":
      case "l":
        return { turn: this.current };
      case "c":
      case "continue":
      case "next":
        return moved(this.act({ action: "continue" }));
      case "link":
      case "choose":
        if (!/^\d+$/.test(rest)) throw new UsageError("usage: link N");
        return moved(this.act({ action: "choose_link", index: Number(rest) }));
      case "go":
      case "travel":
        if (!rest) throw new UsageError("usage: go LOC_UID|N");
        return moved(this.act({ action: "travel", ...idOrIndex(rest) }));
      case "zone":
      case "click":
        if (!rest) throw new UsageError("usage: zone ZONE_ID|N");
        return moved(this.act({ action: "click_zone", ...idOrIndex(rest) }));
      case "discuss":
      case "ask": {
        const [type, id] = rest.split(/\s+/);
        if (!type || !id) throw new UsageError("usage: discuss char|fact|item|loc ID");
        return moved(this.act({ action: "discuss", topic_type: type as ActPayload["topic_type"], target_id: id }));
      }
      case "use":
        if (!rest) throw new UsageError("usage: use ITEM_UID");
        return moved(this.act({ action: "use_item", target_id: rest }));
      case "state":
      case "get": {
        const ptr = rest.startsWith("/") || rest === "" ? rest : `/props/${rest}`;
        const v = resolvePointer(this.state, ptr);
        if (v === undefined) throw new Error(`nothing at ${ptr}`);
        return { data: v };
      }
      case "set": {
        const m = /^(\S+)\s*=?\s*([\s\S]+)$/.exec(rest);
        if (!m) throw new UsageError("usage: set /json/pointer VALUE   (or: set PROP VALUE)");
        const ptr = m[1].startsWith("/") ? m[1] : `/props/${m[1]}`;
        let value: unknown;
        try {
          value = JSON.parse(m[2]);
        } catch {
          value = m[2];
        }
        const next = structuredClone(this.state);
        jsonpatch.applyOperation(next, { op: resolvePointer(next, ptr) === undefined ? "add" : "replace", path: ptr, value } as J, true, true);
        return moved(this.edit(next, {}));
      }
      case "patch": {
        const ops = JSON.parse(readText(rest));
        const next = structuredClone(this.state);
        jsonpatch.applyPatch(next, ops, true, true);
        return moved(this.edit(next, {}));
      }
      case "rt":
      case "eval":
      case "script":
        if (!rest) throw new UsageError("usage: rt <javascript>   e.g. rt rt.items.add('key'); rt.facts.clue.know()");
        return moved(this.edit(this.state, { script: readText(rest) }));
      case "goto":
      case "teleport": {
        const noEntry = /\s-no-entry$/.test(rest);
        const pos = parsePosition(rest.replace(/\s-no-entry$/, ""));
        return moved(this.edit(this.state, { position: pos, run_entry: !noEntry }));
      }
      case "inspect":
      case "i":
        return { data: (await this.session.inspect((rest || "summary") as InspectSection)).data };
      case "undo":
      case "u":
        return { turn: await this.undo() };
      case "new":
      case "restart":
        return { turn: await this.start() };
      case "reload":
        return moved(this.reload());
      case "save":
        if (!rest) throw new UsageError("usage: save FILE");
        writeFileSync(rest, JSON.stringify(this.state, null, 2) + "\n");
        return { data: `state saved to ${rest}` };
      case "load": {
        if (!rest) throw new UsageError("usage: load FILE");
        const st = JSON.parse(readFileSync(rest, "utf8")) as State;
        return moved(this.session.resume(this.src.raw, st).then((r) => this.push(r)));
      }
      case "trace":
        this.trace = rest !== "off";
        return { data: `trace ${this.trace ? "on" : "off"}` };
      case "watch":
        if (rest === "off" || rest === "") this.watch = rest === "off" ? [] : this.watch;
        else this.watch.push(...rest.split(/[\s,]+/).filter(Boolean));
        return { data: { watch: this.watch } };
      case "expect": {
        const m = /^(\S+?)\s*(==|=|!=)\s*([\s\S]+)$/.exec(rest);
        if (!m) throw new UsageError("usage: expect /pointer=VALUE  (or PROP=VALUE, != for inequality)");
        const ptr = m[1].startsWith("/") ? m[1] : `/props/${m[1]}`;
        const actual = resolvePointer(this.state, ptr);
        let want: unknown;
        try {
          want = JSON.parse(m[3]);
        } catch {
          want = m[3];
        }
        const equal = JSON.stringify(actual) === JSON.stringify(want);
        if (equal === (m[2] === "!=")) throw new Error(`expectation failed: ${ptr} is ${JSON.stringify(actual)}, expected ${m[2] === "!=" ? "not " : ""}${JSON.stringify(want)}`);
        return { data: `ok ${ptr} ${m[2]} ${JSON.stringify(want)}` };
      }
      case "help":
      case "h":
      case "?":
        return { data: REPL_HELP };
      case "quit":
      case "exit":
      case "q":
        return { quit: true };
      default:
        throw new UsageError(`unknown command "${cmd}" (help lists them)`);
    }
  }

  watchLine(): string | null {
    if (!this.watch.length) return null;
    return this.watch.map((w) => {
      const ptr = w.startsWith("/") ? w : `/props/${w}`;
      return `${w}=${JSON.stringify(resolvePointer(this.state, ptr))}`;
    }).join("  ");
  }

  close(): void {
    this.session.engine.close();
  }
}

export const REPL_HELP = `Moves
  look | l                  show the current screen
  N | link N                choose link N
  c | continue              next page / auto-continue link
  go LOC|N                  travel a route
  zone ID|N                 click a point-and-click zone
  discuss char|fact|item|loc ID
  use ITEM                  use an item in the current dialog window
State
  state [/ptr|PROP]         read raw state (default: all)
  set /ptr|PROP VALUE       write a value (JSON or plain text); no hooks fire
  patch OPS|@file           RFC 6902 on the state
  rt JS|@file               run a script with the real runtime (hooks fire)
  goto POS [-no-entry]      teleport: DIALOG/WINDOW, loc:UID, char:UID
  expect /ptr|PROP=VALUE    assert (fails the run in 'dialogic run')
Inspect
  inspect [inventory|facts|people|places|objectives|history|summary]
  trace on|off              print what each move changed
  watch PROP|/ptr …|off     show values after every move
Time
  undo | u                  step back one move
  new                       restart from the startup position
  save FILE / load FILE     state to / from a file
  reload                    re-read the game (after editing it), keep the state
  quit | q`;

// ── commands ──

function debuggerOptions(pa: { flags: Record<string, string> }): DebuggerOptions {
  return {
    at: pa.flags.at,
    stateFile: pa.flags.state,
    script: pa.flags.script !== undefined ? readText(pa.flags.script) : undefined,
    noEntry: flagOn(pa as J, "no_entry"),
    seed: pa.flags.seed !== undefined ? Number(pa.flags.seed) : undefined,
    deno: flagOn(pa as J, "deno"),
    verbose: flagOn(pa as J, "verbose"),
    timeoutMs: pa.flags.timeout !== undefined ? Number(pa.flags.timeout) : undefined,
  };
}

const DEBUG_FLAGS = { bools: ["no_entry", "deno", "verbose", "json", "text"], values: ["at", "state", "script", "seed", "timeout"] };

export async function cmdDebug(args: string[]): Promise<number> {
  const pa = parseFor(args, DEBUG_FLAGS);
  if (pa.pos.length !== 1) {
    throw new UsageError("usage: dialogic debug GAME [-at POS] [-state FILE] [-script JS|@file] [-no-entry] [-seed N] [-deno] [-json|-text] [-verbose]");
  }
  const dbg = await Debugger.open(pa.pos[0], debuggerOptions(pa));
  const json = flagOn(pa, "json") || (!process.stdin.isTTY && !flagOn(pa, "text"));
  const show = (res: { turn?: TurnResult; data?: unknown; diff?: string[] }) => {
    if (json) {
      process.stdout.write(JSON.stringify(res.turn ? { turn: res.turn.turn, position: res.turn.state.position, diff: res.diff } : { data: res.data }) + "\n");
      return;
    }
    if (res.data !== undefined) process.stdout.write((typeof res.data === "string" ? res.data : JSON.stringify(res.data, null, 2)) + "\n");
    if (res.turn) {
      if (dbg.trace && res.diff?.length) process.stdout.write(res.diff.map((d) => `  ~ ${d}`).join("\n") + "\n");
      process.stdout.write(turnText(res.turn.turn, res.turn.state) + "\n");
      const w = dbg.watchLine();
      if (w) process.stdout.write(`  watch: ${w}\n`);
    }
  };
  if (!json) {
    note(`dialogic debug: ${dbg.src.label} (type help)`);
  }
  show({ turn: dbg.current });
  const interactive = Boolean(process.stdin.isTTY) && !json;
  const rl = createInterface({ input: process.stdin, output: interactive ? process.stdout : undefined, terminal: interactive, prompt: "> " });
  if (interactive) rl.prompt();
  let failures = 0;
  for await (const line of rl) {
    try {
      const res = await dbg.exec(line);
      if (res.quit) break;
      show(res);
    } catch (e) {
      failures++;
      const msg = (e as Error).message;
      if (json) process.stdout.write(JSON.stringify({ error: msg }) + "\n");
      else process.stdout.write(`error: ${msg}\n`);
    }
    if (interactive) rl.prompt();
  }
  rl.close();
  dbg.close();
  return json && failures ? 1 : 0;
}

/** Split a move script on newlines and on ";" outside quotes ("rt a = 'x;y'; c" is two moves). */
export function splitMoves(text: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quote: string | null = null;
  for (const ch of text) {
    if (quote) {
      if (ch === quote) quote = null;
      cur += ch;
    } else if (ch === "'" || ch === '"' || ch === "`") {
      quote = ch;
      cur += ch;
    } else if (ch === ";" || ch === "\n") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((m) => m.trim()).filter((m) => m && !m.startsWith("#"));
}

export async function cmdRun(args: string[]): Promise<number> {
  const pa = parseFor(args, { bools: DEBUG_FLAGS.bools, values: [...DEBUG_FLAGS.values, "moves", "expect"] });
  if (pa.pos.length !== 1 || !pa.flags.moves) {
    throw new UsageError('usage: dialogic run GAME -moves "c; 0; go market; expect gold=5" | -moves @file [-at POS] [-state FILE] [-seed N] [-text]');
  }
  const moves = splitMoves(readText(pa.flags.moves));
  if (pa.flags.expect) moves.push(...pa.flags.expect.split(",").map((e) => `expect ${e.trim()}`));
  const dbg = await Debugger.open(pa.pos[0], debuggerOptions(pa));
  const log: J[] = [];
  let failure: string | null = null;
  try {
    for (const [i, move] of moves.entries()) {
      try {
        const res = await dbg.exec(move);
        const fatal = dbg.state.fatalError?.message ?? (res.turn?.turn.scene.error || null);
        log.push({ move, position: positionText(dbg.state.position), ...(res.data !== undefined ? { result: res.data } : {}), ...(res.diff?.length ? { changed: res.diff } : {}) });
        if (fatal) {
          failure = `move ${i + 1} (${move}): game error: ${fatal}`;
          break;
        }
        if (res.quit) break;
      } catch (e) {
        failure = `move ${i + 1} (${move}): ${(e as Error).message}`;
        break;
      }
    }
  } finally {
    dbg.close();
  }
  const report = { game: dbg.src.label, ok: !failure, failure, moves: log.length, final: { position: positionText(dbg.state.position), step: dbg.state.stepCount, props: dbg.state.props }, log };
  if (flagOn(pa, "text")) {
    for (const l of log) process.stdout.write(`${l.move.padEnd(28)} → ${l.position}${l.changed ? `   ${l.changed.join("; ")}` : ""}\n`);
    process.stdout.write(failure ? `FAILED ${failure}\n` : `ok: ${log.length} move(s)\n`);
  } else {
    printJSON(report);
  }
  return failure ? 1 : 0;
}

// ── explore ──

interface Candidate {
  move: string;
  payload: ActPayload;
}

function candidates(turn: TurnPayload, withTopics: boolean): Candidate[] {
  const a = turn.actions;
  const out: Candidate[] = [];
  if (a.can_continue) out.push({ move: "c", payload: { action: "continue" } });
  for (const l of a.links) if (!l.disabled) out.push({ move: String(l.index), payload: { action: "choose_link", index: l.index } });
  for (const r of a.routes) if (!r.disabled) out.push({ move: `go ${r.uid}`, payload: { action: "travel", target_id: r.uid } });
  for (const z of a.zones) if (!z.disabled) out.push({ move: `zone ${z.id}`, payload: { action: "click_zone", target_id: z.id } });
  if (withTopics && a.discuss_topics) {
    const t = a.discuss_topics;
    for (const [type, list] of [["char", t.people], ["fact", t.facts], ["item", t.items], ["loc", t.places]] as const) {
      for (const x of list) out.push({ move: `discuss ${type} ${x.uid}`, payload: { action: "discuss", topic_type: type, target_id: x.uid } });
    }
  }
  if (withTopics) for (const i of a.usable_items) out.push({ move: `use ${i.uid}`, payload: { action: "use_item", target_id: i.uid } });
  return out;
}

export interface ExploreProblem {
  kind: "script error" | "dead end" | "engine error";
  position: string;
  message: string;
  /** Moves from the start that reproduce it (feed to `dialogic run -moves`). */
  moves: string[];
  /** Random seed of that run (`dialogic run -seed`). */
  seed: number;
}

export interface ExploreReport {
  game: string;
  runs: number;
  steps: number;
  seed: number;
  windowsReached: number;
  windowsTotal: number;
  unreachedWindows: string[];
  unvisitedLocations: string[];
  problems: ExploreProblem[];
}

export async function explore(gameArg: string, opts: DebuggerOptions & { runs: number; steps: number; topics: boolean }): Promise<ExploreReport> {
  const seed = opts.seed ?? Date.now() % 2 ** 31;
  const dbg = await Debugger.open(gameArg, { ...opts, seed });
  let rnd = seed >>> 0;
  const random = () => {
    rnd = (rnd + 0x6d2b79f5) >>> 0;
    let t = rnd;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const reached = new Set<string>();
  const visitedLocs = new Set<string>();
  const problems = new Map<string, ExploreProblem>();
  let totalSteps = 0;
  const raw = dbg.src.raw as J;
  try {
    for (let run = 0; run < opts.runs; run++) {
      const moves: string[] = [];
      // each run is reproducible on its own: `dialogic run GAME -seed <runSeed> -moves …`
      const runSeed = (seed + run) >>> 0;
      dbg.session.engine.seed(runSeed);
      await dbg.start(opts);
      for (let step = 0; step <= opts.steps; step++) {
        const { state, turn } = dbg.current;
        for (const v of state.visitedDialogs ?? []) reached.add(v.replace("::", "/"));
        for (const l of state.visitedLocations ?? []) visitedLocs.add(l);
        const pos = positionText(state.position);
        const err = state.fatalError?.message ?? turn.scene.error;
        if (err) {
          problems.set(`err|${pos}|${err}`, problems.get(`err|${pos}|${err}`) ?? { kind: "script error", position: pos, message: err, moves: [...moves], seed: runSeed });
          break;
        }
        const cands = candidates(turn, opts.topics);
        if (!cands.length) {
          problems.set(`dead|${pos}`, problems.get(`dead|${pos}`) ?? { kind: "dead end", position: pos, message: "no link, route, zone or continue is available", moves: [...moves], seed: runSeed });
          break;
        }
        if (step === opts.steps) break;
        const pick = cands[Math.floor(random() * cands.length)];
        moves.push(pick.move);
        totalSteps++;
        try {
          await dbg.act(pick.payload);
        } catch (e) {
          const msg = (e as Error).message;
          problems.set(`eng|${pos}|${msg}`, problems.get(`eng|${pos}|${msg}`) ?? { kind: "engine error", position: pos, message: msg, moves: [...moves], seed: runSeed });
          break;
        }
      }
    }
  } finally {
    dbg.close();
  }
  const allWindows: string[] = (raw.dialogs ?? []).flatMap((d: J) => (d?.windows ?? []).map((w: J) => `${d.name}/${w.uid}`));
  const allLocs: string[] = (raw.locs ?? []).map((l: J) => l?.uid);
  return {
    game: dbg.src.label,
    runs: opts.runs,
    steps: totalSteps,
    seed,
    windowsReached: allWindows.filter((w) => reached.has(w)).length,
    windowsTotal: allWindows.length,
    unreachedWindows: allWindows.filter((w) => !reached.has(w)),
    unvisitedLocations: allLocs.filter((l) => !visitedLocs.has(l)),
    problems: [...problems.values()],
  };
}

export async function cmdExplore(args: string[]): Promise<number> {
  const pa = parseFor(args, { bools: [...DEBUG_FLAGS.bools, "no_topics"], values: [...DEBUG_FLAGS.values, "runs", "steps"] });
  if (pa.pos.length !== 1) throw new UsageError("usage: dialogic explore GAME [-runs 50] [-steps 200] [-seed N] [-at POS] [-no-topics] [-text]");
  const report = await explore(pa.pos[0], {
    ...debuggerOptions(pa),
    runs: Number(pa.flags.runs ?? 50),
    steps: Number(pa.flags.steps ?? 200),
    topics: !flagOn(pa, "no_topics"),
  });
  if (flagOn(pa, "text")) {
    process.stdout.write(`${report.game}: ${report.runs} run(s), ${report.steps} move(s), seed ${report.seed}\n`);
    process.stdout.write(`windows reached ${report.windowsReached}/${report.windowsTotal}\n`);
    for (const p of report.problems) process.stdout.write(`${p.kind.toUpperCase()} at ${p.position}: ${p.message}\n  reproduce: dialogic run ${report.game} -seed ${p.seed} -moves "${p.moves.join("; ")}"\n`);
    if (report.unreachedWindows.length) process.stdout.write(`never reached: ${report.unreachedWindows.join(", ")}\n`);
  } else {
    printJSON(report);
  }
  return report.problems.some((p) => p.kind !== "dead end") ? 1 : 0;
}
