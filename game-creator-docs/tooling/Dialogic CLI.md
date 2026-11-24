---
tags: [tooling, cli]
verified: 2026-11-24
sources: cli/ (main.go, tools.go, bulk.go, scripts.go, README.md), .claude/skills/dialogic_cli/SKILL.md
---
# The `dialogic` CLI

## What it is

`dialogic` is a command-line client for the DiaLogicNgine server. It does everything the [[MCP servers]] do, plus bulk work they can't:
download and upload a **whole game and its original-resolution images**, **clone** a game, and edit **scripts as `.js` files**. It is
the fastest way to work on a game with your own editor, git, scripts or an AI agent.

Source and full reference: `cli/README.md` in the repository (build with `cd cli && go build`, or `task install`).

## Setup

```sh
dialogic login -server "$DIALOGIC_URL" -user <name> -password <pw> -key <mcp-api-key>
dialogic whoami
```

* The **account login** (user and password) powers the whole-game commands: `pull`, `push`, `clone`, `game`, `assets`, `scripts`.
* The **MCP API key** powers `editor`, `play`, `call` and `tools`. Keys are issued by the server operator (server env `MCP_API_KEYS`).
* Credentials are saved in `~/.dialogic-cli.json` (mode 0600). Environment variables override them: `DIALOGIC_URL`, `DIALOGIC_API_KEY`,
  `DIALOGIC_USER`, `DIALOGIC_PASSWORD`, `DIALOGIC_CONFIG`. A `-server` flag beats everything.

## Commands

| Command | Does |
|---|---|
| `dialogic pull GAME [-o DIR]` | `game.json` + `images/` (originals) → a folder |
| `dialogic push GAME [-from DIR] [-prune]` | folder → server; **replaces the whole game**. `-prune` deletes server images missing locally. |
| `dialogic clone SRC DST [-title NAME]` | full copy (JSON + images) into a new project, e.g. for a [[Localization|translation]] |
| `dialogic game get GAME` / `game put GAME FILE` | just the JSON ([[JSON import and export]]) |
| `dialogic assets list / pull / push / delete` | just images; `push FILE -as NAME` renames on upload |
| `dialogic scripts dump GAME [-o DIR]` | every script in the game as a readable `.js` file, plus `scripts.json` (the map) |
| `dialogic scripts status` / `scripts push [-dry-run]` | what you changed; upload the edits (syntax-checked with `node --check`, conflict-checked against the server) |
| `dialogic scripts list GAME` / `scripts set GAME PATH FILE` | list script paths; patch one script |
| `dialogic editor TOOL …` / `dialogic play TOOL …` | any MCP tool, same names and parameters (`dialogic editor TOOL -h` shows them) |
| `dialogic tools [editor\|play]` / `dialogic call …` | live tool list; raw JSON call |

Output is JSON on stdout. Play commands omit scene images unless you pass `-image` (`-o FILE` saves them).

## Typical workflows

**Edit as files:**
```sh
dialogic pull my_game && cd my_game
$EDITOR game.json                       # or have an AI rewrite it
python3 <repo>/.claude/skills/game_json/scripts/validate_game.py game.json
dialogic push my_game
```

**Work on scripts with syntax checking:**
```sh
dialogic scripts dump my_game -o scripts/
# edit scripts/*.js
dialogic scripts push my_game -from scripts/ -dry-run && dialogic scripts push my_game -from scripts/
```

**Translate:** `dialogic clone my_game my_game_ru -title "…"`, then `game get`, translate the texts, `game put` ([[Localization]]).

**Test a scene:** see [[Playtesting]].

## Gotchas

* `push` and `game put` overwrite the server copy. An editor tab that is still open has the **old** game; reload it before saving there,
  or it will overwrite your CLI changes ([[Saving and loading]]).
* Image uploads through the CLI keep full resolution. The MCP's base64 `upload_image` is meant for small files.
* Never commit `~/.dialogic-cli.json` or put server URLs and keys in a game repository; use the environment variables.

See also: [[MCP servers]], [[JSON import and export]], [[Playtesting]].
