import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import type { ActPayload, DebugApplyOptions, InspectSection, TurnResult } from "../../../player-runner/src/protocol";
import type { State, UiObjectId } from "../../../dialogic/src/exec/GameState";

declare const __SANDBOX_SOURCE__: string | undefined;
declare const __DENO_RUNNER_SOURCE__: string | undefined;

type Req = Record<string, unknown> & { op: string };

/**
 * The game engine for the debug player, speaking the player-runner protocol.
 * Two backends: in-process `node:vm` (default) and the Player MCP's own Deno
 * runner with zero permissions (`-deno`).
 */
export interface Engine {
  call<T>(req: Req): Promise<T>;
  /** Make Math.random deterministic (vm backend only). */
  seed(n: number): void;
  close(): void;
}

const here = dirname(fileURLToPath(import.meta.url));

/** Build a bundle on the fly when running from sources (tests, `tsx`). */
async function buildOnTheFly(entry: string, format: "iife" | "esm"): Promise<string> {
  const esbuild = await import("esbuild");
  const res = await esbuild.build({
    entryPoints: [entry],
    bundle: true,
    write: false,
    format,
    platform: format === "iife" ? "neutral" : "browser",
    mainFields: ["module", "main"],
    target: "es2022",
    define: { "process.env.NODE_ENV": '"production"' },
    logLevel: "silent",
  });
  return res.outputFiles[0].text;
}

async function sandboxSource(): Promise<string> {
  if (typeof __SANDBOX_SOURCE__ === "string") return __SANDBOX_SOURCE__;
  return buildOnTheFly(join(here, "sandbox-entry.ts"), "iife");
}

async function denoRunnerSource(): Promise<string> {
  if (typeof __DENO_RUNNER_SOURCE__ === "string") return __DENO_RUNNER_SOURCE__;
  return buildOnTheFly(join(here, "../../../player-runner/src/main.ts"), "esm");
}

export interface EngineOptions {
  /** Per-call time limit for game scripts (ms). */
  timeoutMs?: number;
  /** Where the engine's console output goes (default: dropped). */
  log?: (line: string) => void;
}

/**
 * In-process engine. Game scripts run inside a separate vm context with no
 * require/process/fs. A vm context is NOT a security boundary — use `-deno` for
 * games you do not trust.
 */
class VmEngine implements Engine {
  private ctx: vm.Context;
  private nextId = 0;

  constructor(source: string, private opts: EngineOptions) {
    const log = (...args: unknown[]) => opts.log?.(args.map((a) => (typeof a === "string" ? a : safeJson(a))).join(" "));
    this.ctx = vm.createContext({ console: { log, info: log, warn: log, error: log, debug: log, trace: log } });
    vm.runInContext(source, this.ctx, { filename: "dialogic-engine.js" });
  }

  async call<T>(req: Req): Promise<T> {
    this.ctx.__req = JSON.stringify({ ...req, id: ++this.nextId });
    let out: string;
    try {
      out = vm.runInContext("__dialogic_handle(__req)", this.ctx, { timeout: this.opts.timeoutMs ?? 10_000 }) as string;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(/timed out/i.test(msg) ? `game script ran longer than ${this.opts.timeoutMs ?? 10_000} ms (infinite loop?)` : msg);
    }
    const resp = JSON.parse(out) as { ok: boolean; result?: T; error?: string };
    if (!resp.ok) throw new Error(resp.error ?? "engine error");
    return resp.result as T;
  }

  seed(n: number): void {
    vm.runInContext(`__dialogic_seed(${Math.floor(n)})`, this.ctx);
  }

  close(): void {}
}

/** The Player MCP runner under Deno with zero permissions (NDJSON over stdio). */
class DenoEngine implements Engine {
  private proc: ChildProcessWithoutNullStreams;
  private dir: string;
  private buffer = "";
  private pending = new Map<number, (resp: { ok: boolean; result?: unknown; error?: string }) => void>();
  private nextId = 0;

  constructor(source: string, opts: EngineOptions) {
    this.dir = mkdtempSync(join(tmpdir(), "dialogic-runner-"));
    const file = join(this.dir, "runner.mjs");
    writeFileSync(file, source);
    const deno = process.env.PLAY_MCP_DENO_BIN || "deno";
    this.proc = spawn(deno, ["run", "--quiet", "--no-prompt", "--no-config", "--no-npm", "--no-remote", file], { stdio: "pipe" });
    this.proc.stdout.setEncoding("utf8");
    this.proc.stdout.on("data", (chunk: string) => this.onData(chunk));
    this.proc.stderr.setEncoding("utf8");
    this.proc.stderr.on("data", (chunk: string) => opts.log?.(chunk.trimEnd()));
    this.proc.on("exit", () => {
      for (const resolve of this.pending.values()) resolve({ ok: false, error: "deno runner exited" });
      this.pending.clear();
    });
  }

  private onData(chunk: string) {
    this.buffer += chunk;
    let nl: number;
    while ((nl = this.buffer.indexOf("\n")) >= 0) {
      const line = this.buffer.slice(0, nl).trim();
      this.buffer = this.buffer.slice(nl + 1);
      if (!line) continue;
      const msg = JSON.parse(line) as { id: number; ok: boolean; result?: unknown; error?: string };
      this.pending.get(msg.id)?.(msg);
      this.pending.delete(msg.id);
    }
  }

  call<T>(req: Req): Promise<T> {
    const id = ++this.nextId;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, (resp) => (resp.ok ? resolve(resp.result as T) : reject(new Error(resp.error ?? "engine error"))));
      this.proc.stdin.write(JSON.stringify({ ...req, id }) + "\n");
    });
  }

  seed(): void {
    throw new Error("-seed is not supported with -deno");
  }

  close(): void {
    this.proc.stdin.end();
    this.proc.kill();
    rmSync(this.dir, { recursive: true, force: true });
  }
}

function safeJson(v: unknown): string {
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

export async function createEngine(opts: EngineOptions & { deno?: boolean } = {}): Promise<Engine> {
  if (opts.deno) {
    const deno = process.env.PLAY_MCP_DENO_BIN || "deno";
    if (spawnSync(deno, ["--version"]).status !== 0) throw new Error("-deno: Deno is not installed (or set PLAY_MCP_DENO_BIN)");
    return new DenoEngine(await denoRunnerSource(), opts);
  }
  return new VmEngine(await sandboxSource(), opts);
}

/** Typed wrappers around the protocol. */
export class Session {
  constructor(public engine: Engine) {}

  newGame(game: unknown): Promise<TurnResult> {
    return this.engine.call({ op: "init", game, state: null });
  }

  resume(game: unknown, state: State): Promise<TurnResult> {
    return this.engine.call({ op: "init", game, state });
  }

  render(): Promise<TurnResult> {
    return this.engine.call({ op: "render" });
  }

  act(payload: ActPayload): Promise<TurnResult> {
    return this.engine.call({ op: "act", payload });
  }

  inspect(section: InspectSection): Promise<{ section: string; data: unknown }> {
    return this.engine.call({ op: "inspect", section });
  }

  /** Load the game with a fresh, not-entered state at `position` (debug_start_game). */
  async debugStart(game: unknown, position: UiObjectId | null, options: DebugApplyOptions = {}): Promise<TurnResult> {
    const { state } = await this.engine.call<{ state: State }>({ op: "debug_init", game, position });
    return this.debugApply(state, { run_entry: true, ...options });
  }

  debugApply(state: State, options: DebugApplyOptions): Promise<TurnResult> {
    return this.engine.call({ op: "debug_apply", state, options });
  }
}
