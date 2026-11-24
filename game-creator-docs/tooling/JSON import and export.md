---
tags: [tooling, json]
verified: 2026-11-24
sources: dialogic/src/components/menuitems/SaveLoadMenu.tsx, saveload/DownloadAsJson.tsx, saveload/UploadJson.tsx, dialogic/src/game/Patches.ts (loadJsonStringAndPatch), dialogic/src/game/GameDescription.ts (ENGINE_VERSION), .claude/skills/game_json/
---
# JSON import and export

## What it is

A whole game is **one JSON object** (`game.json`): every dialog, character, location, script and setting. Images are the only thing
stored outside it; they are referenced by file name. You can export that JSON, edit it as text (by hand, with scripts or with an AI),
and import it back. Every note in this vault shows the JSON for its feature.

## In the editor

Sidebar **Save / Load → Import / Export JSON**:

| Control | Does |
|---|---|
| **Download JSON** | downloads the current editor contents as `<project name>.json` |
| file picker (*Upload JSON*) | reads a `.json` file and **replaces the whole game in the editor** |

After an import, the game is only in the editor. **Save** it to the server ([[Saving and loading]]).

On import:

1. The file is parsed. A parse error shows *JSON parse error* and nothing changes.
2. The game is **migrated** to the current engine version by chained patches, based on its `engineVersion` (required; a file without it
   is rejected). Missing `visuals`, `hooks`, `functions`, `dev` and `general.name` are filled in.
3. A file without `dialogs` or `facts` is rejected as *Invalid game JSON*.

Images are **not** part of the JSON. Moving a game to another project needs its images too; use the CLI below.

## From the command line

The `dialogic` CLI ([[Dialogic CLI]]) moves JSON and images between your disk and the server directly, without the editor:

```sh
dialogic game get my_game -o game.json      # download game.json
dialogic game put my_game game.json         # replace it on the server
dialogic pull my_game -o ./my_game          # game.json + images/ (original resolution)
dialogic push my_game -from ./my_game       # upload both
dialogic clone my_game my_game_ru           # full copy, e.g. for a translation
```

Unlike the editor, `game put` and `push` write to the server immediately. Reload an open editor tab afterwards, or an editor save will
overwrite your change.

## Rules for hand-written JSON

* Keep **every top-level key** present, even as `[]`: `dialogs`, `chars`, `roles`, `locs`, `props`, `facts`, `items`, `objectives`,
  `events`, `eventHosts`, `situations`, `pacWidgets`, `uiElements`, `hooks`, `functions`, `translations`.
* New files: `"engineVersion": "0.21"`. **Do not raise the version of an old file by hand**; that skips the migrations it needs.
* Everything is linked by **uid strings**. A typo is not caught on import, only when a player walks into it. Validate before importing:
  ```sh
  python3 .claude/skills/game_json/scripts/validate_game.py game.json
  ```
  then run the in-editor [[Sanity check]], which also checks image files.
* The exhaustive field reference is the repo skill `game_json` (`references/schema.md`); this vault explains how each field is used.

See also: [[Game structure]], [[Saving and loading]], [[Localization]] (translating a copy).
