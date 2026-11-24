---
tags: [publishing, saves]
verified: 2026-11-24
sources: dialogic/src/components/menuitems/SaveLoadMenu.tsx, SaveLoadJsonDrawer.tsx, dialogic/src/api/projectsApi.ts, dialogic/src/savegame/LocalStorageSavesManager.ts, dialogic/src/components/player/PlayerCore.tsx, MenuTab.tsx, dialogic/src/components/SidePanel.tsx
---
# Saving and loading

There are two kinds of saving. Keep them apart:

| | What is saved | Where | Who |
|---|---|---|---|
| **Your game** (the project) | the whole game definition, `game.json`, plus images | on the server | you, the author |
| **A playthrough** (savegame) | one player's state: position, props, items, facts, quests… | in that player's **browser** | every player |

## Saving your game (the editor)

The editor keeps your work **in the browser tab** while you edit. **Nothing is sent to the server until you save** (from source):

* Sidebar **Save / Load → Current project → Name → Save** uploads the whole game to the server under that name. Saving under a new name
  makes a **new project** (a "save as"); images are not copied with it.
* Leaving with **Home** asks *"Any unsaved changes will be lost. Go to the home page?"*. Closing or reloading the tab loses unsaved work
  without asking.
* **Images are different**: they are uploaded to the server the moment you add them, before any save.

Also on the **Save / Load** page:

| Section | Does |
|---|---|
| **Server projects** | your projects on the server; **Load** opens one (replacing what is in the editor) |
| **Local saves** (*read-only*) | projects stored in the browser by very old editor versions. Load them, then save to the server. |
| **Import / Export JSON** | **Download JSON** of the whole game, or upload a `.json` file ([[JSON import and export]]) |

A loaded game is migrated to the current engine version automatically ([[Game metadata]]).

## Playthrough saves (the player)

Players save from **Menu → Menu** in the game ([[In-game menu and notifications]]). Saves are grouped:

| Group | Made | Kept |
|---|---|---|
| **AUTO** | after **every** player action | the latest one plus the one before it |
| **QUICK** | **never**: the group exists, but nothing in the player creates quick saves (from source) | (the last 4) |
| manual | **Save** with an optional name (default: today's date) | all, newest first |

Each save card shows its name, how long ago it was made and the step number, with **Load** and **Delete** (delete asks to confirm).
**New game** restarts from the startup window, but **without running that window's entry script** (from source; the start menu and
the editor's **Restart** do run it). If your opening `entryScript` sets things up (props, quests, items), a player who restarts from the
in-game menu misses them. Keep opening set-up in prop defaults, or move it to the second window.

Where saves live **(from source)**:

* In the player's browser, under the **game's name** (`general.name`). See [[Game metadata]] for the consequences: renaming the game
  hides old saves, and two games with the same name share saves.
* The editor's **Play** page, the public `/play/<project>` page and the gallery use **the same storage**. Your own test saves show up
  when you open the published game in the same browser.
* A save is the raw engine state. It survives story edits, but it can point at windows, items or facts you have since renamed or deleted;
  those show as errors or *UNKNOWN* entries ([[Facts]], [[Items and inventory]]).
* Clearing the browser data deletes the saves. There is no cloud save. (The MCP player keeps its own server-side sessions; see
  [[MCP servers]].)

## Gotchas

* Saving in the editor is manual. Save often, or work with the CLI/MCP, which write to the server directly ([[Dialogic CLI]]).
* "Save as" (a new name) does not copy images; use `dialogic clone` for a full copy.
* Loading a project replaces the editor contents without asking.

See also: [[Publishing and sharing]], [[Game metadata]], [[Playtesting]].
