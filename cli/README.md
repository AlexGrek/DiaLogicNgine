# dialogic CLI

`dialogic` is the command-line tool for DiaLogicNgine games. It is written in TypeScript and
imports the real game model, migrations, sanity check and engine from `../dialogic/src`. With it you can:

* **verify** a game: static checks, the JSON schema, and missing images;
* **explore** a game automatically: random play-throughs that find script errors and dead ends;
* **debug and run** a game locally, with the Player MCP's own engine and no server;
* **inspect and refactor** the model: `ls`, `show`, `refs`, `graph`, `schema`, `rename`, `patch`;
* drive the editor and player **MCP tools** from a shell;
* move **whole games** (JSON and original-resolution images), clone them, and edit their scripts as `.js` files.

`dialogic help` prints the full command list.

## Build / install

Needs Node ≥ 22. The engine's own dependencies come from `../dialogic/node_modules`.

```bash
task install      # npm install + bundle → $(go env GOPATH)/bin/dialogic (or ~/.local/bin)
task test         # tsc + vitest
npm run build     # just dist/dialogic.mjs: one executable file, engine and schema embedded
```

## GAME: a file, a folder or a server project

The commands below take `GAME`, which is one of:

* a local `game.json`;
* a folder holding one (as written by `pull`). Its `images/` folder is used to check image references;
* a project name on the server. Reading it needs `login -user` unless the game is published. Saving
  it (`rename`, `patch`) needs the login.

## Verify

```bash
dialogic verify my_game.json -text          # human-readable; default output is JSON
dialogic verify my_game -strict             # exit 1 on warnings too
```

`verify` runs three groups of checks:

* **verify**: dangling uids in links, actors, stage, routes, reactions, events, zones and hooks;
  scripts that use undeclared props, facts, items, characters or quests; quest `path`s; duplicate
  ids; prop types; unreachable windows; dead ends; and a **syntax check of every script**, with the
  line number. These are ported from `.claude/skills/game_json/scripts/validate_game.py` into
  `dialogic/src/game/verify.ts`.
* **schema**: the migrated game against `backend/app/game_mcp/schema.json` (generated from the TS types).
* **sanity**: the editor's `runSanityCheck`. By default it reports only image files missing on the
  server or in `images/`; with `-all` it also reports its link checks.

Exit code 1 on errors. Skip parts with `-no-images` or `-no-schema`.

## Explore: automated play-throughs

```bash
dialogic explore my_game -runs 50 -steps 200 -text
```

`explore` plays random walks with the real engine (links, continue, routes, zones, discussions and
item use). It reports:

* script errors, with the moves and seed that reproduce them;
* dead ends;
* windows and locations no walk reached.

Reproduce a finding with the command it prints:

```bash
dialogic run my_game -seed 9 -moves "6; 0; 8; discuss char ada; 1"
```

## Debug and run locally

```bash
dialogic debug my_game                     # from the start
dialogic debug my_game -at loc:market -script "rt.items.add('key')"   # start anywhere with a prepared state
dialogic debug my_game -state saved.json   # resume a saved state
```

| Command | Does |
|---|---|
| `look` / `l` | show the screen: text, numbered links, routes, zones, topics, usable items, HUD |
| `N`, `c`, `go LOC`, `zone ID`, `discuss char\|fact\|item\|loc ID`, `use ITEM` | moves, with the same rules and errors as the Player MCP |
| `state [/ptr\|PROP]`, `set PTR VALUE`, `patch OPS` | read and write raw state (no hooks fire) |
| `rt <js>` | run a script with the real runtime (hooks and notifications fire) |
| `goto DIALOG/WINDOW\|loc:UID\|char:UID [-no-entry]` | teleport |
| `expect PTR=VALUE` | assertion |
| `trace on`, `watch PROP …`, `inspect SECTION` | see what each move changes |
| `undo`, `new`, `save FILE`, `load FILE`, `reload` | `reload` re-reads an edited game and keeps the state |

* **Piped input:** the REPL reads one command per line and writes one JSON object per line
  (`-text` for the readable view). It exits 1 if a command failed.
* **`run`** is the same thing in one command, for regression tests:
  ```bash
  dialogic run my_game -moves @smoke.moves -expect gold=10,/knownFacts/0=\"clue\"
  ```
  Moves are separated by `;` or newlines; `#` starts a comment. `run` exits 1 on an impossible
  move, a game error or a failed `expect`.
* **Engine:** the engine is the Player MCP's `GameSessionRunner` (`player-runner/src/session.ts`),
  on top of the shared turn logic in `dialogic/src/exec/PlayerTurn.ts`. The game behaves exactly as
  it does for the MCP, and almost exactly as in the web player.
* **Sandbox:** game scripts run in a `node:vm` context with no `require`, `process` or file access,
  and with a per-move time limit (`-timeout MS`, default 10000). A vm context is **not a security
  boundary**. For games you do not trust, use `-deno`, which runs the bundled Player MCP runner
  under Deno with zero permissions, as the server does. `-seed N` makes `Math.random` (events,
  text variants) reproducible; it works with the vm engine only.

## Inspect and refactor the model

```bash
dialogic ls my_game                        # name, startup, counts
dialogic ls my_game windows main -text     # also: dialogs chars locs props facts items quests events pac hooks functions roles meters situations images
dialogic show my_game char:ada             # definition + what it uses + what uses it
dialogic refs my_game fact:door_open       # every reference (links, triggers, hooks, quest paths, scripts)
dialogic graph my_game -dialog main        # mermaid (default), -format dot|json
dialogic schema Loc                        # fields of a model type; no argument lists the types
dialogic rename my_game char ada grace     # KIND: dialog window char loc item fact prop role pac situation eventhost questline quest task
dialogic rename my_game window main/start intro -dry-run
dialogic patch my_game ops.json            # RFC 6902 on the whole game, or @file / - (stdin)
```

* **References:** `REF` is `DIALOG/WINDOW`, `KIND:ID` (`char:`, `loc:`, `item:`, `fact:`, `quest:LINE/QUEST`, …),
  or a bare id when it is unambiguous.
* **`rename`** rewrites the definition and every reference to it. That includes `rt.props.X`,
  `rt.facts.X`, `rt.ch.X`, `rt.items.*('X')`, `rt.objectives.L.Q.T` and `state.situation = 'X'`
  inside scripts. It does not rewrite ids a script builds dynamically.
* **Saving:** `rename` and `patch` verify before and after, and refuse to save a change that
  introduces new errors (`-force` overrides; `-dry-run` saves nothing). They save to the file, or
  upload a server project.

## Credentials — two, because the backend has two doors

| Credential | Used by | Where it comes from |
|---|---|---|
| **MCP API key** | `editor`, `play`, `call`, `tools` | `MCP_API_KEYS` in the backend env (`{"user":"<secret>"}`, see `backend/server.md`) |
| **Account login** (username + password) | `pull`, `push`, `clone`, `game`, `assets`, `scripts`; the model commands on server projects | the web account; REST only accepts the session cookie |

```bash
dialogic login -server https://your-host -key "$KEY" -user alice   # prompts for the password
dialogic whoami
```

Stored in `~/.dialogic-cli.json` (0600). Env overrides: `DIALOGIC_URL`, `DIALOGIC_API_KEY`,
`DIALOGIC_USER` + `DIALOGIC_PASSWORD` (log in per command, for scripts), `DIALOGIC_CONFIG`.
Server precedence: `-server` → `DIALOGIC_URL` → saved config → `DIALOGIC_MCP_URL`.
There is no built-in default host.

## MCP tools, same names and parameters

Every tool of both servers is a subcommand; required parameters are positional, the rest are
flags (`snake_case` or `kebab-case` both work). `dialogic editor` / `dialogic play` list them,
`dialogic editor patch_field -h` shows one.

```bash
dialogic editor create_project my_game -title "My game"
REV=$(dialogic editor browse_field my_game dialog dialogs | jq -r .revision)
dialogic editor patch_field my_game dialog dialogs "$REV" @ops.json       # or inline JSON, or - for stdin
dialogic editor upload_image my_game ./room.jpg                           # -as NAME to rename
dialogic editor preview_image my_game room.jpg -o thumb.png

dialogic play start_game my_game                    # → session_code
dialogic play act SESSION choose_link 0
dialogic play act SESSION travel -target_id beach
dialogic play debug_start_game my_game -position '{"kind":"window","dialog":"main","window":"start"}'
dialogic play get_state SESSION -o scene.jpg        # image only with -image or -o
```

* Output is JSON on stdout (`-raw` = unformatted); notices go to stderr; tool errors exit 1.
* Play tools default to `include_image=false`; `-image` or `-o FILE` turns it on. The player MCP
  itself downsizes scene images to 1024 px — get originals with `assets pull`.
* `dialogic tools [editor|play]` diffs the server's live `tools/list` against the CLI's table.
  A tool the CLI doesn't know yet still works: `dialogic call play NEW_TOOL '{"k":"v"}'`.

## Whole game: download / upload / clone

```bash
dialogic pull my_game                 # → ./my_game/game.json + ./my_game/images/*  (originals, byte-exact)
dialogic push my_game                 # replaces the whole remote game + uploads images/*
dialogic push my_game -prune          # …and deletes remote images that are not in images/
dialogic push my_game -no-images      # game.json only   (-no-game: images only)

dialogic clone my_game my_game_copy [-title NAME]   # JSON + all images, byte-exact; refuses an existing target (-force)
dialogic game get my_game > game.json          # -compact for the server's exact bytes
dialogic game put my_game game.json
dialogic assets list my_game
dialogic assets pull my_game [names…] -o ./imgs
dialogic assets push my_game a.jpg b.png
dialogic assets delete my_game a.jpg
```

## Scripts as `.js` files

Every script in `game.json` (entry/action/visibility scripts, meter values, hooks, functions…) can be
edited as a plain JavaScript file with your own editor and tooling:

```bash
dialogic scripts dump my_game -o scripts      # → scripts/dialogs/main/windows/start/entryScript.js, scripts/functions/addHope/body.js, …
                                              #   plus scripts/scripts.json (pointer + hash of each script)
dialogic scripts list my_game                 # script paths without dumping
# …edit the .js files…
dialogic scripts status my_game -from scripts # M = modified, C = changed remotely since the dump
dialogic scripts push my_game -from scripts   # [-dry-run] [-force] [-no-check]
dialogic scripts set my_game hooks/Reward/body fix.js     # patch one script (or - for stdin)
```

* Files are named by `uid` / `id` / `name` (index when that is missing or not unique). A trailing newline added by
  an editor is ignored.
* `push` only touches scripts whose file changed, **refuses to overwrite a script that changed remotely since the
  dump** (`-force` overrides), and replaces nothing but the script strings; the rest of the game is re-saved as is
  (key order may change, content does not).
* Scripts are compiled (not run) before upload (function bodies use their own `args`); line numbers match the file.
* It edits existing script slots only; to add a new script to a window/link, patch the JSON first.

`push` and `game put` **overwrite** the remote game; they refuse a file without `engineVersion`.
Image names must be bare filenames with a png/jpg/webp/gif/svg extension.
