---
tags: [quests, objectives]
verified: 2026-11-24
sources: dialogic/src/game/Objectives.ts, dialogic/src/exec/QuestProcessor.ts, dialogic/src/exec/Runtime.ts (RuntimeObjective*), dialogic/src/components/menuitems/objectives/*, dialogic/src/components/player/ObjectivesTab.tsx
---
# Quests (objectives)

## What it is

Quests give the player a to-do list in the **Journal**. There are three levels:

```
quest line   "Main story"                 (a group: a chapter, a character's arc)
 └─ quest    "Get a ration card"          (what the Journal lists)
     └─ task "Talk to the house manager"  (the steps, in order)
```

Every quest, task and line has a status: **untouched**, **open**, **completed** or **failed** (lines: untouched, open or *closed*).
**Nothing happens on its own.** Your scripts open, complete and fail things, and the engine cascades the consequences (below).

## In the editor

Sidebar **Facts & Objectives**, then the **Objectives** tab.

1. Create a **quest line** with a uid, then open it. The page shows its **Name** and two panels:
   * **Quest editor**: pick a quest from the drop-down, then edit its **Name**, its task list (**Add task**, reorder with the arrows,
     delete) and open a task's **Edit task** drawer;
   * **Quest generator**: a wizard that creates a whole quest at once (name and uid → describe the tasks → check the generated task uids →
     **Create quest**). It is a form, not AI.
2. **Edit task**: the text, the uid (**Generate UID** makes one from the text), **is critical (failure will fail the quest)**, and
   **Scripting** buttons for `autoCheckScript`, `onComplete` and `onFail`.

**Quest-level scripts (`onOpen`, `onComplete`, `onFail`) have no editor controls**; write them in the JSON (from source). Task
`autoCheckScript` has a button but **never runs** (see Gotchas).

## In the JSON

```json
"objectives": [
  { "uid": "main", "name": "Main story", "tags": [], "quests": [
    { "uid": "ration", "path": ["main", "ration"], "name": "Get a ration card", "tags": [], "ordered": true,
      "onOpen": "", "onComplete": "rt.props.money += 5", "onFail": "",
      "tasks": [
        { "uid": "talk", "path": ["main", "ration", "talk"], "text": "Talk to the house manager", "critical": true,
          "onComplete": "", "onFail": "" },
        { "uid": "queue", "path": ["main", "ration", "queue"], "text": "Stand in the queue", "critical": true }
      ] }
  ] }
]
```

* `path` repeats the uids above it, and it **must match**: a quest is `[line, quest]`, a task is `[line, quest, task]`. Hooks and saved
  progress are keyed by `path`, so a mismatch silently breaks quests. The `game_json` validator checks it.
* `ordered` must be `true`.
* Uids are JS identifiers, since they are used as `rt.objectives.main.ration.talk`.

## Controlling quests from scripts

| Call | Effect |
|---|---|
| `rt.objectives.<line>.open()` / `.close()` | open or close a quest line |
| `rt.objectives.<line>.<quest>.open()` / `.complete()` / `.fail()` | change a quest |
| `rt.objectives.<line>.<quest>.<task>.open()` / `.complete()` / `.fail()` | change a task |
| `.status` on any of them | `"untouched"`, `"open"`, `"completed"`, `"failed"` (a closed line reads `"completed"`) |
| tasks also: `.isOpen`, `.isCompleted`, `.isFailed` | booleans |

Typical wiring: open the quest in the window where the player hears about it, and complete each task in the `entryScript` or `actionCode`
where it happens.

## What cascades  *(all verified on 2026-11-24 unless marked)*

**Opening a task** opens its quest if the quest is untouched. Opening a quest runs its `onOpen`, opens its line if untouched, and opens its
**first** task if that is untouched. So `rt.objectives.main.ration.queue.open()` on a fresh game opens the line, the quest, **`talk`**
(the first task) and `queue`.

**Completing a task** marks it completed and runs its `onComplete`, then:
* if it is **not the last** task, the **next task is opened**, which also opens the quest and line if they were untouched;
* if it **is the last** task, the **quest is completed**, *even if earlier tasks were never done*. Completing only the last task completes
  the quest directly, without ever opening it, so its `onOpen` never runs.

**Failing a task** marks it failed, runs its `onFail`, and **always fails the whole quest**, whether or not the task is critical. The
*is critical* checkbox makes no difference, because every quest is "ordered" (verified: failing a non-critical task failed the quest).

**Completing or failing a quest** runs its `onComplete` / `onFail`. It does **not** touch its tasks: open tasks stay open in the state. It
also does **not close the quest line**. Close lines yourself with `rt.objectives.<line>.close()`.

### Things this means

* **Complete the last task to finish a quest**, or call `quest.complete()`. Skipping middle tasks is allowed.
* **Calling `complete()` twice runs `onComplete` twice** (verified: a `+1` reward was paid twice). There is no "already completed" guard
  for quests and tasks; guard it yourself with `if (q.status !== 'completed') q.complete()`.
* **A failed quest can still be completed**, and then it is in both lists. `status` reports `"failed"`, which wins, and the Journal lists it
  under both *Completed* and *Failed* (state verified; the Journal reads both lists). Check status before completing.
* Opening an already open or finished quest does nothing; opening a line twice does nothing.

## Notifications and hooks

Each step queues a toast in the player ([[In-game menu and notifications]]) and fires a hook after the script ([[Hooks]]):

| Event | Toast label | Hook |
|---|---|---|
| line opened / closed | **New quest** / **Quest closed** | `QUESTLINE::OPENED::<line>`, `QUESTLINE::CLOSED::<line>` |
| quest opened | **New objective** | `QUEST::OPENED::<line>::<quest>` |
| task completed or failed | **Objective updated** | `TASK::COMPLETED::…`, `TASK::FAILED::…` |
| task opened | — | `TASK::OPENED::<line>::<quest>::<task>` |
| quest completed / failed | **Objective completed** / **Objective failed** | `QUEST::COMPLETED::…`, `QUEST::FAILED::…` |

Note the naming: in the player a **quest line** is called a *quest* and a **quest** an *objective*. All labels are translatable
([[Localization]]).

## In the player

**Menu → Journal** has three tabs, **Open**, **Completed** and **Failed**. Each lists quests grouped by quest line; selecting one shows its
tasks that have been **touched** (open, completed or failed), each with a status icon. **Untouched tasks are hidden**, so the player
sees the next step only once it opens (from source).

## Scriptable properties

| Where | Property | Kind | Runs |
|---|---|---|---|
| Quest | `onOpen` | action | when the quest opens (directly or by cascade) |
| Quest | `onComplete`, `onFail` | action | on every `complete()` / `fail()`, including repeats |
| Task | `onComplete`, `onFail` | action | when the task completes or fails |
| Task | `autoCheckScript` | — | **never** (editor-only) |

These run nested inside whatever script made the call. Their changes are kept, and the hooks fire once the outer script finishes.

## Gotchas

* **`autoCheckScript` does nothing.** The editor offers it, but the engine never calls it (from source). Complete tasks explicitly.
* Quest operations inside a **predicate** are discarded ([[Scripting overview]]).
* Deleting or renaming a quest or task leaves stale `path`s in old saves. A quest the game no longer has shows in the Journal as
  *Error: &lt;path&gt;*, and a missing task is dropped.
* **Before 2026-11-24 the deployed player had a bug:** completing any task behaved like completing the *first* task, so quests never
  finished. It was fixed in source in commit `7c88377`. The MCP player runs its own bundle (`player-runner/dist/runner.mjs`) and needs a
  rebuild to get the fix.

See also: [[The rt object]], [[Hooks]], [[Facts]], [[Order of execution]].
