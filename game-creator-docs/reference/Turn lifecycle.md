---
tags: [reference]
verified: 2026-11-23
sources: dialogic/src/exec/GameExecutor.tsx (applyLink, followLink, executeEntry), dialogic/src/exec/RenderView.ts
---
# Turn lifecycle: what happens when a link is clicked

Knowing the order lets you put each piece of logic in the right place.

## The sequence

1. **Eligibility.** The link was only on screen because `isVisible` allowed it; it can only be clicked if `isEnabled` allowed it.
2. **`actionCode`** of the clicked link runs. It sees the state of the *current* window.
3. **[[Hooks]]** reacting to what `actionCode` changed (facts learned, items gained/lost, situation) run.
4. The step counter goes up and any old [[Quick reply]] text is cleared.
5. **Direction is chosen.** If the link is an alternative link, `useAlternativeWhen` runs now (its changes are kept) and, if true, the first
   alternative direction is used; otherwise the main direction ([[Links]]).
6. **The move.** The [[Link types|link type]] decides the new position and what happens to the [[Navigation stack]].
   (For a [[Quick reply]] there is no move.)
7. **History** is recorded.
8. **Entry of the new position** (this runs for every link type, including [[Quick reply]]):
   1. the [[Backgrounds|background]] is updated (for a window: only if its `backgrounds.main` is set),
   2. the window's **`entryScript`** runs, then hooks for what it changed,
   3. `changeLocationInBg` is applied,
   4. the window is marked **visited**.
9. **Render.** The screen is drawn: the text variant is chosen (`chooseTextScript`, [[Variants]]), the text is split
   into [[Text and pages|pages]], links are filtered by `isVisible` and greyed by `isEnabled`.

For locations, characters, events and rendering details see [[Order of execution]].

## Verified example

A link whose `actionCode` appends `A` to a log, leading to a window whose `entryScript` appends `E`, starting from a
window whose entry appended `a`: the log reads `aAE` — source entry, then the click's action, then the target's entry.

## What this means for design

* Put "this choice costs money" in the link's **`actionCode`** — it runs once per click.
* Put "set up this scene" in the window's **`entryScript`** — but remember it also runs on every return
  ([[Pop]], [[Quick reply]]) and not only the first time.
* A window's entry script can rely on the choice's `actionCode` having already run, and on the [[Hooks|hooks]] it triggered.
* `isVisible`, `isEnabled` and the `choose…Script` pickers run during **render**, possibly many times: keep them free of side effects.

## Start of the game

A new game puts the player at `startupDialog` and runs that window's entry (steps 6.1–6.4). That is why the start
window is the right place to reset variables for a "play again".
