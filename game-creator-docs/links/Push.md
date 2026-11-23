---
tags: [links, link-type]
verified: 2026-11-23
sources: dialogic/src/exec/GameExecutor.tsx (pushLink)
---
# Push

## What it is

Go to a window (possibly in another dialog) **and remember where you came from**, so a [[Pop]] link there brings the
player back. Think "open a side scene".

## In the JSON

```json
{
  "text": "Look at the notice board",
  "mainDirection": { "type": "push", "qualifiedDirection": { "kind": "window", "dialog": "side", "window": "board" } },
  "alternativeDirections": []
}
```

## At play time

1. The current position is added to the [[Navigation stack]].
2. The player moves to the target; its entry runs.
3. A [[Pop]] link in the target (or in anything reached from it by [[Local]] or [[Jump]]) returns to the pushed position.

Verified: pushing from `a` to `c` leaves the stack `[a]`; a `pop` in `c` returns to `a`, empties the stack, and **runs
`a`'s entry script again** (a counter it increments goes 1 → 2).

## Gotchas

* The target can be in any dialog but must be the full `{kind, dialog, window}` object.
* Each push needs a matching pop, or the stack keeps growing; a [[Reset jump]] or [[To location]] clears it.
* The window you return to is *entered again*: its entry script runs and a window with a `main` background re-applies it.

See also: [[Pop]], [[Jump]], [[Navigation stack]], [[Link types]].
