---
tags: [scripting, editor]
sources: dialogic/src/components/common/code_editor/PopupCodeEditor.tsx, AccessibleObjects.tsx, SmartCodeGenerators.tsx, RtObjectTraverse.ts, dialogic/src/components/menuitems/scriptedit/*
---
# Script editor

## What it is

The pop-up where every script in the game is written. It opens from a **script button** in an editor (the window
drawer's **Scripting** panel, a link's **Scripting** panel, the Hooks and Scripting tabs…), and it is the same
component everywhere; only the title, the example snippets and the list of arguments change.

## Layout

| Area | What it gives you |
|---|---|
| Title bar | What you are editing, e.g. *alternative text choose* for a text picker, *Hook script editor* for a hook. |
| **Available objects** (left) | Everything the script can touch, built live from *your* game: `state`, `rt`, every prop (`props.<name>`), every character prop (`ch.<char>.<prop>`), facts, quest lines/quests/tasks with their methods (`open()`, `complete()`, `status` …), items, history helpers, `rt.general`, `context`. Click a name to read its documentation; the **+** next to it inserts the name at the cursor. |
| Code area (right) | A syntax-highlighted editor framed as `function <name>(<arguments>) { … }`. The frame is only a reminder: you type the **body**. Placeholder text: *Please enter JS code or leave blank for no action.* |
| **Load examples** | Buttons that **replace** the code area's content with a template (for a text picker: "no action", "always main", "always first alternative"). |
| **Smart generators** | Point-and-click snippet builders that insert a ready-made snippet at the cursor: **quests** (set status / check status), **facts** (set / check), **items** (add / remove / check inventory), **situations** (set / check), **props** (set / check, and create a new Number, Boolean or Text prop). |
| **Save** | Stores the script. Closing the pop-up also saves what you typed. |

An **empty** script is stored as "no script" (the field is removed from the JSON).

## Where the global script tabs are

The game-wide script pieces live under one menu with four tabs:

| Tab | Holds | Note |
|---|---|---|
| **Props** | the game's variables | [[Props]] |
| **Scripting** | reusable functions | [[Functions]] |
| **Events** | random events | planned |
| **Hooks** | lifecycle scripts | [[Hooks]] |

## Tips

* Use **Smart generators** to avoid typos in uids: a wrong fact or item uid is not caught until the script runs.
* The editor does **not** syntax-check. To check scripts before publishing, dump them with
  `dialogic scripts dump` and push with `dialogic scripts push` (it runs `node --check` on every edited script).
* The objects list reflects the game as saved, so declare a prop *first*, then script with it.

See also: [[Scripting overview]], [[The rt object]].
