# Scripting from JSON

Every script in a game file is a **JSON string containing a JavaScript function body**.
It is compiled as:

```js
(function (rt, state, props, ch, facts, objectives, situation, items, context) {
  /* your game.functions are declared here */
  /* your script body */
})
```

So `\n` in the JSON string is a real newline, `return` is legal at the top level, and all
nine parameters are in scope. In practice write everything through **`rt`** — the other
parameters are aliases (`props === rt.props`, `items === rt.items`, …) kept for
compatibility.

Source: `dialogic/src/exec/Runtime.ts`. Engine-side details live in the `game_engine` skill.

---

## The three script contracts

| Contract | Used by | What the return value means |
|---|---|---|
| **State processor** | `entryScript`, `onEntryScript`, link `actionCode`, zone `onClickScript`, hook `body`, quest/task `onOpen`/`onComplete`/`onFail` | Return nothing. Mutations you made via `rt.*` are kept automatically. (Returning a full `State` object replaces the state; almost never what you want.) |
| **Bool processor** | `isVisible`, `isEnabled`, `useAlternativeWhen`, `isVisibleIfScript`, `isDisabledIfScript`, `isAccessibleScript`, `isVisibleScript`, `canHappenScript`, `canHostEventsScript`, reaction `isEnabled`, meter `visibleIf` | **Must `return` a boolean.** No return ⇒ `undefined` ⇒ falsy ⇒ hidden/disabled. State changes made here *are* kept — don't mutate in a predicate. |
| **Any processor** | `chooseTextScript`, `chooseBackgroundScript`, `chooseBgScript`, `chooseNameScript`, `chooseDescriptionScript`, `chooseAvatarScript`, meter `value` | Return the selected variant (`"name"`, index, or `null` for `main`) or, for meters, the value to display. **State changes are discarded** for the text/background/avatar pickers. |

Exceptions never crash the game: they are caught, logged, and set `state.fatalError`,
which renders the error view. A failing bool script yields `false`.

---

## The `rt` object

### `rt.props.<name>` — declared global variables

```js
rt.props.gold += 10
rt.props.power = 'on'          // variant: must be one of its declared variants
if (rt.props.hasKey) { … }
```
Only props declared in `game.props` exist. Assigning to an undeclared name writes to a
throwaway object and is **silently lost**. Type mismatches are logged to the console but
still written — validate in your own script if it matters.

### `rt.ch.<charUid>.<propName>` — per-character variables

```js
rt.ch.alice.priceModifier = 0.8      // from the character's role
rt.ch.bob.alertLevel = 'alert'
```
Merges the character's own `props`, the props of every `role` it lists, and
`overrideProps`. Stored as `state.props["char:<uid>_<name>"]`.

### `rt.facts.<factUid>`

```js
rt.facts.gate_is_open.know()          // learn it (fires FACTS::DISCOVERED::gate_is_open)
if (!rt.facts.gate_is_open.known) { … }
```

### `rt.items`

```js
rt.items.add('battery')          // add 1 (pushes an "item added" notification)
rt.items.add('coin', 25)         // add N
rt.items.remove('coin', 5)
rt.items.has('vault_key')        // boolean
rt.items.count('battery')        // total quantity of one item
rt.items.countTotal()            // everything carried
rt.items.list()                  // [{ item: 'battery', quantity: 3 }, …]
rt.items.listWithTag('quest_item')
```
Unknown item uids log an error and no-op.

### `rt.objectives.<questLine>.<quest>.<task>`

```js
rt.objectives.main_line.open()                          // open a questline
rt.objectives.main_line.first.open()                    // open a quest (auto-opens its line)
rt.objectives.main_line.first.visit_town.complete()     // complete a task (auto-opens parents)
rt.objectives.main_line.first.visit_town.fail()
rt.objectives.main_line.first.visit_town.isCompleted    // also .isOpen / .isFailed
rt.objectives.main_line.first.status                    // "untouched" | "open" | "completed" | "failed"
rt.objectives.main_line.close()
```
The accessor path is `questLine.uid → quest.uid → task.uid`, which is why those uids must
be JS identifiers.

### `rt.history` and `rt.step`

```js
rt.history.eventHappened('Market announcement')   // has this event ever fired?
rt.history.thisEventHappened(context)             // inside canHappenScript: has THIS event fired?
rt.step                                           // choices made so far (read-only)
```

### `rt.general` (read-only)

`rt.general.name / .version / .description / .authors / .extras` — the values from
`game.general`. `extras` is a handy place to park author-defined constants.

### `rt.situation` and `state.situation`

`rt.situation` is a read-only snapshot. To **change** the situation write to `state`:

```js
state.situation = 'battle'     // fires SITUATION::ENDED::<old> then SITUATION::STARTED::battle
state.situation = undefined    // end the current situation
```

### `context` — extra variables from the engine

Currently only `{ thisEvent: "<event name>" }`, passed to `canHappenScript`.

---

## Reusable functions (`game.functions`)

```jsonc
{ "name": "earnGold", "args": "amount",
  "description": "Adds amount to gold and returns the new total.",
  "body": "rt.props.gold += amount\nreturn rt.props.gold" }
```

Declared ahead of **every** script, so any script can call `earnGold(10)`. Inside a
function body the whole context (`rt`, `state`, `context`, …) is available by closure.
`name` must be a valid JS identifier or the function is skipped silently. Use these for
anything you would otherwise copy-paste into several links.

---

## Hooks (`game.hooks`)

A hook is `{ name, hook, body }` where `hook` is an exact string match. Multiple hooks may
share a string; they all run, in **undefined order**.

| Hook string | Fires when |
|---|---|
| `FACTS::DISCOVERED::<factUid>` | The fact enters `state.knownFacts` |
| `ITEMS::ACQUIRED::<itemUid>` | Carried quantity of the item increases |
| `ITEMS::LOST::<itemUid>` | Carried quantity decreases |
| `SITUATION::STARTED::<situation>` | `state.situation` changes to this value |
| `SITUATION::ENDED::<situation>` | `state.situation` changes away from this value |
| `QUESTLINE::OPENED::<lineUid>` / `QUESTLINE::CLOSED::<lineUid>` | Questline opened / closed |
| `QUEST::OPENED::<line>::<quest>` | Quest opened |
| `QUEST::COMPLETED::<line>::<quest>` / `QUEST::FAILED::<line>::<quest>` | Quest resolved |
| `TASK::OPENED::<line>::<quest>::<task>` | Task opened |
| `TASK::COMPLETED::<line>::<quest>::<task>` / `TASK::FAILED::<line>::<quest>::<task>` | Task resolved |

Quest and task hook strings are the `path` array joined with `::`.

Fact/item/situation hooks are detected by **diffing the state** before and after a player
action, so they fire once per transition regardless of what caused it. Hook bodies do not
recursively trigger further lifecycle hooks — a hook that adds an item will not fire that
item's `ACQUIRED` hook.

---

## Where each script field lives

| Where | Field | Contract |
|---|---|---|
| `dialogs[].windows[]` | `entryScript` | state |
| | `chooseTextScript`, `chooseBackgroundScript` | any (state discarded) |
| `…windows[].links[]` | `actionCode` | state |
| | `isVisible`, `isEnabled`, `useAlternativeWhen` | bool |
| `locs[]` | `onEntryScript` | state |
| | `isVisibleScript`, `isAccessibleScript`, `canHostEventsScript` | bool |
| | `chooseTextScript`, `choosebackgroundScript` | any |
| `chars[]` | `chooseNameScript`, `chooseDescriptionScript`, `chooseAvatarScript` | any |
| `chars[].dialog` | `chooseTextScript`, `chooseBgScript` | any |
| | `canHostEventsScript` | bool |
| `chars[].dialog.behavior.reactions[]` | `isEnabled` | bool |
| `objectives[].quests[]` | `onOpen`, `onComplete`, `onFail` | state |
| `objectives[].quests[].tasks[]` | `onComplete`, `onFail` | state |
| `events[]` | `canHappenScript` | bool (gets `context.thisEvent`) |
| `pacWidgets[].zones[]` | `onClickScript` | state |
| | `isVisibleIfScript`, `isDisabledIfScript`, `useAlternativeWhen` | bool |
| `uiElements.meters[]` | `value` | any |
| | `visibleIf` | bool |
| `hooks[]` | `body` | state |
| `functions[]` | `body` | (whatever the caller expects) |

**Inert fields** — present in the model and editable, but never executed by the current
engine: link `textProcessingCode`, reaction `actionScript`, event `onEventActionScript`,
task `autoCheckScript`, window `changeSituation`. Do not rely on them.

---

## Patterns

**Guard a one-time reward** (entry scripts run on *every* entry):
```js
if (!rt.props.vaultOpened) { rt.props.vaultOpened = true; earnGold(100) }
```

**Conditional branch without extra windows** — one link, two destinations:
```jsonc
{ "mainDirection": { "type": "local", "direction": "vault_locked" },
  "text": "Enter the vault",
  "isAlternativeLink": true,
  "useAlternativeWhen": "return powered() && rt.items.has('vault_key')",
  "alternativeDirections": [ { "type": "local", "direction": "vault_open" } ] }
```

**Hide vs disable:** `isVisible` removes the option entirely; `isEnabled` shows it greyed
out — use the latter when the player should see what they are missing.

**Dynamic text variant:**
```jsonc
"text": { "main": "First visit.", "list": [ { "name": "returning", "text": "Back again." } ] },
"chooseTextScript": "return rt.props.visits > 1 ? 'returning' : null"
```

**Counting toward a task** with a hook instead of duplicating logic on every pickup:
```jsonc
{ "name": "Battery counter", "hook": "ITEMS::ACQUIRED::battery",
  "body": "if (rt.items.count('battery') >= 3) { rt.objectives.lab.power_up.gather.complete() }" }
```

**Debugging:** `console.log(...)` from any script goes to the browser console; the player's
State drawer shows the live `State`. A thrown error surfaces as the in-game error view with
the exception message.
