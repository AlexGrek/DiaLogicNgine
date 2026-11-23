---
tags: [scripting, hooks]
verified: 2026-11-23
sources: dialogic/src/game/HookScript.ts, dialogic/src/exec/HooksProcessor.ts, dialogic/src/exec/QuestProcessor.ts, dialogic/src/components/menuitems/scriptedit/HooksEditorTab.tsx
---
# Hooks (lifecycle scripts)

## What it is

A **hook** is a script that runs **by itself when something happens** in the game: a fact is learned, an item is
gained, a situation starts, a quest is completed. You attach the behaviour once and never have to remember to call it
from every place that can cause the event: "when the player gets the key, open the quest task".

## In the editor

**Scripting menu → Hooks.** **Add hook** creates one with:

| Field | Meaning |
|---|---|
| **Name** | a label for you (placeholder *e.g. on_secret_discovered*) |
| **Hook string** | which event it listens to, e.g. `FACTS::DISCOVERED::top_secret`; a picker helps you build it |
| **Body** | the script, opened in the [[Script editor]] ("Hook script editor") |

## In the JSON

```json
"hooks": [
  { "name": "Reward", "hook": "FACTS::DISCOVERED::gate_is_open", "body": "rt.props.gold += 25" }
]
```

## The events you can listen to

| Hook string | Fires when |
|---|---|
| `FACTS::DISCOVERED::<fact>` | the fact becomes known |
| `ITEMS::ACQUIRED::<item>` | the player's total of that item **went up** |
| `ITEMS::LOST::<item>` | the total **went down** |
| `SITUATION::STARTED::<situation>` / `SITUATION::ENDED::<situation>` | `state.situation` changed to / from it ([[Situations]]) |
| `QUEST::OPENED::<line>::<quest>`, `QUEST::COMPLETED::…`, `QUEST::FAILED::…` | a quest changes status |
| `TASK::OPENED::<line>::<quest>::<task>`, `TASK::COMPLETED::…`, `TASK::FAILED::…` | a task changes status |
| `QUESTLINE::OPENED::<line>`, `QUESTLINE::CLOSED::<line>` | a quest line opens or closes |

A misspelled hook string is **never an error — it just never fires**.

## At play time

Fact, item and situation hooks are found by **comparing the state before and after** an *action* script
([[Scripting overview]]): a window's `entryScript`, a link's `actionCode`, a location's `onEntryScript`, a zone click, a
quest script, or the use of an item. So:

* The hook runs **after that script has finished**, not at the line that caused it. Verified: a link whose `actionCode`
  added an item and then logged `S` produced the log `S` followed by the hook's `H`, then the destination's entry.
  The hook is therefore *between* the click's action and the arrival at the next window ([[Order of execution]]).
* Only the **net change** counts. Adding and then removing the same item in one script fires nothing.
* In one comparison, hooks run in this order: facts, then items, then situations (`ENDED` before `STARTED`).
* **Several hooks on the same string run one after another in no guaranteed order**; never make one depend on another.
* **Hooks do not trigger hooks.** If hook A learns fact B, B's hook does *not* run (verified: the fact was learned,
  its hook stayed silent). Put such chains in a single hook body.
* The hook body is an *action* script: its changes are kept; an exception stops the game.
* Quest and task hooks fire straight from the quest operation (after the quest/task's own `onOpen`/`onComplete`/`onFail` script) **(from source)**.
* Changes made inside *predicates and pickers* are discarded ([[Scripting overview]]), so they never cause hooks.

## Gotchas

* "Gain" is by **total quantity**: picking up a second copy of a stackable item fires `ACQUIRED` again.
* To set up an initial state use the start window's `entryScript`, not a hook.
* Hook strings are case-sensitive and use the item/fact/situation/quest **uid**.

See also: [[Functions]], [[The rt object]].
