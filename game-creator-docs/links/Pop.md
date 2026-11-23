---
tags: [links, link-type]
verified: 2026-11-23
sources: dialogic/src/exec/NavigationUtils.ts (backDestination), dialogic/src/exec/GameExecutor.tsx (goBack)
---
# Pop

## What it is

Go **back one step** to the position that was saved by the last [[Push]] (or [[Talk to person]], or a location
link that stacked a window). It has no target field.

## In the JSON

```json
{ "text": "Back", "mainDirection": { "type": "pop", "direction": "" }, "alternativeDirections": [] }
```

## At play time

The top entry of the [[Navigation stack]] is removed and the player moves there; that position's entry runs again.
The position can be a window, a location or a character dialog.

Verified:

* push `a`→`c`, pop → back in `a`, stack `[]`;
* `a`→push→`c`→[[Jump]]→`d`, pop → back in `a` (jump did not disturb the stack);
* a character dialog opened with [[Talk to person]] from window `p`: pop → back in `p`.

**Pop on an empty stack is an error.** In a game made of windows, `pop` with nothing pushed fails with
`Attempt to pop while UI stack is empty` and the player does not move (verified, also after a [[Reset jump]]).
When the stack is empty the engine first tries a fallback — the character you are talking to, otherwise the current
location — and only errors if neither exists **(from source)**.

## Gotchas

* Only offer a pop in windows that are reachable through a push. If a window can be reached both ways, give the
  "back" button a [[Links|visibility script]] or use a [[Local]] link instead.
* Compare [[Return]], which goes back to the enclosing *conversation or location* rather than one step.

See also: [[Push]], [[Navigation stack]], [[Link types]].
