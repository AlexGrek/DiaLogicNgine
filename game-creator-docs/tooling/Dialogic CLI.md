---
tags: [tooling, cli]
verified: 2026-11-24
sources: cli/ (src/main.ts, model.ts, debug.ts, refs.ts, scripts.ts, bulk.ts, tools.ts, README.md), dialogic/src/game/verify.ts, dialogic/src/exec/PlayerTurn.ts, .claude/skills/dialogic_cli/SKILL.md
---
# The `dialogic` CLI

## What it is

`dialogic` is a command-line tool for DiaLogicNgine games. It uses the same model, migrations, checks and engine as the editor, so
it understands your game rather than just copying it. With it you can:

* **check** a game for broken references, script mistakes and missing images (`verify`), and find runtime errors and dead ends
  by playing it automatically (`explore`);
* **play and debug** a game on your machine, without a server (`debug`, `run`);
* **inspect and refactor** the game (`ls`, `show`, `refs`, `graph`, `rename`, `patch`);
* do everything the [[MCP servers]] do from a shell, plus bulk work they can't: download and upload a **whole game and its
  original-resolution images**, **clone** a game, edit **scripts as `.js` files**.

Source and full reference: `cli/README.md` in the repository. Install with `cd cli && task install` (needs Node 22 or newer).

## Which game

Commands that take `GAME` accept:

* a local `game.json`;
* a folder holding one, as written by `dialogic pull`, with its `images/`;
* the name of a project on the server.

## Setup

```sh
dialogic login -server "$DIALOGIC_URL" -user <name> -password <pw> -key <mcp-api-key>
dialogic whoami
```

* The **account login** (user and password) powers the whole-game commands (`pull`, `push`, `clone`, `game`, `assets`, `scripts`)
  and reading or saving server projects in the commands below. Published games can be read without it.
* The **MCP API key** powers `editor`, `play`, `call` and `tools`. Keys are issued by the server operator (server env `MCP_API_KEYS`).
* Credentials are saved in `~/.dialogic-cli.json` (mode 0600). Environment variables override them: `DIALOGIC_URL`, `DIALOGIC_API_KEY`,
  `DIALOGIC_USER`, `DIALOGIC_PASSWORD`, `DIALOGIC_CONFIG`. A `-server` flag beats everything.
* Local files need no login at all.

## Commands

| Command | Does |
|---|---|
| `dialogic verify GAME [-text] [-strict]` | static checks ([[Sanity check]] and more), JSON schema, image files, script syntax; exit 1 on errors |
| `dialogic explore GAME [-runs N] [-text]` | random play-throughs: script errors, dead ends, windows never reached, each with the moves to reproduce it |
| `dialogic debug GAME [-at POS]` | play locally with a debugger: state, raw edits, `rt` scripts, teleport, trace, undo ([[Playtesting]]) |
| `dialogic run GAME -moves "…"` | play a list of moves and `expect` values: a regression test |
| `dialogic ls GAME [what]` | overview, or a list: dialogs, windows, chars, locs, props, facts, items, quests, events, pac, hooks, … |
| `dialogic show GAME REF` / `refs GAME REF` | one entity with what it uses and what uses it / every reference to it (`main/start`, `char:bob`, `loc:market`, `quest:main/first`) |
| `dialogic graph GAME [-dialog D]` | link graph as Mermaid (or `-format dot\|json`) |
| `dialogic rename GAME KIND OLD NEW` | rename a uid and every reference: links, triggers, hooks, quest paths and `rt.*` uses in scripts |
| `dialogic patch GAME OPS.json` | RFC 6902 edit of the whole game; refused if it introduces errors |
| `dialogic schema [TYPE]` | the fields of a model type |
| `dialogic pull GAME [-o DIR]` / `push GAME [-from DIR] [-prune]` | `game.json` + `images/` (originals) to a folder and back; `push` **replaces the whole game** |
| `dialogic clone SRC DST [-title NAME]` | full copy (JSON + images) into a new project, e.g. for a [[Localization\|translation]] |
| `dialogic game get` / `game put`, `dialogic assets list / pull / push / delete` | just the JSON ([[JSON import and export]]) / just images |
| `dialogic scripts dump / status / push / list / set` | every script as a readable `.js` file; upload edits (syntax- and conflict-checked) |
| `dialogic editor TOOL …` / `dialogic play TOOL …` / `tools` / `call` | any MCP tool, same names and parameters |

Output is JSON on stdout (add `-text` where offered for a readable form). Play commands omit scene images unless you pass `-image`.

## Typical workflows

**Edit as files:**
```sh
dialogic pull my_game && cd my_game
$EDITOR game.json                       # or have an AI rewrite it
dialogic verify . -text && dialogic explore . -text
dialogic push my_game
```

**Debug a scene:** `dialogic debug my_game -at main/door -script "rt.items.add('rusty_key')"`, then `use rusty_key`, `state /props`.
Edit `game.json` in another window and type `reload` to keep playing with the change.

**Rename safely:** `dialogic refs my_game char:bob`, then `dialogic rename my_game char bob robert -dry-run`, then without `-dry-run`.

**Work on scripts with syntax checking:**
```sh
dialogic scripts dump my_game -o scripts/
# edit scripts/*.js
dialogic scripts push my_game -from scripts/ -dry-run && dialogic scripts push my_game -from scripts/
```

**Translate:** `dialogic clone my_game my_game_ru -title "…"`, then `game get`, translate the texts, `game put` ([[Localization]]).

## Gotchas

* `push`, `game put`, and `rename` / `patch` on a server project overwrite the server copy. An editor tab that is still open has the
  **old** game; reload it before saving there, or it will overwrite your CLI changes ([[Saving and loading]]).
* `rename` cannot see ids that a script builds from strings (`rt.facts[name]`). Run `verify` and `explore` afterwards.
* The local player is the player MCP's engine. The web player shares the same turn rules, but animations, the typewriter and images
  exist only in the browser.
* `debug` runs game scripts in a sandbox that is not a hard security boundary; use `-deno` for games you do not trust.
* Image uploads through the CLI keep full resolution. The MCP's base64 `upload_image` is meant for small files.
* Never commit `~/.dialogic-cli.json` or put server URLs and keys in a game repository; use the environment variables.

See also: [[MCP servers]], [[JSON import and export]], [[Playtesting]], [[Sanity check]].
