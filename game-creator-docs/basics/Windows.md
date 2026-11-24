---
tags: [basics]
verified: 2026-11-23
sources: dialogic/src/game/Dialog.ts, dialogic/src/components/DialogWindowEditDrawer.tsx, dialogic/src/exec/GameExecutor.tsx
---
# Windows

## What it is

A **window** is one screen of the story: some text, an optional [[Backgrounds|background]], and the
[[Links|links]] the player can follow. Everything the player reads in a dialog happens in a window; following a
link moves them to another window.

## In the editor

Click a window in the [[Dialogs|dialog editor]] to open its drawer (the title is the window's uid; **Save**
closes it). The drawer has three columns:

| Column | Contents |
|---|---|
| **Related** | **Actor** (who is speaking, avatar), **Misc** (*Change location*, situation), **Technical info** (the window as JSON). |
| **Content** | **Text** ([[Text and pages]], [[Variants|text variants]]), **Background image** ([[Backgrounds]]), **Scripting** (`chooseText`, `chooseBackground`, `onEntry`). |
| **Links** | The window's [[Links]]: **Create link**, **Reorder**. |

At the top of the drawer, **Special display widget** swaps the text view for a point-and-click scene.

## In the JSON

```json
{
  "uid": "kitchen",
  "text": { "main": "One stove. Four families.\n---\nBaba Valya guards the meter.", "list": [] },
  "backgrounds": { "main": "kitchen.jpg", "list": [] },
  "tags": [],
  "specialWidget": null,
  "entryScript": "rt.props.visits += 1",
  "links": [
    { "mainDirection": { "type": "local", "direction": "start" }, "text": "Go back", "alternativeDirections": [] }
  ]
}
```

| Field | Required | Meaning |
|---|---|---|
| `uid` | yes | Name, unique within its dialog. Links refer to it. |
| `text` | yes | `{ main, list }` — see [[Text and pages]]. |
| `links` | yes | The buttons, in display order. `[]` makes a dead end. |
| `backgrounds` | yes | `{ "list": [] }` for none — see [[Backgrounds]]. |
| `tags` | yes | Free labels for you; the engine ignores them. |
| `specialWidget` | yes | `null` for a normal window, or `"pac::<scene id>"` for a point-and-click scene. |
| `entryScript` | no | Script run **every time the window is entered**. |
| `chooseTextScript` | no | Picks which text variant to show — see [[Variants]]. |
| `chooseBackgroundScript` | no | Picks which background variant to show — see [[Backgrounds]]. |
| `actor` | no | `{ "character": "<char uid>", "currentCharacter": false }` — who is speaking ([[Actors]]). |
| `changeLocationInBg` | no | A location uid that becomes the "current location" without moving the player there ([[Locations]]). |
| `changeSituation` | no | Stored by the editor but **not applied by the engine** — set `state.situation` from a script instead ([[Situations]]). |

## At play time

Entering a window (by any link, see [[Turn lifecycle]]) does, in this order: update the
[[Backgrounds|background]] → run `entryScript` → apply `changeLocationInBg` → mark the window *visited*. Then the
text and links are drawn.

* `entryScript` runs on **every** entry, not just the first. That includes coming back through a [[Pop]] and
  **a [[Quick reply]], which stays in the same window but still re-runs its entry script** (verified: a counter
  incremented by `entryScript` goes up after a quick reply). If a script should run once, guard it with a variable.
* "Visited" is recorded *after* the entry script, so the script can still tell a first visit from a return.
* A window with no visible link is a **dead end** — there is no built-in back button. End the story
  deliberately: give an ending window a link back to the start (a "play again" link), and reset your variables
  in the start window's `entryScript`.

## Scriptable properties

A window has three script slots. Their *kind* decides what they may do ([[Scripting overview]]); all are optional, and in the
editor they sit in the drawer's **Content → Scripting** panel as buttons named `chooseText`, `chooseBackground` and `onEntry`.

| Property | Kind | When it runs | Should return | Changes kept? | If it throws |
|---|---|---|---|---|---|
| `entryScript` | action | every time the window is entered — after the background update, before the window is marked visited | nothing | **yes** | error screen |
| `chooseTextScript` | picker | every time the window is drawn | a text variant name, index, or `null` for `main` ([[Variants]]) | no | `! ERROR: cannot find text identified by <false>` shown as the text |
| `chooseBackgroundScript` | picker | when the window is entered, **only if `backgrounds.main` is set** ([[Backgrounds]]) | a background variant name, index, or `null` | no | an `! ERROR:` string as the image *(from source)* |

Inside `entryScript` you can rely on (all verified):

* `state.background` already holds the **new** window's background;
* `rt.step` is already the new step number;
* `rt.history.dialogVisited(dialog, thisWindow)` is `false` the first time and `true` afterwards — the window is marked visited only after the script.

Use `entryScript` to set up the scene (reset variables, give a reward once, start a quest); use the pickers only to *choose*. Full ordering: [[Order of execution]].

## Gotchas

* Renaming a window's `uid` breaks every link and `startupDialog` that names it.
* A link whose target window does not exist leads to an error screen ("Cannot find UI widget…") **(from source)**; the editor's Sanity check lists such links.
* `entryScript` runs *before* the window is drawn, so what the player sees already reflects its changes.
