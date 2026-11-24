---
tags: [reference]
verified: 2026-11-24
sources: dialogic/src/exec/GameState.tsx, dialogic/src/exec/GameExecutor.tsx (addToKnownPeople, addAllToKnownPlaces, addToVisitedDialogs), dialogic/src/exec/Runtime.ts (RuntimeHistoryAccessManager)
---
# Known and visited

The engine keeps several lists of "what the player has met". They drive discussion topics, the *Knowledge* tab, the *visited* mark on links, and
`rt.history` in scripts.

| List (state key) | Filled when | Used by | Script access |
|---|---|---|---|
| **known facts** (`knownFacts`) | a script calls `rt.facts.<uid>.know()` | Knowledge tab, **Facts** discussion topics, `FACTS::DISCOVERED` [[Hooks]] | `rt.facts.<uid>.known` |
| **known people** (`knownPeople`) | the player **opens the character's dialog** | People tab, **People** topics, the *visited* mark on [[Talk to person]] links | — |
| **known places** (`knownPlaces`) | the player enters a location: that location **and every route visible from it** | **Places** topics | — |
| **visited locations** (`visitedLocations`) | the player is actually entered into a location | *visited* mark on [[To location]] links | `rt.history.locationVisited(uid)`, `visitedLocations` |
| **visited windows** (`visitedDialogs`) | a window is entered (recorded **after** its entry script) | *visited* mark on window links | `rt.history.dialogVisited(dialog, window?)` |
| **happened events** | a random event fires | event conditions | `rt.history.eventHappened(name)` |

All verified except the event row (from source). "Known" is looser than "visited": a place seen as a locked route is *known* but not *visited*.

## Fixed engine issue: quests overwrote "known people"

Engine builds before 2026-11-23 had a typo in `safeStateUpdate` (`dialogic/src/exec/GameState.tsx`): any quest or task operation replaced the list of
known people with the list of known facts, so the **People** tab and topics showed fact ids. It is fixed in commit `7c88377` (verified on 2026-11-24:
a known person survives completing a task). Saves made on an old build may still hold fact ids in `knownPeople`; talking to the characters again re-adds them.

See also: [[Discussion and reactions]], [[The rt object]].
