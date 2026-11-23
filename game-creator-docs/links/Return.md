---
tags: [links, link-type]
verified: 2026-11-23
sources: dialogic/src/exec/NavigationUtils.ts (backDestination), dialogic/src/exec/GameExecutor.tsx (goBack)
---
# Return

## What it is

Leave a conversation or a side scene and **go back to the enclosing character dialog, or else the current location**.
Where [[Pop]] steps back exactly one entry, `return` skips ahead to the nearest character conversation. It is meant
for the "Goodbye" link of a character dialog and the "Leave" link of scenes opened from a location.

## In the JSON

```json
{ "text": "Goodbye", "mainDirection": { "type": "return", "direction": "" }, "alternativeDirections": [] }
```

## At play time

The engine looks for the most recent **character dialog** in the [[Navigation stack]]:

1. If there is one, entries above it are discarded and the player is back in that conversation.
2. Otherwise, if the player is not currently in a character dialog, it goes to the character they were last talking to **(from source)**; and
3. otherwise to the **current location**.
4. If none of these exist, the click fails (below).

Verified:

* location `hall` → [[Talk to person]] `npc` → `return` → back in `hall`, stack `[]`;
* `npc` → [[Push]] window `q` → `return` in `q` → back in `npc`, with the entries below `npc` kept;
* location `hall` → push window `q` → `return` → back in `hall`.

**Return fails with "Attempt to pop while UI stack is empty"** when there is no conversation to return to and no
current location: e.g. a character dialog opened from a plain window, where the player has never been in a location
(verified). In such a game use [[Pop]], which takes the player back to that window.

With deeper nesting — e.g. stack `[hall, npc, q, r]` — `pop` returns to `r`'s caller while `return` unwinds to `npc`
**(from source)**.

## Gotchas

* Choose by what the player is leaving: one step back → [[Pop]]; leaving the whole conversation or scene → `return`.
* A game with no locations should use [[Pop]] for the "Goodbye" link of a character dialog.

See also: [[Talk to person]], [[To location]], [[Navigation stack]], [[Link types]].
