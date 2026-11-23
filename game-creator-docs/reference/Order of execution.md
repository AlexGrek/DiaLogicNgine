---
tags: [reference, scripting]
verified: 2026-11-23
sources: dialogic/src/exec/GameExecutor.tsx, RenderView.ts, EventsProcessor.ts, HooksProcessor.ts, QuestProcessor.ts, GameUiElementsProcessor.ts, Runtime.ts
---
# Order of execution

Exactly **what the engine runs, in what order**, for each thing that can happen. Items marked *(verified)* were checked by
logging from scripts in a probe game; *(from source)* were read from the engine code. Which scripts keep their state
changes is explained in [[Scripting overview]].

Two phases alternate for the whole game:

1. **A turn** — something the player does changes the state. *Action* scripts run here and their changes stick.
2. **A render** — the screen is drawn from the new state. *Predicates and pickers* run here, possibly several times, and
   **nothing they do is kept** *(verified)*.

## 1. Starting a game

1. A fresh state is created: position = `startupDialog`, no props written (reads give defaults), empty inventory and stack.
2. The start window is **entered** (see §2, "Entering a window") — so its `entryScript` is the place to reset variables.
3. Render.

## 2. The player follows a link in a window  *(verified unless marked)*

| # | What happens |
|---|---|
| 1 | The link was drawn only if `isVisible` was true, and is clickable only if `isEnabled` was true (render phase of the previous screen). |
| 2 | The link's **`actionCode`** runs (kept). |
| 3 | **Hooks** for what `actionCode` changed (facts, items, situation) run, one after another ([[Hooks]]). |
| 4 | The step counter goes up by one and any previous [[Quick reply]] text is cleared *(from source)*. |
| 5 | If the link is an alternative link, **`useAlternativeWhen`** runs (**kept**) and picks the direction. |
| 6 | The **move**: new position and [[Navigation stack]] changes, according to the [[Link types|link type]]. A quick reply sets its text instead. For [[To location]], see §3. |
| 7 | The click is added to the short history. |
| 8 | **Entering the new position** — see below. |
| 9 | **Render** — see §5. |

**Entering a window**, in order:

1. the window's **background** is updated — if `backgrounds.main` is set; with a `chooseBackgroundScript` the script runs now (its changes discarded) and picks the variant;
2. the window's **`entryScript`** runs (kept) and it already sees the new `state.background` *(verified: the entry logged the new background name)*; it also sees `rt.step` already increased, and `rt.history.dialogVisited` still **false for a window being entered the first time**;
3. **hooks** for what `entryScript` changed;
4. **`changeLocationInBg`** is applied;
5. the window is marked **visited**.

This sequence also runs when the position does not really change: a [[Quick reply]], a [[Local]] link to the same window,
and a return by [[Pop]]. Hence the rule "entry scripts run on every entry" ([[Windows]]).

**Verified order of one click:** a log written by `entryScript` of window A, then `actionCode` of the link, then
`entryScript` of window B came out as `a`, `A`, `bg=…` — in that order.

## 3. Travelling to a location  *(verified)*

By a [[To location]] link or a route from another location:

1. Link steps 1–5 above.
2. The stack and short history are cleared; the position becomes the location.
3. **Random events are rolled now** (details below), *before* the location's own entry runs.
4. **If an event fired**, the position becomes the event's window (the location is pushed on the stack), and *that window* is
   entered (§2). **The location's `onEntryScript` and background have not run yet** — verified: with a 100 % event the log was `V`
   (event window) and the location's `L` appeared only **after** the player left the event window with [[Pop]], which re-enters the location.
5. If no event fired, the location is entered: its background is applied, its `onEntryScript` runs, hooks follow, the
   location and its visible routes become *known places*, and the location is marked visited.

**Rolling events** *(from source)*:

* Only locations with a non-empty `eventHosts` list can host events; its `canHostEventsScript` (predicate) can veto it.
* Events whose `targets` include one of the location's hosts are candidates: **priority events first, in ascending probability**, then the rest
  in **descending** probability.
* For each candidate in that order: its `canHappenScript` (predicate, `context.thisEvent` = its name; changes discarded *(verified: a log written there never appeared)*), then a roll of 0–100 against `probability` (roll ≤ probability passes, so even `0` has a 1-in-101 chance).
* **The first event that passes wins** — at most one event per arrival. Its window is entered through a [[Push]]-like step, so [[Pop]] returns to the location.

## 4. Other turns

| Turn | What runs *(from source unless marked)* |
|---|---|
| **Next page** of a long window text | the page number goes up and the block just read is added to the history; **no entry script, no step increment** |
| **Use an item** on a window | the window's **`entryScript`** runs again with `context.usedItem`, then hooks; the player does not move |
| **Click a point-and-click zone** (no navigation) | the zone's `onClickScript`, then hooks; with navigation it is handled like a link |
| **Quest/task changes** (`rt.objectives…open()/complete()/fail()`) | the quest's or task's `onOpen`/`onComplete`/`onFail` script, then the matching `QUEST::…`/`TASK::…` [[Hooks|hook]], then any cascade (ordered quests, critical tasks) |
| **Discussion** with a character | the matching reaction is chosen (its `isEnabled` predicate), then handled like a link, then entered |

## 5. Rendering a window  *(order from source; "changes discarded" verified)*

Each time the screen is built, in this order:

1. **Text:** the quick-reply text if one is active, else `chooseTextScript` picks the variant ([[Variants]]).
2. **Links:** every link's `isVisible`; for each visible link its `isEnabled`; then each link's "visited" mark.
3. **Paging:** the text is split into pages; links appear only on the last page; a single empty-labelled link becomes "click to continue".
4. **Actor:** for a window with an `actor`, the character's `chooseNameScript` and `chooseAvatarScript`.
5. **Special widget** (point-and-click): each zone's `isVisibleIfScript`, then `isDisabledIfScript`.
6. **Locations additionally:** each route's `isVisibleScript` and `isAccessibleScript`, and `canHostEventsScript`.
7. **HUD:** each meter's `visibleIf`, then its `value`.
8. **Background:** the player compares the state's background with the one on screen and fades to the new one.

Because rendering can happen more than once per turn (for example when the game is reloaded or inspected), these scripts
**must be pure**. Verified: a link whose `isVisible` did `rt.props.n += 1` left `n` unset after three renders.

## 6. If a script throws

| Where | Result |
|---|---|
| any *action* script (`entryScript`, `actionCode`, hook, quest script…) | the state gets a `fatalError` and the player sees an **error screen** — the run cannot continue *(verified for `actionCode`)* |
| a *predicate* | counts as `false`; the game continues *(verified)* |
| a *picker* | shows `! ERROR: …` in place of the text/image *(verified for text)* |

## Cheat sheet: which script, when, and does it stick?

| Script | Runs | Stick? |
|---|---|---|
| `entryScript` | when a window is entered — **every** time | yes |
| link `actionCode` | on click, before the move | yes |
| link `useAlternativeWhen` | on click, after `actionCode`, before the move | yes |
| hook body | after the action script that caused the event | yes |
| `isVisible`, `isEnabled`, other predicates | every render | no |
| `chooseTextScript`, `chooseBackgroundScript`, other pickers | every render (background: also when entering) | no |
| meter `value` / `visibleIf` | every render | no |
| event `canHappenScript` | during the event roll on arrival | no |
| location `onEntryScript` | when the location is actually entered (after any event) | yes |
