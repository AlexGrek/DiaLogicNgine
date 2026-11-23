---
tags: [characters]
verified: 2026-11-23
sources: dialogic/src/game/Character.ts (CharacterDialog), dialogic/src/exec/GameExecutor.tsx (goToCharDialog, executeEntry), dialogic/src/exec/RenderView.ts (renderCharDialog), dialogic/src/components/menuitems/charedit/CharDialogEditorDrawer.tsx, dialogic/src/components/player/CharDialogView.tsx
---
# Character dialogs

## What it is

A character's **dialog** is the screen the player sees when they *talk to* that character: the character's greeting text, a background, the buttons the
character offers, and a built-in **Discuss…** button to ask about things ([[Discussion and reactions]]). It is a third kind of *position* next to windows and
locations ([[Game structure]]).

## In the editor

On a [[Characters|character]] page press **Dialog…**. Tick **Dialog enabled** (once enabled it cannot be switched off from here). The drawer has:

| Part | What it is |
|---|---|
| **Display text** | the character's greeting, with text variants |
| **Background** | the picture, with variants |
| **Scripting** | `chooseTextScript`, `chooseBgScript` (+ `canHostEventsScript`) |
| **Events → Can host events** | stores event hosts — but see Gotchas: character dialogs never roll events |
| **Behavior** | the reactions and the "don't know" lines — [[Discussion and reactions]] |
| **Links** | buttons the character offers |

## In the JSON

```json
"dialog": {
  "text": { "main": "\"Fresh today,\" says the baker.", "list": [ { "name": "again", "text": "\"You again.\"" } ] },
  "chooseTextScript": "return rt.props.talked ? 'again' : null",
  "background": { "main": "bakery_counter.jpg", "list": [] },
  "eventHosts": null,
  "behavior": { "speakingModel": { "…": "…" }, "reactions": [ ] },
  "links": [
    { "text": "Listen to the gossip", "mainDirection": { "type": "reply", "replyText": "…" }, "alternativeDirections": [], "actionCode": "rt.facts.bread_rumour.know()" },
    { "text": "Leave", "mainDirection": { "type": "return", "direction": "" }, "alternativeDirections": [] }
  ]
}
```

## Opening and leaving  *(verified)*

* **Open** with a [[Talk to person]] link (from a window, a location, or another dialog). The current position is **pushed on the
  [[Navigation stack]]**, the short history is cleared, the dialog's background replaces the current one, and the character is marked **known**.
* A dialog has **no entry script.** To run code when the conversation starts, put it in the opening link's `actionCode`. The text picker
  `chooseTextScript` can vary the greeting but cannot change state.
* **Leave** with [[Pop]] (one step back, to wherever the player came from) or [[Return]] (back to the location; it works when the player came
  *through a location*, and fails with "stack is empty" if they came from a plain window and have never been in a location — [[Return]] explains).
* **Buttons** can be any [[Link types|link type]]. A [[Push]] to a window opens a longer scene about something; that window's [[Pop]] / [[Return]] brings the
  player back to the conversation (verified).
* A [[Quick reply]] shows the character's answer in place; it is cleared by the next click.
* Text is split into pages like a window's ([[Text and pages]]).

**Talking to a character without a dialog** does nothing: the click is consumed, the step counter goes up, and the player stays where they are
(verified). The editor does not warn about it.

## Scriptable properties

| Property | Kind | When | Returns | Changes kept? |
|---|---|---|---|---|
| `chooseTextScript` | picker | every draw | text variant | no |
| `chooseBgScript` | picker | when the dialog is opened | background variant | no |
| `canHostEventsScript` | predicate | never meaningful (see below) | — | no |
| link `actionCode`, `isVisible`, `isEnabled` | as for window links | | | [[Links]] |

## Gotchas

* **No random events in conversations.** Events are rolled only on arrival at a *location*. A character dialog can store event hosts, and an event targeting
  `char:<uid>` is accepted by the editor, but it never fires (verified: an event with 100 % probability targeting `char:npc` did not fire).
* Keep one **Leave** button in every dialog or the player is stuck.
* The greeting is the same every time unless a picker varies it: use a prop (`talked`) to vary it.
* To make the character react to news, use [[Discussion and reactions]] rather than many links.

See also: [[Characters]], [[Actors]], [[Return]], [[Pop]].
