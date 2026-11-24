import { readFileSync, writeFileSync } from "node:fs";
import { basename, extname } from "node:path";
import { Parsed, UsageError, parseArgs, readText } from "./args";
import { McpClient, McpContent, ToolResult } from "./mcp";
import { note, prettyJSON } from "./out";

type Kind = "str" | "text" | "int" | "bool" | "json";

interface Param {
  name: string;
  kind: Kind;
  req: boolean;
  /** Accepted as a positional argument (in table order). */
  pos: boolean;
  help: string;
}

export interface Tool {
  server: "editor" | "play";
  name: string;
  help: string;
  params: Param[];
  /** Has an include_image parameter (set by -image / -o). */
  image?: boolean;
  /** The result is an image (preview_image, view_image). */
  shows?: boolean;
}

const req = (name: string, help = ""): Param => ({ name, kind: "str", req: true, pos: true, help });
const opt = (name: string, kind: Kind, help = ""): Param => ({ name, kind, req: false, pos: false, help });
const optPos = (name: string, kind: Kind, help = ""): Param => ({ name, kind, req: false, pos: true, help });

/** Same names and parameters as the MCP servers. */
export const TOOLS: Tool[] = [
  // ── editor (/mcp) ──
  { server: "editor", name: "list_projects", help: "Games owned by this account, 10 per page", params: [opt("page", "int", "1-based page")] },
  { server: "editor", name: "create_project", help: "Create a new empty game (never overwrites)", params: [req("project", "name, 1-64 chars"), opt("title", "str"), opt("description", "str")] },
  { server: "editor", name: "editor_planes", help: "Plane → field map", params: [] },
  { server: "editor", name: "browse_field", help: "Children, JSON Pointers and the field revision", params: [req("project"), req("plane"), req("field"), opt("path", "str", "JSON Pointer"), opt("offset", "int"), opt("limit", "int", "1-50")] },
  { server: "editor", name: "read_fragment", help: "Read ≤12 KB at a pointer; page long strings with -text_offset", params: [req("project"), req("plane"), req("field"), opt("path", "str", "JSON Pointer"), opt("text_offset", "int")] },
  { server: "editor", name: "patch_field", help: "Atomic RFC 6902 batch (paths relative to the field root)", params: [req("project"), req("plane"), req("field"), req("revision", "from browse_field"), { name: "operations", kind: "json", req: true, pos: true, help: "JSON array, @file or - for stdin" }] },
  { server: "editor", name: "editor_help", help: "group = link | script | schema; omit topic for the list", params: [req("group", "link|script|schema"), optPos("topic", "str")] },
  { server: "editor", name: "list_images", help: "Project image filenames", params: [req("project"), opt("offset", "int"), opt("limit", "int", "1-50")] },
  { server: "editor", name: "preview_image", help: "Download a 256px thumbnail (-o FILE)", params: [req("project"), req("filename")], shows: true },
  { server: "editor", name: "upload_image", help: "Upload or replace an image (≤8 MiB): upload_image PROJECT FILE [-as NAME]", params: [] },
  { server: "editor", name: "delete_image", help: "Remove an image and its thumbnail", params: [req("project"), req("filename")] },
  { server: "editor", name: "remove_background", help: "Cut the person out of an image into a new transparent WebP (character looks); prints the new reference", params: [req("project"), req("filename"), opt("model", "str")] },

  // ── play (/play-mcp) ──
  { server: "play", name: "list_available_games", help: "Playable games (published + your own)", params: [opt("search", "str"), opt("page", "int"), opt("limit", "int")] },
  { server: "play", name: "list_saved_games", help: "Games you have saved sessions for", params: [] },
  { server: "play", name: "list_recently_played", help: "Most recent sessions", params: [opt("limit", "int")] },
  { server: "play", name: "start_game", help: "New session → session_code + opening scene", params: [req("project"), opt("title", "str")], image: true },
  { server: "play", name: "list_sessions", help: "Your saved sessions, newest first", params: [opt("project", "str"), opt("offset", "int"), opt("limit", "int")] },
  { server: "play", name: "resume_session", help: "Continue a saved session", params: [req("session_code")], image: true },
  { server: "play", name: "delete_session", help: "Delete a session and its checkpoints", params: [req("session_code")] },
  { server: "play", name: "save_checkpoint", help: "Named manual save", params: [req("session_code"), req("name")] },
  { server: "play", name: "list_checkpoints", help: "Named saves (+ previous autosave)", params: [req("session_code")] },
  { server: "play", name: "load_checkpoint", help: "Restore a checkpoint or -use_previous_autosave", params: [req("session_code"), opt("name", "str"), opt("use_previous_autosave", "bool")], image: true },
  { server: "play", name: "delete_checkpoint", help: "Delete a named save", params: [req("session_code"), req("name")] },
  { server: "play", name: "get_state", help: "Current scene without advancing", params: [req("session_code")], image: true },
  { server: "play", name: "act", help: "One move: choose_link|continue|travel|click_zone|discuss|use_item", params: [req("session_code"), req("action", "choose_link|continue|travel|click_zone|discuss|use_item"), optPos("index", "int", "link/route/zone index"), opt("target_id", "str", "location/zone/item/topic uid"), opt("topic_type", "str", "char|fact|item|loc (discuss)")], image: true },
  { server: "play", name: "inspect", help: "inventory|facts|people|places|objectives|history|summary", params: [req("session_code"), optPos("section", "str")] },
  { server: "play", name: "view_image", help: "Download a session image (-o FILE)", params: [req("session_code"), optPos("target", "str", "scene|avatar|stage|item|route|pac_annotated"), opt("target_id", "str")], shows: true },
  { server: "play", name: "debug_start_game", help: "Own games: start at any position with prepared state", params: [req("project"), opt("position", "json", '{"kind":"window","dialog":..,"window":..}'), opt("operations", "json", "RFC 6902 on raw State"), opt("script", "text", "JS body; @file or -"), opt("run_entry", "bool", "default true"), opt("title", "str")], image: true },
  { server: "play", name: "debug_read_state", help: "Own games: read raw State by JSON Pointer", params: [req("session_code"), optPos("path", "str", 'JSON Pointer, "" = all')] },
  { server: "play", name: "debug_edit_state", help: "Own games: patch state / run script / teleport", params: [req("session_code"), opt("operations", "json"), opt("script", "text"), opt("position", "json"), opt("run_entry", "bool")], image: true },
];

export function findTool(server: string, name: string): Tool | undefined {
  const n = name.replace(/-/g, "_");
  return TOOLS.find((t) => t.server === server && t.name === n);
}

export function toolUsage(t: Tool): string {
  if (t.name === "upload_image") return `dialogic ${t.server} ${t.name} PROJECT FILE [-as NAME]\n  ${t.help}\n`;
  let s = `dialogic ${t.server} ${t.name}`;
  for (const p of t.params) {
    if (p.pos && p.req) s += ` <${p.name}>`;
    else if (p.pos) s += ` [${p.name}]`;
  }
  s += ` [flags]\n  ${t.help}\n`;
  for (const p of t.params) {
    const label = p.pos ? `${p.name} (or -${p.name})` : `-${p.name}`;
    s += `    ${label.padEnd(28)} ${p.help}\n`;
  }
  if (t.image) s += "    -image                       include the scene image (saved to -o FILE)\n";
  if (t.image || t.shows) s += "    -o FILE                      where to write image output\n";
  return s;
}

export function toolList(server: string): string {
  return TOOLS.filter((t) => t.server === server).map((t) => `  ${t.name.padEnd(22)} ${t.help}\n`).join("");
}

function convert(p: Param, v: string): unknown {
  switch (p.kind) {
    case "int": {
      if (!/^-?\d+$/.test(v)) throw new UsageError(`-${p.name}: not an integer: ${JSON.stringify(v)}`);
      return Number(v);
    }
    case "bool": {
      const b = { true: true, "1": true, t: true, false: false, "0": false, f: false }[v.toLowerCase()];
      if (b === undefined) throw new UsageError(`-${p.name}: not a boolean: ${JSON.stringify(v)}`);
      return b;
    }
    case "text":
      return readText(v);
    case "json": {
      const s = readText(v);
      try {
        return JSON.parse(s);
      } catch (e) {
        throw new UsageError(`-${p.name}: invalid JSON: ${(e as Error).message}`);
      }
    }
    default:
      return v;
  }
}

export function flagSet(t: Tool): { bools: Set<string>; known: Set<string> } {
  const bools = new Set(["raw"]);
  const known = new Set(["raw", "o", "server"]);
  for (const p of t.params) {
    known.add(p.name);
    if (p.kind === "bool") bools.add(p.name);
  }
  if (t.image) {
    bools.add("image");
    known.add("image");
  }
  if (t.name === "upload_image") known.add("as");
  return { bools, known };
}

/** Map positionals/flags onto the tool's parameters, validating client-side. */
export function buildArgs(t: Tool, pa: Parsed): Record<string, unknown> {
  const args: Record<string, unknown> = {};
  const positional = t.params.filter((p) => p.pos);
  if (pa.pos.length > positional.length) {
    throw new UsageError(`unexpected argument ${JSON.stringify(pa.pos[positional.length])}\n${toolUsage(t)}`);
  }
  pa.pos.forEach((v, i) => (args[positional[i].name] = convert(positional[i], v)));
  for (const p of t.params) {
    if (p.name in pa.flags) {
      if (p.name in args) throw new UsageError(`${p.name} given twice`);
      args[p.name] = convert(p, pa.flags[p.name]);
    }
    if (!(p.name in args) && p.req) throw new UsageError(`missing ${p.name}\n${toolUsage(t)}`);
  }
  return args;
}

function uploadArgs(pa: Parsed): Record<string, unknown> {
  if (pa.pos.length !== 2) throw new UsageError("usage: dialogic editor upload_image PROJECT FILE [-as NAME]");
  const data = readFileSync(pa.pos[1]);
  return { project: pa.pos[0], filename: pa.flags.as || basename(pa.pos[1]), data_base64: data.toString("base64") };
}

export async function runTool(t: Tool, rest: string[]): Promise<void> {
  const { bools, known } = flagSet(t);
  let pa: Parsed;
  try {
    pa = parseArgs(rest, bools, known);
  } catch (e) {
    throw new UsageError(`${(e as Error).message}\n${toolUsage(t)}`);
  }
  if ("h" in pa.flags || "help" in pa.flags) {
    process.stdout.write(toolUsage(t));
    return;
  }
  const args = t.name === "upload_image" ? uploadArgs(pa) : buildArgs(t, pa);
  const out = pa.flags.o ?? "";
  if (t.image) {
    // CLI default is "no image": a terminal can't show it. -image or -o opts in.
    args.include_image = "image" in pa.flags || out !== "";
  }
  await invoke(t.server, t.name, args, out, pa.flags.raw === "true");
}

export async function invoke(server: "editor" | "play", name: string, args: Record<string, unknown>, out: string, raw: boolean): Promise<void> {
  const res = await McpClient.forServer(server).callTool(name, args);
  render(name, res, out, raw);
}

const IMG_EXT: Record<string, string> = { "image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp", "image/gif": ".gif" };

/** Print text/structured content to stdout, write images to files (reported on stderr). Tool errors throw. */
export function render(name: string, res: ToolResult, out: string, raw: boolean): void {
  const texts = (res.content ?? []).filter((c) => c.type === "text").map((c) => c.text ?? "");
  const images: McpContent[] = (res.content ?? []).filter((c) => c.type === "image");
  if (res.isError) throw new Error(texts.join("\n"));
  let body = texts.join("\n");
  if (!body && res.structuredContent !== undefined && res.structuredContent !== null) body = JSON.stringify(res.structuredContent);
  if (body) process.stdout.write(prettyJSON(body, raw) + "\n");
  images.forEach((img, i) => {
    const data = Buffer.from(img.data ?? "", "base64");
    const ext = IMG_EXT[img.mimeType ?? ""] ?? ".bin";
    let path = out;
    if (!path) path = `${name}-${Date.now()}${ext}`;
    else if (images.length > 1) path = out.slice(0, out.length - extname(out).length) + `-${i + 1}` + extname(out);
    writeFileSync(path, data);
    note(`saved image: ${path} (${data.length} bytes)`);
  });
}
