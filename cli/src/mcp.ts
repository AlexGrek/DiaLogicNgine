import { apiKey, loadConfig, serverURL } from "./config";

export interface McpContent {
  type: string;
  text?: string;
  data?: string;
  mimeType?: string;
}

export interface ToolResult {
  content: McpContent[];
  structuredContent?: unknown;
  isError?: boolean;
}

interface RpcMessage {
  id?: unknown;
  result?: unknown;
  error?: { code: number; message: string };
}

/** Stateless Streamable-HTTP MCP (JSON-RPC 2.0 over POST) to /mcp or /play-mcp. */
export class McpClient {
  private id = 0;
  constructor(public url: string, private key: string) {}

  static forServer(server: "editor" | "play"): McpClient {
    const cfg = loadConfig();
    const base = serverURL(cfg);
    const key = apiKey(cfg);
    if (!key) throw new Error("no API key: run `dialogic login -key K` or set DIALOGIC_API_KEY");
    return new McpClient(base + (server === "play" ? "/play-mcp" : "/mcp"), key);
  }

  async rpc(method: string, params: unknown): Promise<unknown> {
    const id = ++this.id;
    const resp = await fetch(this.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        "X-API-Key": this.key,
      },
      body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
    });
    if (resp.status === 401) {
      throw new Error("unauthorized — the API key is wrong or missing (`dialogic login -key K`, or DIALOGIC_API_KEY); the server needs it in MCP_API_KEYS");
    }
    const msg = await readRpc(resp, id);
    if (msg.error) throw new Error(`mcp error ${msg.error.code}: ${msg.error.message}`);
    if (resp.status >= 300) throw new Error(`HTTP ${resp.status}`);
    return msg.result;
  }

  async callTool(name: string, args: Record<string, unknown> = {}): Promise<ToolResult> {
    return (await this.rpc("tools/call", { name, arguments: args })) as ToolResult;
  }

  async listTools(): Promise<{ name: string; description: string }[]> {
    const out = (await this.rpc("tools/list", {})) as { tools: { name: string; description: string }[] };
    return out.tools ?? [];
  }
}

/** Accept a plain JSON body or an SSE stream; return the message answering `id`. */
async function readRpc(resp: Response, id: number): Promise<RpcMessage> {
  const text = await resp.text();
  if (!(resp.headers.get("content-type") ?? "").startsWith("text/event-stream")) {
    try {
      return JSON.parse(text) as RpcMessage;
    } catch {
      throw new Error(`HTTP ${resp.status}: unexpected response ${JSON.stringify(text.slice(0, 200))}`);
    }
  }
  for (const line of text.split("\n")) {
    if (!line.startsWith("data:")) continue;
    try {
      const m = JSON.parse(line.slice(5).trim()) as RpcMessage;
      if (String(m.id) === String(id)) return m;
    } catch {
      /* keep scanning */
    }
  }
  throw new Error("stream ended without a response");
}
