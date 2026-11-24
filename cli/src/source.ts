import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { GameDescription } from "../../dialogic/src/game/GameDescription";
import { normalizeGame } from "../../dialogic/src/game/Patches";
import { assetList, gamePut, localImages, MIME_BY_EXT } from "./bulk";
import { loadConfig, serverURL } from "./config";
import { Rest, projectPath } from "./rest";
import { note, writeAtomic } from "./out";

/**
 * Where a game comes from. Every model-aware command takes a GAME argument that is
 * either a local game.json (or a folder holding one, as written by `pull`) or the
 * name of a project on the server.
 */
export interface GameSource {
  kind: "file" | "remote";
  /** File path or project name. */
  label: string;
  /** The JSON as stored (not migrated). */
  raw: Record<string, unknown>;
  /** Image filenames available to the game, or null when unknown. */
  images(): Promise<string[] | null>;
  /** Write a changed raw game back (local file or server). */
  save(raw: unknown): Promise<void>;
  /** Re-read from disk / server. */
  reload(): Promise<GameSource>;
}

export function looksLocal(arg: string): boolean {
  return existsSync(arg) || arg.endsWith(".json") || arg.includes("/") || arg.startsWith(".");
}

function localFile(arg: string): string {
  if (existsSync(arg) && statSync(arg).isDirectory()) {
    const f = join(arg, "game.json");
    if (!existsSync(f)) throw new Error(`${arg} has no game.json`);
    return f;
  }
  if (!existsSync(arg)) throw new Error(`${arg}: no such file`);
  return arg;
}

function parseObject(text: string, label: string): Record<string, unknown> {
  let g: unknown;
  try {
    g = JSON.parse(text);
  } catch (e) {
    throw new Error(`${label}: invalid JSON: ${(e as Error).message}`);
  }
  if (!g || typeof g !== "object" || Array.isArray(g)) throw new Error(`${label}: game JSON must be an object`);
  return g as Record<string, unknown>;
}

async function openLocal(arg: string): Promise<GameSource> {
  const file = resolve(localFile(arg));
  const raw = parseObject(readFileSync(file, "utf8"), file);
  const imgDir = join(dirname(file), "images");
  return {
    kind: "file",
    label: file,
    raw,
    images: async () =>
      existsSync(imgDir) ? localImages(imgDir).map((p) => p.slice(imgDir.length + 1)) : null,
    save: async (g) => writeAtomic(file, JSON.stringify(g, null, 2) + "\n"),
    reload: () => openLocal(arg),
  };
}

/** Logged-in REST session, or null (published games can still be read anonymously). */
async function restOrNull(): Promise<Rest | null> {
  try {
    return await Rest.connect();
  } catch {
    return null;
  }
}

async function openRemote(project: string): Promise<GameSource> {
  const rest = await restOrNull();
  let text: string;
  if (rest) {
    text = (await rest.bytes("GET", `${projectPath(project)}/game`)).toString("utf8");
  } else {
    const base = serverURL(loadConfig());
    const resp = await fetch(`${base}/api/v1${projectPath(project)}/game`);
    if (!resp.ok) {
      throw new Error(`${project}: HTTP ${resp.status} (not logged in, so only published games can be read — run \`dialogic login -user NAME\`)`);
    }
    text = await resp.text();
  }
  const raw = parseObject(text, project);
  return {
    kind: "remote",
    label: project,
    raw,
    images: async () => {
      if (rest) return assetList(rest, project).catch(() => null);
      const base = serverURL(loadConfig());
      const resp = await fetch(`${base}/api/v1${projectPath(project)}/images`);
      return resp.ok ? (((await resp.json()) as { images?: string[] }).images ?? []) : null;
    },
    save: async (g) => {
      if (!rest) throw new Error("saving to the server needs `dialogic login -user NAME`");
      await gamePut(rest, project, JSON.stringify(g));
      note(`uploaded ${project}`);
    },
    reload: () => openRemote(project),
  };
}

export async function openGame(arg: string): Promise<GameSource> {
  if (!arg) throw new Error("missing GAME (a game.json, a folder with one, or a server project name)");
  return looksLocal(arg) ? openLocal(arg) : openRemote(arg);
}

/** The migrated model the editor and engine work with. */
export function modelOf(src: GameSource | Record<string, unknown>): GameDescription {
  const raw = "raw" in src && "kind" in src ? (src as GameSource).raw : src;
  return normalizeGame(structuredClone(raw));
}

export function isImageFile(name: string): boolean {
  return Boolean(MIME_BY_EXT[name.slice(name.lastIndexOf(".")).toLowerCase()]);
}

export function listDir(dir: string): string[] {
  return existsSync(dir) ? readdirSync(dir) : [];
}
