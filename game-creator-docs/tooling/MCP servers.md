---
tags: [tooling, mcp, ai]
verified: 2026-11-24
sources: backend/app/game_mcp/, backend/app/play_mcp/, backend/server.md
---
# MCP servers

## What it is

The server exposes two **MCP** (Model Context Protocol) endpoints, so AI agents such as Claude can build and play games:

| Server | Path | For |
|---|---|---|
| **Editor MCP** | `/mcp` | create projects; browse, read and patch any part of a game; images |
| **Player MCP** | `/play-mcp` | play games turn by turn; saves and checkpoints; debug tools for your own games |

Both are on the same host as the editor. In shared configuration, refer to the host through an environment variable (for example
`${DIALOGIC_MCP_URL}/mcp` and `${DIALOGIC_MCP_URL}/play-mcp` in an MCP client config) rather than writing the address in.

**Sign-in:** OAuth in the agent (it opens an approval page that asks for your MCP key; editor and player need **separate** sign-ins), or
an `X-API-Key` header for scripts. The [[Dialogic CLI]] uses the key.

## Editor MCP

| Tool | Use |
|---|---|
| `list_projects`, `create_project` | your projects; a new **empty** project (never overwrites) |
| `editor_planes` | how the game is split into editable fields (`dialogs`, `chars`, `locs`, `facts`, `items`, `visuals`, …) |
| `browse_field`, `read_fragment` | look at a field by JSON pointer; returns a **revision** |
| `patch_field` | atomic JSON-Patch (RFC 6902) on one field, given that revision; validated against the schema |
| `editor_help` | built-in reference: `schema`, `link` and `script` topics |
| `list_images`, `preview_image`, `upload_image`, `delete_image` | project images (`upload_image` takes base64; use the CLI for big files) |

Workflow: browse → patch with the revision → if *Field changed*, browse again and retry. Build in dependency order (characters, locations,
facts and items → dialogs → `startupDialog` → `general`). A new project's `startupDialog` is empty; set it to
`{"kind": "window", "dialog": "…", "window": "…"}` or the game cannot start.

Patches are saved on the server immediately. Reload an open editor tab before saving there ([[Saving and loading]]).

## Player MCP

Playable: every **published** game plus your own unpublished ones ([[Publishing and sharing]]).

| Tool | Use |
|---|---|
| `list_available_games`, `list_saved_games`, `list_recently_played`, `list_sessions` | find games and sessions |
| `start_game`, `resume_session`, `get_state` | a session runs the real engine; each turn is autosaved on the server |
| `act` | one move: `choose_link`, `continue`, `travel`, `click_zone`, `discuss`, `use_item` |
| `inspect` | inventory, facts, people, places, objectives, history, summary |
| `view_image` | scene, avatar, item, route, or an annotated PAC scene |
| `save_checkpoint`, `list_checkpoints`, `load_checkpoint`, `delete_checkpoint`, `delete_session` | named saves |
| `debug_start_game`, `debug_read_state`, `debug_edit_state` | **own games only**: start anywhere with a prepared state, read and edit raw state ([[Playtesting]]) |

Player MCP sessions are stored on the server and are separate from the browser saves of the web player.

## Gotchas

* A running session keeps the game it started with; start a new session after editing.
* The player MCP runs its own build of the engine. After an engine fix, the server must be redeployed (or its `player-runner` bundle
  rebuilt) before MCP sessions see the fix.
* Tool lists are fetched when the agent connects; restart the agent session after the server gains new tools.

See also: [[Dialogic CLI]], [[AI helpers]], [[JSON import and export]].
