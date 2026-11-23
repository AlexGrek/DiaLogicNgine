import { GameSessionRunner } from "./session";
import type { RpcRequest, RpcResponse } from "./protocol";

interface DenoNamespaceLike {
  stdin: { readable: ReadableStream<Uint8Array> };
  stdout: { writable: WritableStream<Uint8Array> };
  stderr: { writable: WritableStream<Uint8Array> };
  exit(code?: number): never;
}

const denoGlobal = (globalThis as unknown as { Deno?: DenoNamespaceLike }).Deno;
if (!denoGlobal) {
  throw new Error("player-runner must be executed with Deno");
}

const stdinReader = denoGlobal.stdin.readable.getReader();
const stdoutWriter = denoGlobal.stdout.writable.getWriter();
const stderrWriter = denoGlobal.stderr.writable.getWriter();
const exitProcess = denoGlobal.exit.bind(denoGlobal);

const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: false });

function writeStderr(parts: unknown[]): void {
  const line =
    parts
      .map((part) => {
        if (typeof part === "string") return part;
        try {
          return JSON.stringify(part);
        } catch {
          return String(part);
        }
      })
      .join(" ") + "\n";
  void stderrWriter.write(encoder.encode(line)).catch(() => {
    /* ignore broken stderr */
  });
}

// Route all console output to stderr so stdout stays strictly framed NDJSON.
console.log = (...args: unknown[]) => writeStderr(args);
console.info = (...args: unknown[]) => writeStderr(args);
console.warn = (...args: unknown[]) => writeStderr(args);
console.error = (...args: unknown[]) => writeStderr(args);
console.debug = (...args: unknown[]) => writeStderr(args);

// Belt-and-suspenders lockdown on top of zero Deno permissions: prevent
// user-authored game scripts evaluated via globalThis.eval from touching Deno.
try {
  delete (globalThis as unknown as { Deno?: unknown }).Deno;
} catch {
  // Ignore if non-configurable.
}

const runner = new GameSessionRunner();

async function send(response: RpcResponse): Promise<void> {
  const payload = JSON.stringify(response) + "\n";
  await stdoutWriter.write(encoder.encode(payload));
}

function handleRequest(req: RpcRequest): RpcResponse {
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
        return {
          id: (req as { id?: number }).id ?? 0,
          ok: false,
          error: `Unknown operation '${String((req as { op?: unknown }).op)}'`,
        };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { id: req.id, ok: false, error: message };
  }
}

async function main(): Promise<void> {
  let buffer = "";
  while (true) {
    const { value, done } = await stdinReader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    let newlineIndex = buffer.indexOf("\n");
    while (newlineIndex !== -1) {
      const line = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);
      if (line) {
        let req: RpcRequest;
        try {
          req = JSON.parse(line) as RpcRequest;
        } catch (err) {
          await send({
            id: 0,
            ok: false,
            error: `Invalid JSON request: ${err instanceof Error ? err.message : String(err)}`,
          });
          newlineIndex = buffer.indexOf("\n");
          continue;
        }
        const response = handleRequest(req);
        await send(response);
      }
      newlineIndex = buffer.indexOf("\n");
    }
  }
  exitProcess(0);
}

main().catch((err) => {
  writeStderr(["Fatal runner error:", err instanceof Error ? err.stack ?? err.message : String(err)]);
  exitProcess(1);
});
