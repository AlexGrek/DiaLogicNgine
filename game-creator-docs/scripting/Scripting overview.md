---
tags: [scripting]
verified: 2026-11-23
sources: dialogic/src/exec/Runtime.ts, dialogic/src/exec/GameExecutor.tsx, dialogic/src/exec/RenderView.ts, dialogic/src/game/*.ts
---
# Scripting overview

## What it is

Scripts are small pieces of JavaScript attached to **properties** of your game — a window's `entryScript`, a link's
`isVisible`, a meter's `value`. They read and change the game's variables ([[Props]]), inventory, facts and so
on, and decide what is shown. Most games need only one-liners such as `rt.props.rubles -= 3`.

A script is stored as a **string containing a function body**:

```json
"actionCode": "addRub(-3); rt.props.hope += 1"
```

The engine wraps it, conceptually, like this, and calls it:

```js
function (rt, state, props, ch, facts, objectives, situation, items, context) {
  /* every function you defined under Scripting → Scripting (see Functions) */
  /* your script */
}
```

So `return` is allowed at the top level, newlines in the JSON string are `\n`, and the nine names above are in scope.
Write everything through **`rt`** (see [[The rt object]]); the other names are shortcuts to parts of it.

## The three kinds of script

What a script may do depends on its **kind**, which is fixed by the property it is attached to. This table is the
most important thing to know about scripting. Every row was checked against the running engine.

| Kind | Examples | Return value | State changes | If it throws |
|---|---|---|---|---|
| **Action** | `entryScript`, `actionCode`, hook bodies, quest `onOpen`/`onComplete`/`onFail`, location `onEntryScript`, zone `onClickScript` | ignored — return nothing | **kept** | the game stops on an **error screen** (verified for `actionCode`; the others share the same code path) |
| **Predicate** | `isVisible`, `isEnabled`, location `isVisibleScript`/`isAccessibleScript`/`canHostEventsScript`, event `canHappenScript`, meter `visibleIf`, zone `isVisibleIfScript`/`isDisabledIfScript`, reaction `isEnabled` | any value, **coerced to true/false** (truthy ⇒ true; *no `return` ⇒ false*) | **discarded** | counts as `false`; the game carries on |
| **Alternative-link condition** | `useAlternativeWhen` | coerced to true/false | **kept** (the one predicate whose changes survive) | counts as `false`, and the error is kept, so most likely an error screen **(from source)** |
| **Picker / value** | `chooseTextScript`, `chooseBackgroundScript`, character `chooseNameScript`/`chooseAvatarScript`/`chooseDescriptionScript`, location/character-dialog pickers, meter `value` | the variant to use ([[Variants]]), or the number/text to display | **discarded** | the picker yields `false` ⇒ an `! ERROR:` text/image instead of content |

Verified examples:

* A link with `isVisible: "rt.props.n += 1; return true"` shown over three renders leaves `n` untouched — predicates run during *drawing* and their changes are thrown away.
* `isVisible: "throw new Error('boom')"` simply hides that link (no error screen). `isVisible: "return 1"` shows it. `isVisible: "rt.props.n = 5"` (no `return`) hides it.
* `chooseTextScript: "throw …"` shows the text `! ERROR: cannot find text identified by <false>`.
* `actionCode: "throw …"` stops the game with an error screen (`Error in user code: Error: …`).
* `useAlternativeWhen: "rt.props.n += 10; return false"` really adds 10 to `n`.

**Rule of thumb:** change things only in *action* scripts (entry, action, hooks). Everything the player *sees* (visibility,
labels, text, pictures, meters) is recomputed from the state, possibly many times per click, so those scripts must only
*read*.

## Where scripts can be attached

| Where | Properties | Documented in |
|---|---|---|
| **Dialog window** | `entryScript`, `chooseTextScript`, `chooseBackgroundScript` | [[Windows]] |
| **Link** | `actionCode`, `isVisible`, `isEnabled`, `useAlternativeWhen` | [[Links]] |
| **Whole game** | reusable functions, lifecycle hooks, props | [[Functions]], [[Hooks]], [[Props]] |
| Location | `onEntryScript`, `chooseTextScript`, `choosebackgroundScript` (sic: lowercase *b*), `isVisibleScript`, `isAccessibleScript`, `canHostEventsScript` | planned |
| Character dialog | `chooseTextScript`, `chooseBgScript`, `canHostEventsScript` | planned |
| Character | `chooseNameScript`, `chooseDescriptionScript`, `chooseAvatarScript`; reaction `isEnabled` | planned |
| Random event | `canHappenScript` (gets `context.thisEvent`) | planned |
| Quest / task | `onOpen`, `onComplete`, `onFail` | planned |
| Point-and-click zone | `onClickScript`, `isVisibleIfScript`, `isDisabledIfScript`, `useAlternativeWhen` | planned |
| HUD meter | `value`, `visibleIf` | planned |

**Declared but never run** (the editor may store them, the engine ignores them): link `textProcessingCode`, reaction
`actionScript`, event `onEventActionScript`, task `autoCheckScript`, and the proxy `proxyRouterScript`. Window
`changeSituation` is a plain field, not a script, and is not applied either ([[Windows]]).

## Writing and editing scripts

* In the editor: the [[Script editor]] popup, with autocomplete-style object lists and snippet generators.
* As JSON: `game.json` strings.
* As files: the `dialogic` CLI can dump every script to a `.js` file, check its syntax with `node --check`, and push the
  edits back (`dialogic scripts dump | push`; see the `cli/` README).

## Gotchas

* **Declare before you use.** `rt.props.score = 1` for an undeclared prop appears to work *inside the same script* but is
  not stored ([[Props]]).
* A syntax error in any script breaks only that script, at the moment it runs — there is no check on save in the editor.
* Don't rely on a particular order among several [[Hooks|hooks]] reacting to the same event.
* Full ordering of what runs when: [[Order of execution]].
