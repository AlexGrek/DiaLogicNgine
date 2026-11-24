---
tags: [tooling, testing]
verified: 2026-11-24
sources: dialogic/src/components/player/Player.tsx, dialogic/src/exec/PlayerTurn.ts, cli/src/debug.ts, StateDisplayDrawer.tsx, StateEditor.tsx, GoToPickerDrawer.tsx, backend/app/play_mcp/*, cli/
---
# Playtesting

Ways to try your game while you build it, from quickest to most thorough.

## The editor's Play page

Sidebar **Play** runs the current editor contents. Saving is not needed, because it plays what is in the tab. Above the stage:

| Button | Does |
|---|---|
| **Restart** | a fresh state at the startup window, entry script included |
| **State** | the **State editor** drawer: view and change everything in the live state |
| **Go to** | jump to any **Dialog window**, **Location** or **Character dialog** |

**State editor** sections: *Position & navigation* (current position, position stack and history, dialog page), *Location & character*,
*Props* (typed inputs), *Knowledge* (known facts, people and places; visited dialogs and locations; happened events), *Inventory*,
*Quest progress* (open, completed and failed quests and tasks, quest lines), *Notifications*, *Short history*, and *Advanced* (engine and
game versions, step count, fatal error).

* State-editor changes are **raw**: no hooks fire, no toasts, no entry scripts (from source).
* **Go to** teleports and clears the [[Navigation stack]]. It does **not run** the target's entry script or roll [[Random events]]. To
  test an entry script, go to the window *before* it and click through.
* Saves made on the Play page share storage with the published game ([[Saving and loading]]).

## Local debug player (no server)

The `dialogic` CLI ([[Dialogic CLI]]) runs the **same engine as the player MCP** on your machine, against a local `game.json`, a folder
from `dialogic pull`, or a project on the server. Nothing has to be published or uploaded.

```sh
dialogic debug my_game                          # interactive: numbered links, routes, zones, HUD; type 'help'
dialogic debug my_game -at loc:market -script "rt.items.add('rusty_key')"   # start anywhere, prepared
```

| In the REPL | Does |
|---|---|
| `0`, `c`, `go market`, `zone door`, `discuss fact clue`, `use rusty_key` | play a move (same rules and errors as the MCP) |
| `state /props`, `set money 50`, `rt rt.facts.clue.know()` | read state; raw edit (no hooks); script through the real runtime (hooks fire) |
| `goto main/door`, `goto loc:market -no-entry` | teleport, with or without the entry script |
| `trace on`, `watch money`, `inspect objectives` | see what every move changed |
| `undo`, `save f.json` / `load f.json`, `reload` | step back; keep states; re-read the game after editing it and keep playing |
| `expect money=50` | assertion |

Two batch tools build on it:

* **`dialogic run`** plays a list of moves and checks expectations: a regression test for a scene. It exits 1 on a failed move, a
  script error or a failed `expect`.
  ```sh
  dialogic run my_game -moves "0; c; go market; use rusty_key; expect door_open=true"
  ```
* **`dialogic explore`** plays dozens of random walks and reports script errors, dead ends and windows no walk reached. Each problem
  comes with the exact `dialogic run -seed … -moves …` line that reproduces it.

Game scripts run in a sandbox with a time limit, so an endless loop is stopped. For games you did not write, add `-deno` to run
them with no permissions at all.

## Agent / command-line testing

The player MCP has debug tools for **your own** projects ([[MCP servers]]), also available as `dialogic play …` ([[Dialogic CLI]]):

| Tool | Use |
|---|---|
| `debug_start_game` | a new session at any `position`, with RFC 6902 `operations` on the raw state and/or a `script` run through the real runtime (fires hooks and toasts) |
| `act` | one player move: `choose_link`, `continue`, `travel`, `click_zone`, `discuss`, `use_item` |
| `debug_read_state` | read any state value by JSON pointer (`/props/money`, `/progress`, `/carriedItems`…) |
| `debug_edit_state` | change state, run a script, or teleport an existing session |
| checkpoints | `save_checkpoint` / `load_checkpoint`, plus the previous autosave for a one-step undo |

Typical loop: change the game → `debug_start_game` right before the scene under test with the state it needs → `act` → assert with
`debug_read_state`. A session keeps the game version it started with; start a new one after editing.

Example (CLI):

```sh
dialogic play debug_start_game my_game -position '{"kind":"window","dialog":"main","window":"door"}' \
  -script "rt.items.add('rusty_key')"
dialogic play act <session> use_item -target_id rusty_key
dialogic play debug_read_state <session> -path /props
```

Every behaviour marked *verified* in this vault was checked this way.

## Static checks

* [[Sanity check]] in the editor: dangling links, missing windows and missing image files.
* **`dialogic verify GAME -text`** checks more: quest paths, unreachable windows, dead ends, undeclared props, facts, items and quests
  used in scripts, the syntax of every script, the JSON schema, and image files. Exit code 1 on errors, so it fits a pre-push hook.
* `dialogic scripts push` syntax-checks every edited script before uploading.

See also: [[Order of execution]], [[The rt object]].
