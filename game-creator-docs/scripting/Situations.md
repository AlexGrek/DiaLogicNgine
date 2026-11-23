---
tags: [scripting, situations]
verified: 2026-11-23
sources: dialogic/src/exec/HooksProcessor.ts, dialogic/src/exec/Runtime.ts, dialogic/src/exec/GameState.tsx, dialogic/src/components/menuitems/configuration/ConfigurationMenu.tsx, dialogic/src/components/common/situation/SituationModifier.tsx, dialogic/src/components/common/code_editor/SmartCodeGenerators.tsx
---
# Situations

## What it is

A **situation** is a named, game-wide mode the story is currently in — `combat`, `night`, `dialogue_with_boss`. At any moment
there is **at most one** active situation (or none). Situations do nothing on their own; they are a shared label that scripts can
**read** ("show this link only in combat") and **react to** ([[Hooks]] fire when a situation starts or ends).

Use a situation when the rest of the game should behave differently for a while. For a plain yes/no flag, a boolean [[Props|prop]] is simpler.

## In the editor

* **Game configuration → Situations** is the list of names (an editable list). Declaring a name there makes it appear in pickers.
* In the [[Script editor]], **Smart generators → Situation** builds snippets: **Check** — *If active*, *If not active*, *If none*; **Set** — *Activate* and
  *Clear*. Typing a new name in its picker adds it to the list.
* The Hooks tab's hook picker offers `SITUATION::STARTED::…` / `SITUATION::ENDED::…` for each declared name ([[Hooks]]).
* A window drawer has **Misc → Change situation**, but see the warning below: it has no effect when the game runs.

## In the JSON

```json
"situations": ["combat", "peace"]
```

The *current* situation is not in the game file; it lives in the play state as `state.situation` (a string, or absent).

## At play time (all verified)

| You do | Result |
|---|---|
| nothing | a new game starts with **no** situation (`undefined`) |
| `state.situation = 'combat'` in an action script | the situation becomes `combat` |
| `state.situation = undefined` | no situation again |
| read `situation === 'combat'` (or `rt.situation`) in a script | the value **as it was when that script started** |
| set a name that is not in `situations` | works exactly the same, including hooks — the list is only for pickers and checks |

Switching fires hooks in this order: **`SITUATION::ENDED::<old>` first, then `SITUATION::STARTED::<new>`**. Clearing fires only `ENDED`.
Starting from none fires only `STARTED`. Setting the same value again fires nothing. Example log from one test game after
`combat` → `peace` → `ghost` → clear: `+combat -combat +peace -peace +ghost -ghost`.

The hooks run **after the script that changed the situation has finished**, like all hooks ([[Order of execution]]).

### Using it in conditions

Predicates can read the current situation; this link appears only while `combat` is active:

```json
{ "text": "Draw your sword", "isVisible": "return situation === 'combat'", "…": "…" }
```

### Using it for setup and cleanup

```json
"hooks": [
  { "name": "enter combat", "hook": "SITUATION::STARTED::combat", "body": "rt.props.initiative = 0; rt.props.enemyHp = 30" },
  { "name": "leave combat", "hook": "SITUATION::ENDED::combat",   "body": "rt.items.remove('torch')" }
]
```

## Gotchas

* **`changeSituation` on a window does nothing.** The editor shows a red *situation* tag on such a window and stores the value, but the engine never
  reads it (verified: entering a window with `changeSituation: "combat"` left the situation unset). Change the situation from a script:
  `state.situation = 'combat'`.
* **Inside the same script, `rt.situation` stays stale.** After `state.situation = 'combat'`, `rt.situation` is still the old value for the rest of that script
  (verified). Read `state.situation` if you need the new value immediately.
* **Only action scripts can change it.** Setting it inside `isVisible`, a picker or any other predicate is discarded (verified), so it also never fires hooks.
* It is a **single** slot: there is no stack of situations, and starting a new one ends the previous one.
* The situation is part of the saved state, so it survives save/load.
* A misspelled name in `state.situation = '…'` is not an error; it just never matches your hook or check.

See also: [[Hooks]], [[Props]], [[The rt object]], [[Scripting overview]].
