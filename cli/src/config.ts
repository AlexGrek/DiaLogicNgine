import { chmodSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export const CONFIG_NAME = ".dialogic-cli.json";

/**
 * On-disk login state (mode 0600), shared with the old Go CLI.
 *   key   — MCP API key (server env MCP_API_KEYS), used by `editor` / `play` / `call`.
 *   token — REST session cookie from username+password, used by pull / push / game / assets.
 */
export interface Config {
  server?: string;
  key?: string;
  user?: string;
  token?: string;
}

export function configFile(): string {
  return process.env.DIALOGIC_CONFIG || join(homedir(), CONFIG_NAME);
}

export function loadConfig(): Config {
  const path = configFile();
  if (!existsSync(path)) return {};
  return JSON.parse(readFileSync(path, "utf8")) as Config;
}

export function saveConfig(cfg: Config): void {
  const path = configFile();
  const clean: Config = { server: cfg.server ?? "" };
  if (cfg.key) clean.key = cfg.key;
  if (cfg.user) clean.user = cfg.user;
  if (cfg.token) clean.token = cfg.token;
  writeFileSync(path, JSON.stringify(clean, null, 2), { mode: 0o600 });
  chmodSync(path, 0o600); // writeFileSync keeps the mode of a pre-existing file
}

/**
 * Server precedence: explicit override (-server) → DIALOGIC_URL → saved config →
 * DIALOGIC_MCP_URL. The last is only a fallback, so an ambient variable meant for
 * other tools never outranks a server you logged in to. No built-in default host.
 */
export function serverURL(cfg: Config, override = ""): string {
  for (const s of [override, process.env.DIALOGIC_URL, cfg.server, process.env.DIALOGIC_MCP_URL]) {
    if (s) return s.replace(/\/+$/, "");
  }
  throw new Error("no server: run `dialogic login -server URL` or set DIALOGIC_URL");
}

export function apiKey(cfg: Config): string {
  return process.env.DIALOGIC_API_KEY || cfg.key || "";
}
