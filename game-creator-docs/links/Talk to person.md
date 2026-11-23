---
tags: [links, link-type]
verified: 2026-11-23
sources: dialogic/src/exec/GameExecutor.tsx (goToCharDialog)
---
# Talk to person

## What it is

Open a **character's dialog** — the conversation screen of an NPC. Characters and their dialogs are documented in
their own notes (planned, see [[Home]]).

## In the JSON

```json
{ "text": "Talk to the neighbor", "mainDirection": { "type": "toperson", "direction": "baba_valya" }, "alternativeDirections": [] }
```

`direction` is a character uid. **That character must have a `dialog`** — a character without one cannot be talked to.

## At play time

* The current position is **added to the [[Navigation stack]]** (verified: from window `p`, the stack becomes `[p]`).
* The player moves to `{kind: "chardialog", char: <uid>}`; the character's dialog background replaces the current
  one (verified), and the character is recorded as *known*.
* The character's own links take over. Use [[Pop]] (back to the window you came from) or [[Return]] (back to the
  enclosing location) for "Goodbye".

## Gotchas

* A character with no `dialog` logs an error and the click does nothing **(from source)**.
* Every character dialog needs at least one link out.
* In a game without locations, [[Return]] on the character's "Goodbye" fails; use [[Pop]].

See also: [[To location]], [[Return]], [[Link types]].
