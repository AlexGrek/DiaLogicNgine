/**
 * Bundled (with the whole engine) into a string that the CLI evaluates inside a
 * `node:vm` context. Speaks the player-runner protocol (player-runner/src/protocol.ts)
 * through one global function, so the CLI debug player runs exactly what the
 * Player MCP runs.
 */
import { GameSessionRunner } from "../../../player-runner/src/session";
import type { RpcRequest, RpcResponse } from "../../../player-runner/src/protocol";

const runner = new GameSessionRunner();

function handle(req: RpcRequest): RpcResponse {
  try {
    switch (req.op) {
      case "ping":
        return { id: req.id, ok: true, result: { pong: true } };
      case "init":
        return { id: req.id, ok: true, result: runner.init(req.game, req.state) };
      case "render":
        return { id: req.id, ok: true, result: runner.render() };
      case "act":
        return { id: req.id, ok: true, result: runner.act(req.payload) };
      case "inspect":
        return { id: req.id, ok: true, result: runner.inspect(req.section) };
      case "load_state":
        return { id: req.id, ok: true, result: runner.loadState(req.state) };
      case "debug_init":
        return { id: req.id, ok: true, result: runner.debugInit(req.game, req.position ?? null) };
      case "debug_apply":
        return { id: req.id, ok: true, result: runner.debugApply(req.state, req.options ?? {}) };
      default:
        return { id: (req as { id?: number }).id ?? 0, ok: false, error: `Unknown operation '${String((req as { op?: unknown }).op)}'` };
    }
  } catch (err) {
    return { id: req.id, ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** JSON in, JSON out: nothing but plain data crosses the context boundary. */
(globalThis as unknown as { __dialogic_handle: (s: string) => string }).__dialogic_handle = (s: string) =>
  JSON.stringify(handle(JSON.parse(s) as RpcRequest));

/** Deterministic Math.random for reproducible runs (mulberry32). */
(globalThis as unknown as { __dialogic_seed: (n: number) => void }).__dialogic_seed = (seed: number) => {
  let a = seed >>> 0;
  Math.random = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
