# Game Creator Docs

A markdown vault that explains **every feature of DiaLogicNgine from the game creator's point of view**:
what a thing is, which fields it has, how to set it up in the editor, how to write it in the game JSON,
and what it does at play time.

Open this folder as a vault in [Obsidian](https://obsidian.md) (notes use `[[wikilinks]]`), or read it as
plain markdown. Start at **[[Home]]**.

## How every note is built

| Section | Meaning |
|---|---|
| **What it is** | One-paragraph definition. |
| **In the editor** | Where to click. Panel and button names are copied from the editor source. |
| **In the JSON** | The exact shape in `game.json` (valid, copy-pasteable). |
| **At play time** | What the engine actually does, in order. |
| **Gotchas** | Things that surprised somebody. |

Front matter on each note:

* `sources` — the code the note was written from, so a maintainer can re-check it when that code changes.
* `verified` — the date its *behavioural* claims were checked by playing a probe game against the real engine
  (not just read from code). A claim marked **(from source)** was read from code but not played.

## Scope and conventions

* Audience: people **making** games, not engine developers. Engine internals live in the repo skill `game_engine`.
* The JSON is the literal serialization of `dialogic/src/game/*.ts`; the exhaustive field reference is the repo's
  `game_json` skill (`references/schema.md`). These notes explain *use*, that reference lists *every field*.
* Scripts are JavaScript function bodies; they have their own notes under `scripting/` — start with [[Scripting overview]]. Each feature note ends with a **Scriptable properties** table when it has script slots.
* No deployment URLs or credentials belong in this vault.

## Adding or changing a note

1. Read the code named in the note's `sources`; change the note when that code changes.
2. For behaviour, play it (a throwaway game via the `dialogic` CLI or MCP: `debug_start_game` +
   `debug_read_state` make this cheap) and bump `verified`.
3. Link related notes with `[[wikilinks]]`; keep one feature per note, and add it to the coverage map in [[Home]].
