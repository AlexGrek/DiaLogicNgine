import { loadConfig, serverURL } from "./config";

export const SESSION_COOKIE = "dln_session";

/** A non-2xx REST response. */
export class StatusError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function errorOf(resp: Response): Promise<StatusError> {
  let detail: unknown;
  try {
    detail = ((await resp.json()) as { detail?: unknown }).detail;
  } catch {
    /* not JSON */
  }
  if (detail !== undefined && detail !== null) {
    return new StatusError(resp.status, `HTTP ${resp.status}: ${typeof detail === "string" ? detail : JSON.stringify(detail)}`);
  }
  if (resp.status === 401) {
    return new StatusError(401, "HTTP 401: session expired — run `dialogic login -user NAME` again");
  }
  return new StatusError(resp.status, `HTTP ${resp.status}`);
}

export async function restLogin(base: string, user: string, password: string): Promise<string> {
  const resp = await fetch(`${base}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: user, password }),
  });
  if (resp.status !== 200) {
    throw new Error(`login failed: ${(await errorOf(resp)).message}`);
  }
  for (const c of resp.headers.getSetCookie()) {
    const [pair] = c.split(";");
    const eq = pair.indexOf("=");
    if (pair.slice(0, eq).trim() === SESSION_COOKIE) return pair.slice(eq + 1).trim();
  }
  throw new Error("login succeeded but the server set no session cookie");
}

/** /api/v1 with the cookie session. The API key does not work here (MCP endpoints only). */
export class Rest {
  constructor(public base: string, public token: string) {}

  static async connect(): Promise<Rest> {
    const cfg = loadConfig();
    const base = serverURL(cfg);
    let token = cfg.token ?? "";
    // Scripts/CI: DIALOGIC_USER + DIALOGIC_PASSWORD log in on the fly.
    const u = process.env.DIALOGIC_USER, p = process.env.DIALOGIC_PASSWORD;
    if (u && p) token = await restLogin(base, u, p);
    if (!token) {
      throw new Error("no login session: run `dialogic login -user NAME` (REST commands need the account password, not the API key)");
    }
    return new Rest(base, token);
  }

  async request(method: string, path: string, body?: BodyInit, contentType?: string): Promise<Response> {
    const headers: Record<string, string> = { Cookie: `${SESSION_COOKIE}=${this.token}` };
    if (contentType) headers["Content-Type"] = contentType;
    const resp = await fetch(`${this.base}/api/v1${path}`, { method, headers, body });
    if (resp.status < 200 || resp.status >= 300) throw await errorOf(resp);
    return resp;
  }

  async bytes(method: string, path: string): Promise<Buffer> {
    const resp = await this.request(method, path);
    return Buffer.from(await resp.arrayBuffer());
  }

  async json<T>(method: string, path: string): Promise<T> {
    return JSON.parse((await this.bytes(method, path)).toString("utf8")) as T;
  }
}

export const projectPath = (project: string) => `/projects/${encodeURIComponent(project)}`;
export const imagePath = (project: string, name: string) => `${projectPath(project)}/images/${encodeURIComponent(name)}`;

export function validFilename(n: string): boolean {
  return n !== "" && n !== "." && n !== ".." && !/[/\\\0]/.test(n) && !n.startsWith(".");
}
