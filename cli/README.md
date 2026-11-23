# dialogic CLI

Command-line twin of the DiaLogicNgine **editor MCP** (`/mcp`) and **player MCP** (`/play-mcp`),
plus whole-game transfer: download/upload the full `game.json` and the full original-resolution
image set. Stdlib only (plus `x/term` for the password prompt).

Why it exists: pushing images through an LLM's `upload_image` call means the model retypes
megabytes of base64, so assets end up tiny and blurry. The CLI reads files from disk.

## Build / install

```bash
task install      # → $(go env GOPATH)/bin/dialogic
task test
```

## Credentials — two, because the backend has two doors

| Credential | Used by | Where it comes from |
|---|---|---|
| **MCP API key** | `editor`, `play`, `call`, `tools` | `MCP_API_KEYS` in the backend env (`{"user":"<secret>"}`, see `backend/server.md`) |
| **Account login** (username + password) | `pull`, `push`, `game`, `assets` | the web account; REST only accepts the session cookie |

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
* Scripts are syntax-checked with `node --check` before upload (function bodies use their own `args`); line numbers
  match the file. Skipped with a note when `node` is not installed.
* It edits existing script slots only; to add a new script to a window/link, patch the JSON first.

`push` and `game put` **overwrite** the remote game; they refuse a file without `engineVersion`.
Image names must be bare filenames with a png/jpg/webp/gif/svg extension.
