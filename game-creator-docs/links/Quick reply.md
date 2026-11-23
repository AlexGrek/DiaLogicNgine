---
tags: [links, link-type]
verified: 2026-11-23
sources: dialogic/src/exec/GameExecutor.tsx (quickReply)
---
# Quick reply

## What it is

A link that **does not move the player**. It replaces the window's text with a short reply while the player stays on the
same screen — for flavour answers, examining objects, brief reactions.

## In the JSON

```json
{ "text": "Ask about the draft", "mainDirection": { "type": "reply", "replyText": "\"Don't touch it. It's holding the wall up.\"" }, "alternativeDirections": [] }
```

`replyText` is the literal text to show (no variants, no scripts inside it).

## At play time

The position and [[Navigation stack]] are unchanged; the shown text becomes `replyText` (verified: the screen text
changed to the reply while the position stayed the same). The click's `actionCode` still runs first, so a quick reply
can also change state.

**The window's `entryScript` runs again** (verified: a counter incremented by the entry script went 1 → 2 after one
quick reply). That includes anything it resets or accumulates. Guard repeat-unsafe logic with a variable.

## Gotchas

* The reply lasts until the **next link click**: following any link clears it and the window's normal text returns **(from source)**.
* Because the entry re-runs, don't put "first time only" setup in a window that offers quick replies without a guard.
* For longer answers or new choices, make a real window and use [[Local]].

See also: [[Turn lifecycle]], [[Link types]].
