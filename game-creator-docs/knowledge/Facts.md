---
tags: [knowledge, facts]
verified: 2026-11-24
sources: dialogic/src/game/Fact.tsx, dialogic/src/exec/Runtime.ts (RuntimeFact), dialogic/src/exec/HooksProcessor.ts, dialogic/src/components/menuitems/factsobjectives/FactsMenu.tsx, dialogic/src/components/player/GameMenuPanel.tsx
---
# Facts

## What it is

A **fact** is a piece of knowledge the player can learn: "the gate is open", "Mara owes money", "the code is 1991". A fact is either
**unknown** or **known**, and once known it stays known for the rest of the playthrough. Facts do three jobs:

1. **Conditions:** scripts ask `rt.facts.<uid>.known` to show a link, pick a text variant, enable a reaction and so on.
2. **The player's notebook:** every known fact appears in the in-game **Knowledge → Facts** tab with its short title and full text.
3. **Conversation topics:** a known, *discussable* fact can be asked about in a [[Character dialogs|character dialog]]
   ([[Discussion and reactions]]).

Use a fact rather than a boolean [[Props|prop]] when the player should *see* it or *ask about* it. Use a prop for hidden counters and switches.

## In the editor

Sidebar **Facts & Objectives**, then the **Facts** tab.

| Control | Meaning |
|---|---|
| create field + button | type a uid and create the fact (the uid is fixed afterwards) |
| fact card | shows the uid and the short text; click to edit |
| **short description** | the title shown in the Knowledge tab and in the topic picker |
| **full description** | the body shown when the player opens the fact; **markdown** is rendered |
| delete / done | as usual |

The **Lore** tab next to **Objectives** is an empty placeholder **(from source)**.

There is **no checkbox for `discussable`** in the editor **(from source)**. New facts are created discussable; to hide one from the topic
picker, set `"discussable": false` in the JSON ([[JSON import and export]], or `dialogic game get/put`).

## In the JSON

```json
"facts": [
  { "uid": "gate_is_open", "short": "The gate is open",
    "full": "Somebody left the **north gate** unlocked last night.", "discussable": true }
]
```

| Field | Meaning |
|---|---|
| `uid` | identity, and the name used in scripts: `rt.facts.gate_is_open`. Must be a JS identifier (letters, digits, `_`; no leading digit). |
| `short` | one-line title (notebook list, discussion topic) |
| `full` | notebook body, markdown |
| `discussable` | `false` keeps it out of the **Facts** topic tab (it still shows in the notebook) |

## At play time

### Learning a fact

The only way to learn a fact is a script: **`rt.facts.<uid>.know()`** (or the shortcut `facts.<uid>.know()`). Put it in a window's
`entryScript`, a link's `actionCode`, a quest script and so on. Calling it again does nothing.

**There is no "forget".** No script call removes a fact. Use a prop if something must become unknown again.

### Reading a fact

`rt.facts.<uid>.known` is `true` or `false`. In a predicate such as a link's `isVisible`:

```js
return rt.facts.gate_is_open.known
```

### What happens when a fact is learned

1. It is appended to `state.knownFacts`. The notebook lists facts **in the order they were learned**.
2. When the script finishes, the hook **`FACTS::DISCOVERED::<uid>`** fires ([[Hooks]]); verified.
3. **No toast is shown.** Learning a fact does not create a notification, unlike items and quests ([[In-game menu and notifications]]); from source.
4. The fact becomes a **Facts** topic in every character dialog if it is discussable.

Facts learned inside a **predicate** (`isVisible`, `isEnabled`, `chooseTextScript`…) are thrown away together with every other change that
predicate makes ([[Scripting overview]]). Learn facts in action scripts.

## In the player

**Menu → Knowledge** has two tabs, **Facts** and **People**. *Facts* lists the `short` texts; clicking one shows `full` rendered as
markdown. A fact uid that is no longer in the game (for example, deleted after the save was made) shows as *Error fact &lt;uid&gt;*.

## Scriptable properties

Facts have no script slots of their own. They are read and written from other scripts:

| Call | Kind | Effect |
|---|---|---|
| `rt.facts.<uid>.known` | read | true when learned |
| `rt.facts.<uid>.know()` | write | learns it, fires `FACTS::DISCOVERED::<uid>` |

## Gotchas

* `rt.facts.<typo>` is `undefined`, so `.known` on a misspelt uid **throws** and the whole script fails. The `game_json` validator and
  `dialogic scripts push` catch undeclared fact names.
* Renaming a fact's uid breaks every script, reaction trigger and hook that names it.
* Saves store fact **uids**. Deleting a fact leaves an *Error fact* entry in old saves.

See also: [[Known and visited]], [[Discussion and reactions]], [[The rt object]], [[Quests]].
