---
tags: [basics]
sources: dialogic/src/game/Dialog.ts, dialogic/src/components/DialogEditor.tsx, dialogic/src/components/CreateWindowButton.tsx
---
# Dialogs

## What it is

A **dialog** is a named container of [[Windows|windows]] — a scene, a chapter, a conversation. It has exactly two
properties: a `name` and a list of `windows`. It is purely organisational: the engine does not treat a dialog
specially while playing, but the *name* is how windows in other dialogs find yours.

## When to split a story into several dialogs

* Each chapter, scene or self-contained conversation gets its own dialog, so the window list stays readable.
* [[Local]] links only reach windows **inside the same dialog**. Moving to another dialog needs [[Push]],
  [[Jump]] or [[Reset jump]], which name the target dialog explicitly.
* A small game (like a one-day story) fits in a single dialog, usually called `main`.

## In the editor

Open the dialog editor. The left panel lists the dialogs ("Select dialog in the left panel" until you pick one);
selecting a dialog shows its windows. Use the **Create window** field to add a window by typing its uid. Click a
window to open its editor drawer — see [[Windows]]. A graph view of the dialog's windows is also available.

## In the JSON

```json
"dialogs": [
  { "name": "main", "windows": [ { "uid": "start", "...": "..." }, { "uid": "kitchen", "...": "..." } ] }
]
```

## Gotchas

* **`name` is the identity.** `startupDialog`, [[Push]]/[[Jump]]/[[Reset jump]] links and event links refer to it.
  Renaming a dialog silently breaks all of them.
* Window uids only need to be unique *inside* their dialog; two dialogs may both have a window called `start`.
* An empty dialog is legal but unplayable if `startupDialog` points into it.
