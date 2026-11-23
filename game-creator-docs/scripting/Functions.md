---
tags: [scripting]
verified: 2026-11-23
sources: dialogic/src/game/ScriptFunction.ts, dialogic/src/exec/Runtime.ts (buildFunctionsPreamble), dialogic/src/components/menuitems/scriptedit/FunctionsEditorTab.tsx
---
# Functions (reusable scripts)

## What it is

A **function** is a piece of script you write once and call by name from any other script — "change hope, but keep it
between 0 and 10", "give the player a reward". It saves repeating code and keeps rules in one place.

## In the editor

**Scripting menu → Scripting** lists your functions (*No functions yet…* until you add one). **Add function** opens
an editor with:

| Field | Meaning |
|---|---|
| **Name** | what you call it, e.g. `addScore` — must be a valid JavaScript identifier |
| **Parameters** | comma-separated, e.g. `amount, reason` |
| **Description** | shown in the editor's docs for other authors |
| **Function body** | the code, in the [[Script editor]] |

**Save** keeps it, **Discard** drops your edits, and there is a confirm-delete button.

## In the JSON

```json
"functions": [
  { "name": "addHope", "args": "n", "description": "Change hope, clamped to 0..10",
    "body": "rt.props.hope = Math.max(0, Math.min(10, rt.props.hope + n))" },
  { "name": "addRub", "args": "n", "description": "Change rubles, never below 0",
    "body": "rt.props.rubles = Math.max(0, rt.props.rubles + n)" }
]
```

Used like this:

```json
{ "text": "Pay the 3 rubles", "actionCode": "addRub(-3); addHope(1)", "…": "…" }
```

## At play time

Before each script runs, the engine puts **every function** at the top of it as an ordinary JavaScript
`function name(args) { body }`. Consequences:

* Any script can call any function, whatever its kind ([[Scripting overview]]) — entry scripts, link conditions, meter values, hooks.
* Inside a function, `rt`, `state`, `props`, `ch`, `facts`, `objectives`, `situation`, `items` and `context` are available
  exactly as in the calling script — it works on the *same* state.
* Functions can call each other. Calling a function from a predicate or picker is fine; it just can't change anything that sticks (see the kinds table).
* **A function with an invalid name is skipped** (it is never defined, so calling it throws).
* The values it can *return* are for the caller: `function isRich() { return rt.props.rubles > 10 }` then `isVisible: "return isRich()"`.

Verified: a game whose links use `addRub(-3); addHope(1)` changes the HUD by exactly those amounts.

## Gotchas

* **Don't reuse names of JavaScript built-ins** (`Math`, `Object`, `String`…): your function would shadow them in every script.
* The function exists *inside* each script, not globally — nothing carries between scripts except the game state.
* An exception inside a function surfaces from the calling script and follows its kind's rule (an action script stops the game; a predicate quietly counts as `false`).
* Functions are plain JavaScript; there is no need to `return` state.

See also: [[Props]], [[The rt object]].
