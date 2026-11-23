---
name: dialogic_cli
description: Use the `dialogic` command-line client (cli/, Go) to drive the DiaLogicNgine editor and player MCPs from a shell, and to pull/push/clone whole games with their original-resolution images. Use when uploading or downloading images or game.json, cloning or translating a game, scripting edits/playtests, or when the MCP's base64 `upload_image` is too small or too slow.
---

# `dialogic` CLI

Go command-line twin of the editor MCP (`/mcp`) and player MCP (`/play-mcp`), plus whole-game
transfer. Source and full reference: `cli/` → **`cli/README.md`** (read it for flags and examples).
This skill only says *when* and *how to reach for it*; it does not cover authoring games.

- Game JSON shape, UID graph, scripting API, validator → skill **`game_json`**.
- MCP connection / OAuth / troubleshooting and the tool-by-tool workflow → user skill **`dialogic-mcp`**
  (the CLI mirrors those tool names and parameters 1:1).
- Backend routes and auth model the CLI talks to → `backend/server.md`.

## Use the CLI instead of the MCP when

| Need | Why the MCP is the wrong tool |
|---|---|
| Upload/download images | `upload_image` takes inline base64 through the model: retyped, error-prone, forces tiny blurry images. The CLI reads files from disk and keeps originals byte-exact. |
| Get/replace the whole `game.json` | MCP only exposes 12 KB fragments of one field at a time. |
| Clone or translate a game | `clone` copies JSON + images; then `game get` → edit → `game put`. |
| Edit game scripts in an editor / with JS tooling | `scripts dump` → edit `.js` → `scripts push` (syntax-checked, conflict-guarded). |
| Scripted/repeatable edits or playtests | Shell pipelines, `jq`, stdin/`@file` JSON. |

Keep using the MCP for interactive, schema-validated field edits when no files are involved.

## Install and log in

```bash
cd cli && task install        # builds and copies to $(go env GOPATH)/bin/dialogic  (task test for unit tests)
dialogic login -server <URL> [-key MCP_API_KEY] [-user NAME]     # password is prompted
dialogic whoami
```

Two credentials, because the backend has two doors:

- **API key** (`MCP_API_KEYS` on the server) → `editor`, `play`, `call`, `tools`.
- **Account username + password** → `pull`, `push`, `clone`, `game`, `assets` (REST accepts only the cookie session).

No built-in host exists, by design (repo rule: no deployment URLs in committed files). Server precedence:
`-server` → `DIALOGIC_URL` → saved `~/.dialogic-cli.json` → `DIALOGIC_MCP_URL`. Check what `whoami`
prints before logging in: an ambient env var can point you at the wrong server, and a login sends the password there.

## Commands at a glance

```bash
# MCP tools: same names/params as the servers; required params positional, the rest -flags
dialogic editor                         # list tools;  dialogic editor patch_field -h  for one
dialogic editor browse_field P dialog dialogs
dialogic editor patch_field P dialog dialogs "$REV" @ops.json     # inline JSON, @file or - (stdin)
dialogic play start_game P ; dialogic play act SESSION choose_link 0
dialogic play get_state SESSION -o scene.jpg                      # images only with -image or -o
dialogic call <editor|play> TOOL '{"k":"v"}'                      # raw call (tools newer than the CLI)
dialogic tools [editor|play]                                      # live tools/list vs the CLI's table

# whole games (REST)
dialogic pull P [-o DIR]                # DIR/game.json + DIR/images/*
dialogic push P [-from DIR] [-prune]    # overwrites the remote game
dialogic clone SRC DST [-title NAME]    # refuses an existing DST unless -force
dialogic game get P [-compact] | game put P FILE|-
dialogic assets list|pull|push|delete P ...    # push FILE -as NAME to rename

# scripts as .js files (see cli/README.md → Scripts)
dialogic scripts dump P -o DIR | list P | status P -from DIR | push P -from DIR [-dry-run] [-force] | set P PATH FILE|-
```

stdout is JSON; notices go to stderr; tool errors exit 1.

## Gotchas

- `push` / `game put` / `clone -force` **replace** the remote game. Refuses files without `engineVersion`. Pull first if unsure.
- Image fields in game JSON are bare filenames; upload under the exact name referenced (and extension — it is preserved).
  Allowed: png, jpg/jpeg, webp, gif (svg via REST only).
- The player MCP downsizes scene images to 1024 px in its output; `assets pull` returns the true originals.
- Play tools default to `include_image=false` in the CLI (the MCP default is true).
- `scripts push` only changes existing script slots, and refuses a script changed remotely since the dump (re-dump or `-force`).
- `patch_field` needs the field's current `revision`; "Field changed" means re-browse.
- A game saved with `game put` is not schema-validated by the REST route (the MCP's `patch_field` is). After a hand
  edit, validate with `game_json`'s `scripts/validate_game.py` and start a game to confirm.
- When the MCP gains a tool, add it to the table in `cli/tools.go`; `dialogic tools` shows the drift.
