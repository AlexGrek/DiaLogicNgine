---
name: dialogic_cli
description: Use the `dialogic` command-line client (cli/, Node/TypeScript) to verify, debug and play DiaLogicNgine games locally with the real engine, inspect and refactor the game model (ls/show/refs/graph/rename/patch), drive the editor and player MCPs from a shell, and pull/push/clone whole games with their original-resolution images. Use when checking a game for errors, playtesting or reproducing a bug without a server, renaming uids safely, uploading or downloading images or game.json, cloning or translating a game, or editing game scripts as .js files.
---

# `dialogic` CLI

A TypeScript CLI that imports the real game model, migrations, sanity check and engine from
`dialogic/src`. It does three jobs:

1. It knows the game: `verify`, `explore`, `ls`, `show`, `refs`, `graph`, `schema`, `rename`, `patch`.
2. It plays the game locally: `debug` (a REPL) and `run` (scripted moves). These run the same
   `GameSessionRunner` as the Player MCP, sandboxed, with no server needed.
3. It is a twin of the editor MCP (`/mcp`) and player MCP (`/play-mcp`), and it transfers whole games.

Source and the full reference are in `cli/` and **`cli/README.md`**. This skill says when and how
to reach for the CLI.

- For the game JSON shape, the UID graph and the scripting API, use the skill **`game_json`**.
- For MCP connection, OAuth and troubleshooting, use the user skill **`dialogic-mcp`**. The CLI
  mirrors the MCP tool names and parameters 1:1.
- For engine internals, use the skill **`game_engine`**. `exec/PlayerTurn.ts` is the turn logic
  shared by all three players.

## GAME arguments

The model commands take `GAME`, which is one of:

- a local `game.json`;
- a folder holding one (as written by `pull`), whose `images/` folder is used for image checks;
- a **project name** on the server. Reading it needs `login -user` unless the game is published.
  Saving it always needs the login.

## Typical loops

```bash
dialogic verify my_game -text              # static + schema + images; exit 1 on errors
dialogic explore my_game -runs 50 -text    # random play-throughs: script errors, dead ends, unreached windows
dialogic run my_game -seed 9 -moves "6; 0; 8; discuss char ada; 1"   # reproduce a finding
dialogic debug my_game -at lab/vault       # REPL; 'help' lists commands
```

Edit loop on local files:

```bash
dialogic pull P -o P
# edit P/game.json
dialogic verify P
dialogic debug P    # then 'reload' in the REPL
dialogic push P
```

Refactor safely:

```bash
dialogic refs P char:ada                   # every place that names it
dialogic rename P char ada grace           # links, triggers, hooks, quest paths, rt.* in scripts
dialogic rename P window lab/entrance hall -dry-run
dialogic patch P ops.json                  # RFC 6902 on the whole game; refused if it adds errors
```

## Debug REPL in brief

| Group | Commands |
|---|---|
| Moves | `N` (link), `c` (continue), `go LOC`, `zone ID`, `discuss TYPE ID`, `use ITEM` |
| State | `state [/ptr\|PROP]`, `set PTR VALUE` (no hooks fire), `rt <js>` (real runtime, hooks fire), `goto POS [-no-entry]` |
| Checks and tracing | `expect PTR=VALUE`, `trace on`, `watch gold`, `inspect objectives` |
| History and files | `undo`, `save`/`load FILE`, `reload` (re-reads the game and keeps the state) |

- When stdin is not a TTY, the REPL reads one command per line and writes one JSON object per line.
  Pass `-text` for the readable view instead.
- `POS` is `DIALOG/WINDOW`, `loc:UID` or `char:UID`.
- Game scripts run in a `node:vm` context with a per-move time limit (`-timeout`). That context is
  not a security boundary. Use `-deno` (zero permissions, as on the server) for games you do not trust.

## Use the CLI instead of the MCP when

| Need | Why |
|---|---|
| Check a whole game | The MCP has no validator. `verify` and `explore` do. |
| Reproduce or test a scene | `run`/`debug` are instant, local and reproducible (`-seed`). They also cover unpublished local files. |
| Upload or download images | The MCP's `upload_image` takes inline base64 and forces tiny images. The CLI keeps originals byte-exact. |
| Get or replace the whole `game.json` | The MCP only exposes 12 KB fragments of one field. |
| Clone or translate a game | Use `clone`, then `game get`, translate, `game put`. |
| Edit scripts with an editor | `scripts dump`, edit the `.js` files, `scripts push` (syntax-checked, conflict-guarded). |

## Install and log in

```bash
cd cli && task install       # npm deps + bundle → $(go env GOPATH)/bin/dialogic (or ~/.local/bin); Node ≥ 22
cd cli && task test          # tsc + vitest
dialogic login -server <URL> [-key MCP_API_KEY] [-user NAME]     # the password is prompted
dialogic whoami
```

There are two credentials:

- The **API key** (`MCP_API_KEYS` on the server) is used by `editor`, `play`, `call` and `tools`.
- The **account login** is used by `pull`, `push`, `clone`, `game`, `assets` and `scripts`, and by
  the model commands on server projects.

No host is built in. The server is chosen in this order: `-server`, then `DIALOGIC_URL`, then the
saved `~/.dialogic-cli.json`, then `DIALOGIC_MCP_URL`. Check `whoami` before logging in.

## Gotchas

- `push`, `game put`, `clone -force`, and `rename`/`patch` on a server project **replace** the
  remote game. An open editor tab must be reloaded before it saves.
- `rename` rewrites `rt.props.X`, `rt.facts.X`, `rt.ch.X`, `rt.items.*('X')`, `rt.objectives.A.B.C`
  and `state.situation = 'X'` in scripts. It does not rewrite ids that a script builds dynamically
  (`rt.facts[name]`). Run `verify` and `explore` afterwards.
- A local link inside a point-and-click zone resolves against the hosting dialog at runtime, so
  `verify` only warns about it.
- When the MCP gains a tool, add it to `cli/src/tools.ts`; `dialogic tools` shows the drift.
- `verify` mirrors `.claude/skills/game_json/scripts/validate_game.py` (port in `dialogic/src/game/verify.ts`);
  keep both in sync when the model changes.
