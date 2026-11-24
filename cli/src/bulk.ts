import { readFileSync, readdirSync, statSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { Rest, StatusError, imagePath, projectPath, validFilename } from "./rest";
import { each, note, writeAtomic } from "./out";

export const MIME_BY_EXT: Record<string, string> = {
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".webp": "image/webp", ".gif": "image/gif", ".svg": "image/svg+xml",
};

// ── game.json ──

export async function gameGet(r: Rest, project: string, compact = false): Promise<string> {
  const text = (await r.bytes("GET", `${projectPath(project)}/game`)).toString("utf8");
  if (compact) return text;
  try {
    return JSON.stringify(JSON.parse(text), null, 2) + "\n";
  } catch (e) {
    throw new Error(`server returned invalid JSON: ${(e as Error).message}`);
  }
}

/** Validate and minify the JSON (the editor saves it compact), then replace the whole remote game. */
export async function gamePut(r: Rest | null, project: string, data: string): Promise<void> {
  let g: unknown;
  try {
    g = JSON.parse(data);
  } catch (e) {
    throw new Error(`not a JSON object: ${(e as Error).message}`);
  }
  if (typeof g !== "object" || g === null || Array.isArray(g)) throw new Error("not a JSON object");
  const v = (g as Record<string, unknown>).engineVersion;
  if (typeof v !== "string" || !v) throw new Error('refusing to upload: no "engineVersion" (the loader rejects such a file)');
  if (!r) throw new Error("no server connection");
  await r.request("PUT", `${projectPath(project)}/game`, JSON.stringify(g), "application/json");
}

// ── images ──

export async function assetList(r: Rest, project: string): Promise<string[]> {
  return (await r.json<{ images?: string[] }>("GET", `${projectPath(project)}/images`)).images ?? [];
}

async function assetGet(r: Rest, project: string, name: string, dir: string): Promise<number> {
  if (!validFilename(name)) throw new Error(`skipping unsafe remote filename ${JSON.stringify(name)}`);
  let data: Buffer;
  try {
    data = await r.bytes("GET", imagePath(project, name));
  } catch (e) {
    throw new Error(`${name}: ${(e as Error).message}`);
  }
  writeAtomic(join(dir, name), data);
  return data.length;
}

export async function assetPutBytes(r: Rest, project: string, as: string, data: Uint8Array): Promise<void> {
  if (!validFilename(as)) throw new Error(`bad remote filename ${JSON.stringify(as)}`);
  const ctype = MIME_BY_EXT[extname(as).toLowerCase()];
  if (!ctype) throw new Error(`${as}: unsupported extension (png, jpg, webp, gif, svg)`);
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(data)], { type: ctype }), as);
  try {
    await r.request("PUT", imagePath(project, as), form);
  } catch (e) {
    throw new Error(`${as}: ${(e as Error).message}`);
  }
}

export async function assetPut(r: Rest, project: string, file: string, as = ""): Promise<void> {
  await assetPutBytes(r, project, as || basename(file), readFileSync(file));
}

export async function assetDelete(r: Rest, project: string, name: string): Promise<void> {
  try {
    await r.request("DELETE", imagePath(project, name));
  } catch (e) {
    throw new Error(`${name}: ${(e as Error).message}`);
  }
}

export async function assetsPull(r: Rest, project: string, dir: string, names: string[] = []): Promise<void> {
  const list = names.length ? names : await assetList(r, project);
  let total = 0;
  let failure: unknown;
  try {
    await each(list, async (n) => {
      const size = await assetGet(r, project, n, dir); // not `total += await …`: that reads total before awaiting
      total += size;
    });
  } catch (e) {
    failure = e;
  }
  note(`downloaded ${list.length} image(s), ${total} bytes → ${dir}`);
  if (failure) throw failure;
}

/** Regular files of dir (one level) with a known image extension. */
export function localImages(dir: string): string[] {
  return readdirSync(dir)
    .filter((n) => MIME_BY_EXT[extname(n).toLowerCase()] && validFilename(n) && statSync(join(dir, n)).isFile())
    .sort()
    .map((n) => join(dir, n));
}

export async function assetsPush(r: Rest, project: string, files: string[], prune: boolean, keepDir = ""): Promise<void> {
  await each(files, (f) => assetPut(r, project, f)); // nothing is pruned after a failed upload
  note(`uploaded ${files.length} image(s)`);
  if (!prune) return;
  const keep = new Set(files.map((f) => basename(f)));
  const stale = (await assetList(r, project)).filter((n) => !keep.has(n));
  await each(stale, (n) => assetDelete(r, project, n));
  note(`pruned ${stale.length} remote image(s) not in ${keepDir}`);
}

// ── whole project ──

export async function pull(r: Rest, project: string, dir: string, game: boolean, images: boolean): Promise<void> {
  if (game) {
    const data = await gameGet(r, project);
    writeAtomic(join(dir, "game.json"), data);
    note(`wrote ${join(dir, "game.json")} (${Buffer.byteLength(data)} bytes)`);
  }
  if (images) await assetsPull(r, project, join(dir, "images"));
}

export async function push(r: Rest, project: string, dir: string, game: boolean, images: boolean, prune: boolean): Promise<void> {
  if (game) {
    const data = readFileSync(join(dir, "game.json"), "utf8");
    await gamePut(r, project, data);
    note(`uploaded game.json (${Buffer.byteLength(data)} bytes)`);
  }
  if (images) {
    const imgDir = join(dir, "images");
    await assetsPush(r, project, localImages(imgDir), prune, imgDir);
  }
}

/** Copy game.json and every image of src into the new project dst. Refuses an existing dst unless force. */
export async function clone(r: Rest | null, src: string, dst: string, force: boolean, title: string): Promise<void> {
  if (src === dst) throw new Error("source and destination are the same project");
  if (!r) throw new Error("no server connection");
  if (!force) {
    try {
      await r.bytes("GET", `${projectPath(dst)}/game`);
      throw new Error(`project ${JSON.stringify(dst)} already exists (use -force to overwrite it)`);
    } catch (e) {
      if (!(e instanceof StatusError && e.status === 404)) {
        if (e instanceof StatusError) throw new Error(`cannot use ${JSON.stringify(dst)} as a destination: ${e.message}`);
        throw e;
      }
    }
  }
  let data: string;
  try {
    data = (await r.bytes("GET", `${projectPath(src)}/game`)).toString("utf8");
  } catch (e) {
    throw new Error(`source game: ${(e as Error).message}`);
  }
  if (title) {
    const g = JSON.parse(data);
    if (g.general && typeof g.general === "object") g.general.name = title;
    data = JSON.stringify(g);
  }
  const names = await assetList(r, src);
  await each(names, async (n) => {
    if (!validFilename(n)) throw new Error(`skipping unsafe remote filename ${JSON.stringify(n)}`);
    let img: Buffer;
    try {
      img = await r.bytes("GET", imagePath(src, n));
    } catch (e) {
      throw new Error(`${n}: ${(e as Error).message}`);
    }
    await assetPutBytes(r, dst, n, img);
  });
  // game.json is written last, so a failed clone leaves no half-playable game
  await gamePut(r, dst, data);
  note(`cloned ${src} → ${dst} (game.json + ${names.length} image(s))`);
}
