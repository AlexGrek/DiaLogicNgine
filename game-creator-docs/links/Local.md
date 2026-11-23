---
tags: [links, link-type]
sources: dialogic/src/exec/GameExecutor.tsx (goToLocalLink)
---
# Local

## What it is

The simplest link: go to another window **in the same dialog**. No stack changes. This is the everyday link for
moving through a scene.

## In the JSON

```json
{ "text": "Go to the kitchen", "mainDirection": { "type": "local", "direction": "kitchen" }, "alternativeDirections": [] }
```

`direction` is the target window's `uid`.

## At play time

The player's position becomes `{dialog: <same dialog>, window: <direction>}`; then the new window's entry runs
([[Turn lifecycle]]). The [[Navigation stack]] is untouched.

## Gotchas

* **It cannot leave its dialog.** The uid is looked up in the *current* dialog only. To reach another dialog use
  [[Push]], [[Jump]] or [[Reset jump]].
* An empty `direction` does nothing (the click is consumed and the window's entry runs again) **(from source)**.
* A uid that does not exist leads to an error screen.
* A local link to the *same* window is allowed and re-runs the window's entry **(from source)** — handy for "look again" loops, but
  remember [[Windows|entry scripts run every time]].

See also: [[Link types]].
