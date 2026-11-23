---
tags: [characters, scripting]
verified: 2026-11-23
sources: dialogic/src/game/Character.ts (Role), dialogic/src/exec/Runtime.ts (addChars), dialogic/src/components/menuitems/charedit/RolesMenu.tsx, CharRoleEditing.tsx
---
# Roles and character props

## What it is

Besides the game-wide [[Props]], every character can carry **its own variables**: a merchant's `priceModifier`, a guard's `alertLevel`, a friend's `trust`. Scripts
read and write them as **`rt.ch.<character>.<prop>`**. To avoid declaring the same variables on twenty characters, group them into **roles**: a *role* is a named
bundle of props (`merchant`, `guard`) that any number of characters can share.

## In the editor

* **Roles** menu → **Create** (a uid that is a valid identifier) → add the role's props with default values, exactly like [[Props]].
* On a character page, **Roles** lists the character's roles and the props they bring; a role's prop can be **overridden** for this character with its own
  default. **Personal props** adds props only this character has.

## In the JSON

```json
"roles": [ { "name": "shopkeeper", "props": [ { "name": "priceModifier", "datatype": "number", "defaultValue": 1 } ] } ],
"chars": [ {
  "uid": "baker",
  "roles": ["shopkeeper"],
  "props":         [ { "name": "mood", "datatype": "string", "defaultValue": "cheerful" } ],
  "overrideProps": [ { "name": "priceModifier", "datatype": "number", "defaultValue": 0.8 } ]
} ]
```

| Field | Meaning |
|---|---|
| role `name` | the id used in a character's `roles` |
| character `props` | personal props |
| character `roles` | role names whose props the character gets |
| character `overrideProps` | per-character replacement defaults for role (or personal) props |

## At play time

```js
rt.ch.baker.mood = 'grumpy'
if (rt.ch.baker.priceModifier < 1) { /* discount */ }
```

* Reading an unset prop gives its default; writing stores it in the state under the key **`char:<uid>_<prop>`** (verified: `char:npc_x`), so it is saved with the game.
* The same typing rules as [[Props]] apply (no enforcement, `location` props can't be written).
* Characters are known to scripts only by their **uid**; `rt.ch.nobody` for a missing character is `undefined`.

### Which default wins when names clash  *(verified)*

The engine builds the character's variables in this order, each step replacing the previous definition of the same name:

1. personal `props` → 2. each role's `props` → 3. `overrideProps`.

So **a role's prop beats a personal prop of the same name**, and **an override beats both**. A test character with its own `x = 1`, a role giving `x = 2`
and no override read **2**; with an override of `3` it read **3**. Avoid clashes: do not give a personal prop the same name as one of the character's role props —
use `overrideProps` when you mean "this character differs".

## Gotchas

* The "Personal props" panel name suggests personal props are the strongest; the opposite is true when names clash.
* Removing a role from a character removes that character's overrides of its props (the editor does it for you).
* Role props are **not** shared between characters: each character has its own copy of the value; the role only supplies names and defaults.
* A typo in `rt.ch.<uid>` or the prop name throws (an undeclared character) or reads `undefined` (an undeclared prop).

See also: [[Props]], [[The rt object]], [[Characters]].
