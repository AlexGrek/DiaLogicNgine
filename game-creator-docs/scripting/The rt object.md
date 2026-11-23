---
tags: [scripting, reference]
verified: 2026-11-23
sources: dialogic/src/exec/Runtime.ts, dialogic/src/components/common/code_editor/PopupCodeEditor.tsx (DEFAULT_ARGS)
---
# The `rt` object

Everything a script can see and change hangs off `rt`. The other names in scope (`props`, `ch`, `facts`, `objectives`,
`items`, `situation`, `state`, `context`) are shortcuts — `props` is `rt.props`, `items` is `rt.items`, and so on — so
write `rt.…` and you never need to think about them. What changes *stick* depends on the script's kind
([[Scripting overview]]).

| Member | What it is | Read | Write |
|---|---|---|---|
| `rt.props.<name>` | your game variables — [[Props]] | value, or the default if never set | `rt.props.gold += 5` |
| `rt.ch.<char>.<prop>` | per-character variables (character props and role props) | same | same |
| `rt.facts.<uid>` | a fact | `.known` → true/false | `.know()` learns it (no-op if already known) |
| `rt.items` | the inventory | `has(uid)`, `count(uid)`, `countTotal()`, `list()`, `listWithTag(tag)` | `add(uid, n=1)`, `remove(uid, n=1)` |
| `rt.objectives.<line>.<quest>.<task>` | quests | `.status`, tasks also `.isOpen` / `.isCompleted` / `.isFailed` | `.open()`, `.complete()`, `.fail()` (lines: `open()`/`close()`) |
| `rt.history` | what has already happened | see below | — |
| `rt.step` | the step counter | number | read-only |
| `rt.situation` | current situation name (or `undefined`) — [[Situations]] | read-only snapshot | set `state.situation = 'combat'` |
| `rt.general` | game info: `name`, `version`, `description`, `authors`, `extras` — [[Game metadata]] | frozen object | read-only (writes are silently ignored) |
| `context` | extra values for special calls | see below | — |
| `state` | the raw engine state | everything | **expert use only** |

## `rt.history`

| Call | Answers |
|---|---|
| `dialogVisited(dialog, window?)` | Has the player entered this window — or, with the dialog name only, **any** window of the dialog? |
| `visitedDialogs` | names of all visited dialogs |
| `visitedDialogWindows` | visited windows as `"dialog::window"` keys, in first-visit order |
| `locationVisited(loc)` | Has the player ever *stood in* this location? (stricter than "has seen it on a map") |
| `visitedLocations` | all visited locations, in first-visit order |
| `eventHappened(name)` | has this random event already happened? |
| `thisEventHappened(context)` | same for the event being evaluated (`thisEvent` is passed in `context`) |

(`locationVisited` and `visitedLocations` work but are missing from the editor's built-in object list.)

**Inside a window's own `entryScript`, the window you are entering is not yet counted as visited**, so
`rt.history.dialogVisited('main', 'kitchen')` in `kitchen`'s entry answers "have I been here *before*?" (verified:
first entry `false`, second entry `true`).

## `rt.step`

The step counter goes up by one for each link followed. Verified: an entry script that logs `rt.step` sees `0` on
the first entry and `1` after one link. The counter is bumped **after** the link's `actionCode` has run and **before** the
destination's entry, so `actionCode` sees the old number and the next window's `entryScript` the new one **(from source)**.
Paging through a window's text pages does not count.

## Inventory details

* `add` of an unknown item uid does nothing (a console error is logged) — no exception.
* A count below 1 counts as 1: `add('coin', 0)` adds **one**.
* Stackable items merge into one entry; **non-stackable** items become one entry per unit.
* `add` also queues the "item added" notification the player sees.
* `remove` of more than you carry removes what is there and stops.

## `context`

Not every script gets one; it is `undefined` otherwise.

| Script | `context` contains |
|---|---|
| a window's `entryScript` run because the player **used an item** on it | `usedItem` — the item's uid |
| an event's `canHappenScript` | `thisEvent` — the event's name |

## `state` — the raw engine state

`state.props`, `state.position`, `state.positionStack`, `state.knownFacts`… are all reachable and writable, because
scripts work on a copy that is kept for action scripts. The one documented use is **`state.situation = 'name'`**
(or `undefined`), which also fires the situation [[Hooks]]. Touching the position, stack or visited lists from a
script is unsupported and easy to get wrong; prefer links.

## Gotchas

* Names are **case-sensitive** and must match what you declared.
* `rt.facts.<uid>` for an undeclared fact is `undefined`, so `rt.facts.typo.known` throws.
* Writing to `rt.general` or `rt.step` has no effect.
