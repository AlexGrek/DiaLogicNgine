---
tags: [links, link-type]
verified: 2026-11-23
sources: dialogic/src/exec/GameExecutor.tsx (jumpLink)
---
# Jump

## What it is

Go to any window, in any dialog, **without recording a way back** and **without touching the stack**. Use it to
move to another dialog when you do not need to return, such as "chapter 2".

## In the JSON

```json
{
  "text": "Start chapter 2",
  "mainDirection": { "type": "jump", "qualifiedDirection": { "kind": "window", "dialog": "chapter2", "window": "start" } },
  "alternativeDirections": []
}
```

## At play time

The position changes and the target's entry runs. The [[Navigation stack]] stays exactly as it was (verified:
stack `[a]` before and after a jump from `c` to `d`; a later [[Pop]] returned to `a`).

## Gotchas

* "No way back" only means *this link* adds no return point. Entries pushed earlier are still on the stack. To
  forget them as well, use [[Reset jump]].
* [[Local]] is the same idea inside one dialog.

See also: [[Push]], [[Reset jump]], [[Link types]].
