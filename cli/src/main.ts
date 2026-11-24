import { readFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { join } from "node:path";
import { UsageError, flagOn, parseArgs, parseFor, readText } from "./args";
import { assetDelete, assetList, assetPut, assetsPull, assetsPush, clone, gameGet, gamePut, pull, push } from "./bulk";
import { apiKey, configFile, loadConfig, saveConfig, serverURL } from "./config";
import { cmdDebug, cmdExplore, cmdRun } from "./debug";
import { McpClient } from "./mcp";
import { cmdGraph, cmdLs, cmdPatch, cmdRefs, cmdRename, cmdSchema, cmdShow, cmdVerify } from "./model";
import { each, note, writeAtomic } from "./out";
import { Rest, restLogin } from "./rest";
import { scriptsDump, scriptsList, scriptsPush, scriptsSet, scriptsStatus } from "./scripts";
import { TOOLS, findTool, invoke, runTool, toolList } from "./tools";

declare const __CLI_VERSION__: string | undefined;

export const USAGE = `dialogic — DiaLogicNgine games from the command line: edit, verify, debug, play

Setup (credentials are stored in ~/.dialogic-cli.json, mode 0600):
  dialogic login [-server URL] [-key MCP_API_KEY] [-user NAME] [-password PW]
  dialogic whoami
    The API key (server env MCP_API_KEYS) powers 'editor', 'play' and 'call'.
    The account login (username+password) powers 'pull', 'push', 'game', 'assets', 'scripts'
    and reading/saving server projects in the model commands below.
    Env: DIALOGIC_URL (or DIALOGIC_MCP_URL), DIALOGIC_API_KEY, DIALOGIC_USER,
         DIALOGIC_PASSWORD, DIALOGIC_CONFIG.

GAME below is a local game.json, a folder holding one (as written by 'pull'), or a
project name on the server.

Check a game (no server needed for local files):
  dialogic verify GAME [-strict] [-text] [-all] [-no-images] [-no-schema]
      static checks (dangling uids, scripts using undeclared props/facts/items/quests,
      quest paths, unreachable windows, dead ends, script syntax) + JSON schema +
      missing image files. Exit 1 on errors (and on warnings with -strict).
  dialogic explore GAME [-runs 50] [-steps 200] [-seed N] [-at POS] [-no-topics] [-text]
      random play-throughs with the real engine: script errors, dead ends, windows
      never reached; every problem comes with the moves that reproduce it.

Play and debug locally (the Player MCP's engine, in a sandbox):
  dialogic debug GAME [-at POS] [-state FILE] [-script JS|@file] [-no-entry] [-seed N] [-timeout MS] [-deno] [-json|-text]
      interactive player + debugger (type 'help'); JSON lines when stdin is not a TTY.
      POS: DIALOG/WINDOW, loc:UID, char:UID. -deno runs the engine under Deno with no permissions.
  dialogic run GAME -moves "c; 0; go market; rt rt.items.add('key'); expect gold=5" | -moves @file
      [-at POS] [-state FILE] [-seed N] [-expect PTR=VAL,...] [-text]
      scripted play-through for regression tests; exit 1 on a failed move or expectation.

Understand and edit the model:
  dialogic ls GAME [dialogs|windows [DIALOG]|chars|locs|props|facts|items|quests|events|pac|hooks|functions|roles|meters|situations|images] [-text]
  dialogic show GAME REF          one entity + what it uses + what uses it
                                  REF: DIALOG/WINDOW, char:UID, loc:UID, item:UID, quest:LINE/QUEST, …
  dialogic refs GAME REF          every reference to an entity
  dialogic graph GAME [-dialog NAME] [-format mermaid|dot|json]
  dialogic schema [TYPE]          field reference of the game model
  dialogic rename GAME KIND OLD NEW [-dry-run] [-force]
                                  rename a uid everywhere (links, paths, hooks, scripts), then verify
  dialogic patch GAME OPS.json|@file|- [-dry-run] [-force]
                                  RFC 6902 on the whole game; refused if it adds errors

MCP tools — same names and parameters as the MCP servers
(snake_case or kebab-case; positionals are the required parameters, rest are -flags):
  dialogic editor [TOOL ARGS]     editor MCP (/mcp)
  dialogic play   [TOOL ARGS]     player MCP (/play-mcp)
  dialogic <editor|play> TOOL -h  parameters of one tool
  dialogic tools [editor|play]    live tools/list from the server
  dialogic call <editor|play> TOOL [JSON|@file|-]    raw call with a JSON arguments object

Whole-game transfer (REST, owner login):
  dialogic pull PROJECT [-o DIR] [-no-game] [-no-images]    game.json + images/ → DIR (default ./PROJECT)
  dialogic push PROJECT [-from DIR] [-no-game] [-no-images] [-prune]
  dialogic clone SRC DST [-title NAME] [-force]
  dialogic game get PROJECT [-o FILE] [-compact] | game put PROJECT FILE|-
  dialogic assets list|pull|push|delete PROJECT … [-o DIR] [-as NAME]
  dialogic scripts dump PROJECT [-o DIR]       every script → readable .js files + scripts.json
  dialogic scripts list PROJECT | status PROJECT [-from DIR]
  dialogic scripts push PROJECT [-from DIR] [-dry-run] [-force] [-no-check]
  dialogic scripts set PROJECT PATH FILE|-

Play tools default to no image (a terminal can't show one); add -image, or -o FILE
to save it. Output is JSON on stdout; messages go to stderr.
`;

async function prompt(label: string, secret: boolean): Promise<string> {
  process.stderr.write(label);
  if (secret && process.stdin.isTTY) {
    return new Promise((resolve) => {
      const stdin = process.stdin;
      stdin.setRawMode(true);
      stdin.resume();
      let s = "";
      const onData = (buf: Buffer) => {
        for (const ch of buf.toString("utf8")) {
          if (ch === "\r" || ch === "\n") {
            stdin.setRawMode(false);
            stdin.pause();
            stdin.off("data", onData);
            process.stderr.write("\n");
            resolve(s);
            return;
          }
          if (ch === "\u0003") process.exit(130);
          if (ch === "\u007f") s = s.slice(0, -1);
          else s += ch;
        }
      };
      stdin.on("data", onData);
    });
  }
  const rl = createInterface({ input: process.stdin, terminal: false });
  for await (const line of rl) {
    rl.close();
    return line.trim();
  }
  return "";
}

async function cmdLogin(args: string[]): Promise<void> {
  const pa = parseFor(args, { values: ["server", "key", "user", "password"] });
  const cfg = loadConfig();
  let base: string;
  try {
    base = serverURL(cfg, pa.flags.server ?? "");
  } catch {
    base = (await prompt("Server URL: ", false)).replace(/\/+$/, "");
    if (!base) throw new Error("a server URL is required");
  }
  cfg.server = base;
  let key = pa.flags.key ?? "", user = pa.flags.user ?? "", password = pa.flags.password ?? "";
  if (!key && !user) {
    key = await prompt("MCP API key (blank to skip): ", true);
    user = await prompt("Account username (blank to skip): ", false);
  }
  if (user && !password) password = process.env.DIALOGIC_PASSWORD || (await prompt("Password: ", true));
  const problems: string[] = [];
  if (key) {
    cfg.key = key;
    try {
      await new McpClient(`${base}/mcp`, key).callTool("list_projects");
      note("API key OK");
    } catch (e) {
      problems.push(`API key rejected: ${(e as Error).message}`);
      cfg.key = "";
    }
  }
  if (user) {
    try {
      cfg.token = await restLogin(base, user, password);
      cfg.user = user;
      note(`logged in as ${user}`);
    } catch (e) {
      problems.push((e as Error).message);
    }
  }
  if (problems.length && !cfg.key && !cfg.token) throw new Error(problems.join("\n"));
  saveConfig(cfg);
  note(`saved to ${configFile()}`);
  if (problems.length) throw new Error(problems.join("\n"));
}

async function cmdWhoami(): Promise<void> {
  const cfg = loadConfig();
  const base = serverURL(cfg);
  console.log(`server:  ${base}`);
  const key = apiKey(cfg);
  if (!key) {
    console.log("api key: not set");
  } else {
    try {
      const res = await new McpClient(`${base}/mcp`, key).callTool("list_projects");
      let total = 0;
      try {
        total = JSON.parse(res.content?.[0]?.text ?? "{}").total ?? 0;
      } catch {
        /* older servers */
      }
      console.log(`api key: OK (${total} projects)`);
    } catch (e) {
      console.log(`api key: set, but failing: ${(e as Error).message}`);
    }
  }
  let r: Rest;
  try {
    r = await Rest.connect();
  } catch {
    console.log("session: not logged in");
    return;
  }
  try {
    const me = await r.json<{ username: string }>("GET", "/auth/me");
    console.log(`session: logged in as ${me.username}`);
  } catch (e) {
    console.log(`session: stored but failing: ${(e as Error).message}`);
  }
}

async function cmdTools(args: string[]): Promise<void> {
  const servers = args.length ? [args[0]] : ["editor", "play"];
  for (const s of servers) {
    if (s !== "editor" && s !== "play") throw new UsageError("usage: dialogic tools [editor|play]");
    const live = await McpClient.forServer(s).listTools();
    console.log(`${s}:`);
    const onServer = new Set(live.map((t) => t.name));
    for (const t of live) console.log(`  ${t.name}${findTool(s, t.name) ? "" : "   (not in this CLI's table — use `dialogic call`)"}`);
    for (const t of TOOLS) if (t.server === s && !onServer.has(t.name)) console.log(`  ${t.name}   (in this CLI but not on this server — version skew)`);
  }
}

async function cmdCall(args: string[]): Promise<void> {
  const pa = parseArgs(args, new Set(["raw"]), new Set(["o", "raw"]));
  if (pa.pos.length < 2 || pa.pos.length > 3 || (pa.pos[0] !== "editor" && pa.pos[0] !== "play")) {
    throw new UsageError("usage: dialogic call <editor|play> TOOL [JSON|@file|-]");
  }
  let a: Record<string, unknown> = {};
  if (pa.pos.length === 3) {
    try {
      a = JSON.parse(readText(pa.pos[2]));
    } catch (e) {
      throw new UsageError(`arguments must be a JSON object: ${(e as Error).message}`);
    }
  }
  await invoke(pa.pos[0], pa.pos[1], a, pa.flags.o ?? "", flagOn(pa, "raw"));
}

async function cmdGame(args: string[]): Promise<void> {
  const usage = "usage: dialogic game get PROJECT [-o FILE] [-compact] | game put PROJECT FILE|-";
  if (args.length < 2) throw new UsageError(usage);
  const pa = parseFor(args.slice(1), { bools: ["compact"], values: ["o"] });
  const r = await Rest.connect();
  if (args[0] === "get") {
    if (pa.pos.length !== 1) throw new UsageError(usage);
    const data = await gameGet(r, pa.pos[0], flagOn(pa, "compact"));
    if (pa.flags.o) writeAtomic(pa.flags.o, data);
    else process.stdout.write(data);
    return;
  }
  if (args[0] === "put") {
    if (pa.pos.length !== 2) throw new UsageError(usage);
    await gamePut(r, pa.pos[0], pa.pos[1] === "-" ? readFileSync(0, "utf8") : readFileSync(pa.pos[1], "utf8"));
    note("game replaced");
    return;
  }
  throw new UsageError(`unknown game subcommand "${args[0]}"`);
}

async function cmdAssets(args: string[]): Promise<void> {
  const u = "usage: dialogic assets list|pull|push|delete PROJECT ...";
  if (args.length < 2) throw new UsageError(u);
  const pa = parseFor(args.slice(1), { values: ["o", "as"] });
  const [project, ...names] = pa.pos;
  if (!project) throw new UsageError(u);
  const r = await Rest.connect();
  switch (args[0]) {
    case "list":
      for (const n of await assetList(r, project)) console.log(n);
      return;
    case "pull":
      return assetsPull(r, project, pa.flags.o || join(project, "images"), names);
    case "push":
      if (!names.length) throw new UsageError("usage: dialogic assets push PROJECT FILE ... [-as NAME]");
      if (pa.flags.as) {
        if (names.length !== 1) throw new UsageError("-as works with exactly one file");
        return assetPut(r, project, names[0], pa.flags.as);
      }
      return assetsPush(r, project, names, false);
    case "delete":
      if (!names.length) throw new UsageError("usage: dialogic assets delete PROJECT NAME ...");
      return each(names, (n) => assetDelete(r, project, n));
  }
  throw new UsageError(u);
}

async function cmdScripts(args: string[]): Promise<void> {
  const u = "usage: dialogic scripts dump|list|status|push|set PROJECT ...";
  if (args.length < 2) throw new UsageError(u);
  const pa = parseFor(args.slice(1), { bools: ["force", "dry_run", "no_check"], values: ["o", "from"] });
  const project = pa.pos[0];
  if (!project) throw new UsageError(u);
  const dir = pa.flags.o || pa.flags.from || `${project}-scripts`;
  const r = await Rest.connect();
  switch (args[0]) {
    case "dump":
      note(`dumped ${await scriptsDump(r, project, dir)} script(s) → ${dir}`);
      return;
    case "list":
      return scriptsList(r, project);
    case "status":
      return scriptsStatus(r, project, dir);
    case "push":
      return scriptsPush(r, project, dir, flagOn(pa, "force"), flagOn(pa, "dry_run"), flagOn(pa, "no_check"));
    case "set":
      if (pa.pos.length !== 3) throw new UsageError("usage: dialogic scripts set PROJECT PATH FILE|-");
      return scriptsSet(r, project, pa.pos[1], pa.pos[2] === "-" ? readFileSync(0, "utf8") : readFileSync(pa.pos[2], "utf8"), flagOn(pa, "no_check"));
  }
  throw new UsageError(u);
}

/** Run one CLI invocation; resolves to the process exit code. */
export async function run(argv: string[]): Promise<number> {
  if (argv.length === 0 || ["help", "-h", "--help"].includes(argv[0])) {
    process.stdout.write(USAGE);
    return 0;
  }
  if (argv[0] === "version" || argv[0] === "-version" || argv[0] === "--version") {
    console.log(typeof __CLI_VERSION__ === "string" ? __CLI_VERSION__ : "dev");
    return 0;
  }
  const [cmd, ...rest] = argv;
  switch (cmd) {
    case "login":
      await cmdLogin(rest);
      return 0;
    case "whoami":
      await cmdWhoami();
      return 0;
    case "editor":
    case "play": {
      if (!rest.length) {
        process.stdout.write(`dialogic ${cmd} tools:\n${toolList(cmd)}`);
        return 0;
      }
      const t = findTool(cmd, rest[0]);
      if (!t) throw new UsageError(`unknown ${cmd} tool "${rest[0]}" (try \`dialogic ${cmd}\`; \`dialogic tools ${cmd}\` lists what the server has)`);
      await runTool(t, rest.slice(1));
      return 0;
    }
    case "tools":
      await cmdTools(rest);
      return 0;
    case "call":
      await cmdCall(rest);
      return 0;
    case "pull": {
      const pa = parseFor(rest, { bools: ["no_game", "no_images"], values: ["o"] });
      if (pa.pos.length !== 1) throw new UsageError("usage: dialogic pull PROJECT [-o DIR] [-no-game] [-no-images]");
      await pull(await Rest.connect(), pa.pos[0], pa.flags.o || pa.pos[0], !flagOn(pa, "no_game"), !flagOn(pa, "no_images"));
      return 0;
    }
    case "push": {
      const pa = parseFor(rest, { bools: ["no_game", "no_images", "prune"], values: ["from"] });
      if (pa.pos.length !== 1) throw new UsageError("usage: dialogic push PROJECT [-from DIR] [-no-game] [-no-images] [-prune]");
      await push(await Rest.connect(), pa.pos[0], pa.flags.from || pa.pos[0], !flagOn(pa, "no_game"), !flagOn(pa, "no_images"), flagOn(pa, "prune"));
      return 0;
    }
    case "clone": {
      const pa = parseFor(rest, { bools: ["force"], values: ["title"] });
      if (pa.pos.length !== 2) throw new UsageError("usage: dialogic clone SRC DST [-title NAME] [-force]");
      if (pa.pos[0] === pa.pos[1]) throw new Error("source and destination are the same project");
      await clone(await Rest.connect(), pa.pos[0], pa.pos[1], flagOn(pa, "force"), pa.flags.title ?? "");
      return 0;
    }
    case "game":
      await cmdGame(rest);
      return 0;
    case "assets":
      await cmdAssets(rest);
      return 0;
    case "scripts":
      await cmdScripts(rest);
      return 0;
    case "verify":
    case "check":
      return cmdVerify(rest);
    case "explore":
      return cmdExplore(rest);
    case "debug":
      return cmdDebug(rest);
    case "run":
      return cmdRun(rest);
    case "ls":
      await cmdLs(rest);
      return 0;
    case "show":
      await cmdShow(rest);
      return 0;
    case "refs":
      await cmdRefs(rest);
      return 0;
    case "graph":
      await cmdGraph(rest);
      return 0;
    case "schema":
      await cmdSchema(rest);
      return 0;
    case "rename":
      return cmdRename(rest);
    case "patch":
      return cmdPatch(rest);
  }
  throw new UsageError(`unknown command "${cmd}" (dialogic help)`);
}
