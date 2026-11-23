---
tags: [links, link-type]
verified: 2026-11-23
sources: dialogic/src/exec/GameExecutor.tsx (jumpLink with reset)
---
# Reset jump

## What it is

Like [[Jump]], but it also **empties the [[Navigation stack]]**: a point of no return. Use it for chapter changes,
endings, and "restart" links — anywhere old return points must stop working.

## In the JSON

```json
{
  "text": "Live this day again",
  "mainDirection": { "type": "resetjump", "qualifiedDirection": { "kind": "window", "dialog": "main", "window": "start" } },
  "alternativeDirections": []
}
```

## At play time

The stack is emptied, the player moves to the target, and the target's entry runs. Verified: after
`push c` then `resetjump e`, the stack is `[]` and a [[Pop]] in `e` errors.

## Gotchas

* It clears only the stack. It does **not** reset variables, items or visited marks; reset those in the target's
  `entryScript` if you are building a restart.
* Don't put a [[Pop]] link in a window you reach with a reset jump.

See also: [[Jump]], [[Navigation stack]], [[Link types]].
