---
tags: [links]
verified: 2026-11-23
sources: dialogic/src/game/Dialog.ts (LinkType), dialogic/src/exec/GameExecutor.tsx
---
# Link types

## What it is

Every [[Links|link]] has a **type** that says how it moves the player. There are nine. Each type reads its target
from a different field of `mainDirection`.

## Overview

| Type (`type` value) | Editor label | Target field | [[Navigation stack]] | Goes to |
|---|---|---|---|---|
| `local` → [[Local]] | Local | `direction` = window uid | unchanged | a window in the **same dialog** |
| `push` → [[Push]] | Push | `qualifiedDirection` | **adds** current position | any window; can come back |
| `jump` → [[Jump]] | Jump | `qualifiedDirection` | unchanged | any window; no new return point |
| `resetjump` → [[Reset jump]] | Reset jump | `qualifiedDirection` | **empties** it | any window; point of no return |
| `pop` → [[Pop]] | Pop | none | removes top | the position that was pushed |
| `return` → [[Return]] | Return | none | removes down to a conversation | the enclosing character dialog / location |
| `tolocation` → [[To location]] | To location | `direction` = location uid | **empties** it | a location |
| `toperson` → [[Talk to person]] | Talk to person | `direction` = character uid | **adds** current position | a character's dialog |
| `reply` → [[Quick reply]] | Quick reply | `replyText` | unchanged | nowhere — shows text in place |

`qualifiedDirection` is `{ "kind": "window", "dialog": "<dialog name>", "window": "<window uid>" }` — the same shape as
`startupDialog`.

## Which one do I want?

* **Next scene in the same chapter** → [[Local]].
* **Different dialog, never coming back** → [[Jump]] (or [[Reset jump]] if earlier return points must die).
* **Visit something and return to exactly here** → [[Push]] there, [[Pop]] back.
* **A line of flavour text, no scene change** → [[Quick reply]].
* **Characters and places** → [[Talk to person]], [[To location]]; leave a conversation with [[Pop]] or [[Return]].

## In the editor

In the link editor, **Direction** has the type picker; the target controls change with the type (a window picker for
`local`/`push`/`jump`/`resetjump`, a location or character picker, or a text box for the reply).

## Gotchas

* Only [[Local]] uses a bare window uid; the others take the full `{kind, dialog, window}` object.
* `push` / `jump` / `resetjump` with no `qualifiedDirection`, or `local` with an empty `direction`, do nothing **(from source)**.
* Every window the player can reach must offer a way out; see [[Windows]].
