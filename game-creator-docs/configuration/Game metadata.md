---
tags: [configuration]
verified: 2026-11-23
sources: dialogic/src/game/GameDescription.ts (GeneralGameInfo, Config, StartMenuConfiguration, DevConfig), dialogic/src/components/menuitems/configuration/GeneralEditor.tsx, dialogic/src/components/player/MainMenuView.tsx, MenuTab.tsx, PlayerCore.tsx, dialogic/src/savegame/LocalStorageSavesManager.ts, dialogic/src/exec/Runtime.ts, backend/app/api/v1/projects.py
---
# Game metadata

## What it is

The facts *about* a game rather than inside its story: its title, version, authors, a short description and a cover picture.
Players, the public gallery, saved games and your own scripts all read them.

## In the editor

**Game configuration → About → Edit** opens a panel with:

| Field | Meaning |
|---|---|
| **name** | the game's title |
| **description** | a few sentences (multi-line box) |
| **version** | any text, e.g. `0.1.0` |
| **Authors** | a list of names |
| **Additional info** | free key → value pairs (text or numbers), e.g. `studio` → `Acme` |

The cover/background picture is separate: **Game configuration → Main menu → Menu background**.

## In the JSON

```json
"general": {
  "name": "Kommunalka 1991",
  "version": "0.1.0",
  "authors": ["root"],
  "description": "A short, bleak game about one winter day.",
  "extras": { "studio": "Acme", "build": 7 }
},
"startMenu": { "menuBackground": "room.jpg", "layout": "classic" }
```

## Where each piece shows up

| Field | Used for |
|---|---|
| `general.name` | the title on the start screen (falls back to *DiaLogicNgine* when empty), the About tab of the in-game menu, the gallery and project list title, **and the key under which saved games are stored** (see below) |
| `general.description` | start screen subtitle, in-game About tab, gallery card |
| `general.version` | `v0.1.0` on the start screen, in-game About tab, gallery metadata; also copied into saved state |
| `general.authors` | in-game About tab; "by …" on the gallery card |
| `general.extras` | nothing visible — meant for **scripts** (`rt.general.extras.<key>`) |
| `startMenu.menuBackground` | the start screen's picture, and the **cover image** on gallery cards and the project list |
| `startMenu.layout` | `classic` (centred title and buttons) or `mobile` (bottom-sheet menu with large touch targets; pair with the 9:16 stage in Visuals) |

### Reading metadata from scripts

`rt.general` gives scripts `name`, `version`, `description`, `authors` and `extras`. It is **read-only**: writing to it is silently ignored — no error,
the value just does not change (verified; `extras` values keep their number/text type). Handy for credits or "build 7" labels.

## The project id is not the game name

Two different names exist, and only one is editable in the game:

* the **project id** — the folder/URL name chosen when the game is created (`kommunalka_1991`). It is how links, `/play/<id>` URLs,
  the CLI and the MCP tools address the game, and it **cannot be renamed**;
* the **game name** (`general.name`) — the title people see.

When a game is copied (for example with `dialogic clone`), the copy keeps the original's `general.name` unless you set a new one
(`-title`), so two games can show the same title.

## What the platform records automatically

Every time the game is saved the server refreshes a small summary used by the project list and the public gallery: display name, authors,
description, version, cover image (`startMenu.menuBackground`), and counts of dialogs, characters and locations — plus owner, publish state and last-modified time.
You never edit these directly.

## Technical fields (not for authors)

| Field | Meaning |
|---|---|
| `engineVersion` | which engine format the file is in; **required**. Older files are migrated automatically when loaded. |
| `buildVersion` | free number; not read by the engine |
| `config.assetsPath` | present in every game; **not read anywhere** in the engine or editor |
| `dev.basicPromptSuffix` | appended to quick AI prompts in the editor (Developer / AI tab); no effect on play |

## Gotchas

* **Saved games are stored per game *name*, in the player's browser** (`savegame-<name>`). Consequences **(from source)**:
  * **Renaming a game hides the saves** made under the old name — they are not deleted, but the game no longer looks at them.
  * **Two games with the same `general.name` share one save storage** in a browser, so a save from one can be offered in the other.
    Always give a copy or translation its own name.
* The version field is informational: nothing in the engine compares it with a save **(from source)**, so a save made on an older version of your story can be
  loaded after you change windows, props or scripts; keep new versions compatible, or tell players to restart.
* An empty `general.name` shows the engine's own name and files saves under an empty key; always set one.

See also: [[Game configuration menu]], [[The rt object]], [[Localization]].
