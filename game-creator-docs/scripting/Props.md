---
tags: [scripting, props]
verified: 2026-11-23
sources: dialogic/src/game/Prop.ts, dialogic/src/exec/Runtime.ts (addProp), dialogic/src/components/menuitems/scriptedit/PropsEditMenu.tsx, PropsEditorDrawer.tsx
---
# Props (game variables)

## What it is

A **prop** is a named variable that lives in the game state: money, a mood, a flag "has met the neighbour". Declare it once;
read and write it from any script as `rt.props.<name>`. Props are saved with the game and start over with every new game.

## In the editor

**Scripting menu → Props.** The table lists each prop with its type and default. **Create** opens a form:
a **Name** (placeholder *unique js identifier* — the button stays disabled until the name is a valid identifier) and
a type tile — **Number** (any int or float), **String** (any text), **Boolean**, **Variant**, **Location**. The edit
drawer sets the **default value** (a number box, a text box, a true/false toggle, or — for variants — the list of
allowed values plus the default). Smart generators in the [[Script editor]] can also create a Number, Boolean or Text prop on the spot.

## In the JSON

```json
"props": [
  { "name": "rubles", "datatype": "number",  "defaultValue": 14 },
  { "name": "bread",  "datatype": "boolean", "defaultValue": false },
  { "name": "note",   "datatype": "string",  "defaultValue": "" },
  { "name": "mood",   "datatype": "variant", "defaultValue": "calm", "variants": ["calm", "happy", "angry"] }
]
```

| `datatype` | `defaultValue` | Extra |
|---|---|---|
| `number` | number | optional `min`, `max` (see Gotchas) |
| `boolean` | `true` / `false` | |
| `string` | text | |
| `variant` | one of `variants` | `variants`: list of allowed strings |
| `location` | a location uid | |

`name` must be a JavaScript identifier (letters, digits, `_`, `$`; not starting with a digit): it becomes `rt.props.<name>`.

## At play time

* **Reading** a prop that was never written gives its `defaultValue`. The state stores a prop only once a script has
  written it (verified: reading `/props/n` from raw state before any write fails; `rt.props.n` still reads `0`).
* **Writing** stores the value in the state, so it persists across windows, saves and loads.
* A **new game** (and the start window's `entryScript`, if you reset there) begins again from defaults — which is why the
  start window of a replayable game assigns its props explicitly:

  ```js
  rt.props.rubles = 14; rt.props.hope = 5; rt.props.bread = false;
  ```

## What happens when you write the "wrong" thing (verified)

Declared types are **not enforced**. The engine logs a console warning for some mismatches and stores the value anyway.

| Datatype | You write | Stored |
|---|---|---|
| `number` | `'oops'` | `"oops"` — stored as is |
| `number` with `max: 5` | `99` | `99` — `min`/`max` are **not enforced** (and not shown in the editor drawer) |
| `boolean` | `7` | `7` |
| `variant` | a value not in `variants` | stored as is (`'furious'` was accepted) |
| `string` | `null` | the text `"null"` — everything is converted to text |
| **`location`** | anything | **nothing — the assignment is silently ignored** |

So:

* **Clamp yourself.** `rt.props.hope = Math.max(0, Math.min(10, rt.props.hope + n))` — wrap it in a [[Functions|function]] such as `addHope(n)`.
* **Don't write `location` props** from scripts; they only ever read as their default.
* Check types in your own code if a wrong one would break a later `+=` (`"oops" + 1` is the text `"oops1"`).

## Undeclared props

`rt.props.score = 1` for a prop you never declared seems to work *inside that one script* (reading it back gives `1`)
but is **not stored**, so the next script sees `undefined` (verified). Declare first, script second.

## Per-character props

Characters (and the roles they use) can have their own props, read as `rt.ch.<character>.<prop>`. Documented with
characters ([[Roles and character props]]).

## Gotchas

* Scripts refer to props by name only. If you change a prop's name, update every script that uses it — nothing checks this for you.
* A variable shown in text never updates by itself: show it with a [[HUD meters|HUD meter]] or pick a [[Variants|text variant]].
* Props are global; prefix related ones (`shop_open`, `shop_gold`) to keep a growing list readable.

See also: [[The rt object]], [[Scripting overview]].
