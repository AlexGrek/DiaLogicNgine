---
tags: [basics]
verified: 2026-11-23
sources: dialogic/src/game/Dialog.ts, dialogic/src/components/linkedit/LinkEditor.tsx, dialogic/src/components/LinksEditorPanel.tsx, dialogic/src/exec/GameExecutor.tsx
---
# Links

## What it is

A **link** is a button at the bottom of a [[Windows|window]]. Clicking it can run a script, then moves the player
somewhere (another window, a location, a character, or back). Links are the *only* way the story advances
(besides scripts and point-and-click zones).

A link has a **label** (what the button says), a **direction** (where it goes — see [[Link types]]), and optional
rules (when it is shown, when it can be clicked, what happens when it is clicked).

## In the editor

In the window drawer's **Links** column: **Create link** adds one, **Reorder** lets you drag links into a new
order. Each link opens an editor with:

| Part | What it does |
|---|---|
| **Answer text** | The button label. |
| **Category**, **Icon**, **Icon placement**, **Link color** | How the button looks ([[Home|visual styling is documented later]]). |
| **Direction** | The [[Link types|link type]] and its target. "Go to link" jumps to a local target. |
| **Scripting** | `actionCode`, `isVisible`, `isEnabled`. |
| **Misc** | *Change location* (background/context). |
| **Alternatives** | A second direction chosen by a condition. |

## In the JSON

```json
{
  "text": "Pay the 3 rubles",
  "mainDirection": { "type": "local", "direction": "v_pay" },
  "alternativeDirections": [],
  "actionCode": "addRub(-3); addHope(1)",
  "isVisible": "return rt.props.rubles >= 3"
}
```

| Field | Required | Meaning |
|---|---|---|
| `text` | yes | The label. Empty label + the window's only visible link ⇒ "click anywhere to continue" ([[Text and pages]]). |
| `mainDirection` | yes | `{ type, … }` — the [[Link types|type]] decides which other field holds the target. |
| `alternativeDirections` | yes | `[]` when unused. See *Alternatives* below. |
| `actionCode` | no | Script run **when the link is clicked, before moving**. |
| `isVisible` | no | Script returning true/false. **False ⇒ the link is not shown at all.** Default shown. |
| `isEnabled` | no | Script returning true/false. **False ⇒ shown greyed out, cannot be clicked.** Default enabled. |
| `isAlternativeLink`, `useAlternativeWhen` | no | Switch to an alternative direction — see below. |
| `changeLocationInBg` | no | Location uid that becomes the current location on click. |
| `category`, `categoryColor`, `iconId`, `iconPlacement` | no | Appearance. |
| `textProcessingCode` | no | Stored by the editor but **never run** by the engine. |

The conditions may return any value and are treated as true/false (`return 1` shows the link). **Forgetting `return` means false** (verified: `isVisible: "rt.props.n = 5"` hides the link). A condition that throws counts as false and the game carries on.

## Hidden vs disabled

Both limit what the player can do, but differently (verified):

* `isVisible` false → the link is **absent** from the window.
* `isEnabled` false → the link **is listed, marked disabled**.

Use *hidden* for options the player should not know exist; use *disabled* to show a locked option ("Pay the bribe — not enough rubles").

## Visited marker

For links that go to a window/location/character, the player is told whether that target was **already visited**,
so the UI can dim or tick "seen" options. It applies to [[Local]], [[Push]], [[Jump]], [[Reset jump]],
[[To location]] and [[Talk to person]] links, judged by the main direction only; [[Pop]], [[Return]] and
[[Quick reply]] are never "visited".

## Alternatives (one link, two destinations)

A link can switch destination depending on game state without two buttons. Set `isAlternativeLink: true`, add a
direction to `alternativeDirections`, and write `useAlternativeWhen` returning true/false:

```json
{
  "text": "Knock",
  "mainDirection": { "type": "local", "direction": "no_answer" },
  "isAlternativeLink": true,
  "useAlternativeWhen": "return rt.props.neighborHome",
  "alternativeDirections": [ { "type": "local", "direction": "door_opens" } ]
}
```

When the player clicks, `useAlternativeWhen` is evaluated; if true, **`alternativeDirections[0]`** is followed,
otherwise `mainDirection`. (Verified: with a counter ≤ 1 the link went to the main target, with it at 5 to the alternative.)
All three conditions are required: `isAlternativeLink`, a non-empty `alternativeDirections`, and a non-empty
`useAlternativeWhen`. Only the first alternative is ever used.

## What happens on a click

In order: `actionCode` → pick the direction (alternative or main) → move → entry of the destination.
Full sequence in [[Turn lifecycle]].

## Scriptable properties

In the editor these are under the link's **Scripting** panel (and **Alternatives** for `useAlternativeWhen`). Kinds are explained in [[Scripting overview]].

| Property | Kind | When it runs | Should return | Changes kept? | If it throws |
|---|---|---|---|---|---|
| `actionCode` | action | when the link is clicked, **before** the move | nothing | **yes** | error screen |
| `useAlternativeWhen` | condition | on click, after `actionCode` and before the move | true/false | **yes** *(verified)* | error is kept (from source) |
| `isVisible` | predicate | every time the window is drawn | true/false | no | counts as false |
| `isEnabled` | predicate | every time the window is drawn (only for visible links) | true/false | no | counts as false |
| `textProcessingCode` | — | **never** (stored, not executed) | — | — | — |

`actionCode` is where "this choice has a cost/effect" belongs: it runs exactly once per click. After it finishes, [[Hooks]] reacting to
what it changed (facts, items, situation) run, and only then does the move happen ([[Turn lifecycle]]).

## Gotchas

* **`actionCode` runs before the move**, so the destination's `entryScript` sees its effects (verified: a click that
  appends `A` and a destination whose entry appends `E` produce `…AE`).
* `isVisible` / `isEnabled` are re-evaluated every time the window is drawn, and **anything they change is discarded** (verified: `rt.props.n += 1` inside `isVisible` never took effect). Put changes in `actionCode`.
* A window needs at least one *visible* link or the player is stuck ([[Windows]]).
* Link order in the JSON is the on-screen order.
