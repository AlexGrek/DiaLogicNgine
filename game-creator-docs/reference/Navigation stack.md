---
tags: [reference]
verified: 2026-11-23
sources: dialogic/src/exec/NavigationUtils.ts (backDestination), dialogic/src/exec/GameExecutor.tsx
---
# Navigation stack

## What it is

The engine keeps a **stack of positions** — a "where to come back to" list. Some [[Link types|link types]] add to it
or remove from it; that is what makes "go somewhere and come back" possible.

## Who touches the stack

| Link type | Effect on the stack |
|---|---|
| [[Local]] | none |
| [[Push]] | **adds** the current position, then moves |
| [[Jump]] | none — moves, keeping the stack as it is |
| [[Reset jump]] | **empties** the stack, then moves |
| [[Pop]] | **removes** the top entry and moves there |
| [[Return]] | removes entries down to the nearest character dialog and moves there |
| [[Talk to person]] | **adds** the current position, then opens the character |
| [[To location]] | **empties** the stack (and the short history) |
| [[Quick reply]] | none |

## Verified example

```
start at a
 push c         stack: [a]            you are in c
 jump d         stack: [a]            you are in d      (jump did not touch the stack)
 pop            stack: []             you are back in a  (a's entry script runs again)

start at a
 push c         stack: [a]
 resetjump e    stack: []             you are in e
 pop            ✗ error: "Attempt to pop while UI stack is empty"
```

Entries are positions of any kind — a window, a location or a character dialog — so one stack can hold
`[hall (location), npc (character dialog), q (window)]`. Going back with [[Pop]] returns exactly one step;
[[Return]] skips ahead to the enclosing conversation.

## Gotchas

* **Popping an empty stack is an error**, not a no-op (in a game made only of windows). Every window that offers
  a [[Pop]] link must only be reachable through a [[Push]] (or a [[Talk to person]] / location link that stacked it).
* Returning to a position **re-runs its entry script** and re-applies its background if it has one.
* [[Jump]] is the "no way back" move; use [[Push]] for "visit and return". Use [[Reset jump]] when the story reaches a
  point of no return (a new chapter, an ending) so old return points cannot be reached any more.
