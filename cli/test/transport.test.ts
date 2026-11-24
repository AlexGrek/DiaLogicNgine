import { mkdtempSync, readFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { parseArgs } from "../src/args";
import { gamePut, clone } from "../src/bulk";
import { serverURL } from "../src/config";
import { McpClient } from "../src/mcp";
import { validFilename } from "../src/rest";
import { buildArgs, findTool, flagSet, render, runTool } from "../src/tools";

type Handler = (name: string, args: Record<string, unknown>) => unknown;

async function mockMCP(sse: boolean, handler: Handler): Promise<{ url: string; close: () => void }> {
  const server: Server = createServer((req, res) => {
    if (req.headers["x-api-key"] !== "k") {
      res.writeHead(401).end('{"error":"unauthorized"}');
      return;
    }
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const msg = JSON.parse(body);
      const out = JSON.stringify({ jsonrpc: "2.0", id: msg.id, result: handler(msg.params?.name, msg.params?.arguments ?? {}) });
      if (sse) {
        res.writeHead(200, { "Content-Type": "text/event-stream" });
        res.end(`event: message\ndata: {"jsonrpc":"2.0","id":999,"result":{}}\n\ndata: ${out}\n\n`);
      } else {
        res.writeHead(200, { "Content-Type": "application/json" }).end(out);
      }
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const addr = server.address() as { port: number };
  return { url: `http://127.0.0.1:${addr.port}`, close: () => server.close() };
}

const textResult = (s: string) => ({ content: [{ type: "text", text: s }] });

describe("MCP transport", () => {
  it("reads plain JSON and SSE responses", async () => {
    for (const sse of [false, true]) {
      const srv = await mockMCP(sse, (name, args) => textResult(`${name}:${args.project}`));
      const res = await new McpClient(`${srv.url}/mcp`, "k").callTool("browse_field", { project: "p" });
      srv.close();
      expect(res.content[0].text).toBe("browse_field:p");
    }
  });

  it("explains a 401", async () => {
    const srv = await mockMCP(false, () => null);
    await expect(new McpClient(`${srv.url}/mcp`, "wrong").callTool("x")).rejects.toThrow(/MCP_API_KEYS/);
    srv.close();
  });
});

describe("tool arguments", () => {
  it("maps positionals and flags onto MCP parameters", () => {
    const tl = findTool("editor", "patch-field")!; // kebab-case resolves
    const { bools, known } = flagSet(tl);
    const args = buildArgs(tl, parseArgs(["p", "dialog", "dialogs", "rev", '[{"op":"test","path":"","value":1}]'], bools, known));
    expect(Array.isArray(args.operations)).toBe(true);

    const act = findTool("play", "act")!;
    const f = flagSet(act);
    const a = buildArgs(act, parseArgs(["S", "travel", "-target_id", "beach", "-index=2"], f.bools, f.known));
    expect(a).toMatchObject({ index: 2, target_id: "beach", action: "travel" });

    expect(() => buildArgs(tl, { pos: ["p"], flags: {} })).toThrow(/missing/);
    expect(() => parseArgs(["-nope", "1"], f.bools, f.known)).toThrow(/unknown flag/);
    expect(() => buildArgs(act, { pos: ["S", "continue"], flags: { index: "x" } })).toThrow(/integer/);
  });

  it("does not ask for images by default", async () => {
    let got: Record<string, unknown> = {};
    const srv = await mockMCP(false, (_n, args) => {
      got = args;
      return textResult("{}");
    });
    process.env.DIALOGIC_CONFIG = join(mkdtempSync(join(tmpdir(), "dlg-")), "c.json");
    process.env.DIALOGIC_URL = srv.url;
    process.env.DIALOGIC_API_KEY = "k";
    const write = process.stdout.write;
    process.stdout.write = (() => true) as typeof process.stdout.write;
    try {
      await runTool(findTool("play", "get_state")!, ["S"]);
    } finally {
      process.stdout.write = write;
      srv.close();
      delete process.env.DIALOGIC_API_KEY;
    }
    expect(got.include_image).toBe(false);
  });

  it("writes image results to files and turns tool errors into errors", () => {
    const png = Buffer.from("\x89PNG-fake", "binary");
    const out = join(mkdtempSync(join(tmpdir(), "dlg-")), "p.png");
    const err = process.stderr.write;
    process.stderr.write = (() => true) as typeof process.stderr.write;
    try {
      render("preview_image", { content: [{ type: "image", data: png.toString("base64"), mimeType: "image/png" }] }, out, false);
    } finally {
      process.stderr.write = err;
    }
    expect(readFileSync(out).equals(png)).toBe(true);
    expect(() => render("patch_field", { isError: true, content: [{ type: "text", text: "Field changed." }] }, "", false)).toThrow("Field changed.");
  });
});

describe("config", () => {
  const saved = { ...process.env };
  beforeEach(() => {
    process.env.DIALOGIC_URL = "";
    process.env.DIALOGIC_MCP_URL = "https://ambient.example";
  });
  afterEach(() => {
    process.env = { ...saved };
  });

  // An ambient DIALOGIC_MCP_URL must not outrank a server you explicitly logged in to.
  it("server precedence: flag > DIALOGIC_URL > config > DIALOGIC_MCP_URL", () => {
    expect(serverURL({ server: "http://localhost:1/" })).toBe("http://localhost:1");
    expect(serverURL({ server: "http://localhost:1/" }, "http://flag")).toBe("http://flag");
    expect(serverURL({})).toBe("https://ambient.example");
    process.env.DIALOGIC_URL = "http://env";
    expect(serverURL({ server: "http://localhost:1/" })).toBe("http://env");
    process.env.DIALOGIC_URL = "";
    process.env.DIALOGIC_MCP_URL = "";
    expect(() => serverURL({})).toThrow(/no server/);
  });
});

describe("safety checks", () => {
  it("rejects unsafe remote filenames", () => {
    for (const bad of ["", "..", "a/b", "a\\b", ".hidden", "../x"]) expect(validFilename(bad)).toBe(false);
    expect(validFilename("room.jpg")).toBe(true);
  });

  it("refuses a game without engineVersion and clones onto itself", async () => {
    await expect(gamePut(null, "p", '{"a":1}')).rejects.toThrow(/engineVersion/);
    await expect(gamePut(null, "p", "[1]")).rejects.toThrow();
    await expect(clone(null, "a", "a", false, "")).rejects.toThrow(/same project/);
  });
});
