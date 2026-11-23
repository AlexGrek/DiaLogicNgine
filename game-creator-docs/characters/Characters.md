---
tags: [characters]
verified: 2026-11-23
sources: dialogic/src/game/Character.ts, dialogic/src/exec/RenderView.ts (getCurrentWindowActor, getCharInfoDescription), dialogic/src/components/menuitems/charedit/CharEditing.tsx, CharMenu.tsx
---
# Characters

## What it is

A **character** is a person (or creature, or talking object) in your world. It gives the game three things:

1. **An identity** — a name, a description and portraits that appear when the character speaks ([[Actors]]) and in the player's *People* list.
2. **A conversation** — an optional [[Character dialogs|dialog]] the player can open with a [[Talk to person]] link, and in which topics can be discussed
   ([[Discussion and reactions]]).
3. **Variables** — personal and role props readable from scripts as `rt.ch.<character>.<prop>` ([[Roles and character props]]).

A character with **no dialog** can still be a speaker in windows and a discussion topic; it just cannot be talked to.

## In the editor

The Characters section creates a character from a uid ("Create characters (NPCs) and customize their behavior and properties"). A character page shows its
portrait and uid, buttons **Dialog…**, Copy and Delete, and these panels:

| Panel | What it holds |
|---|---|
| **Display name** | one-line text with variants (e.g. a nickname once the player has earned it) |
| **Avatar Image** | the portrait, with variants (moods, outfits) — an image list ([[Backgrounds]] explains image lists) |
| **Roles** | which roles the character has, and per-character overrides of role props ([[Roles and character props]]) |
| **Personal props** | props only this character has |
| **Scripting** | `chooseNameScript`, `chooseAvatarScript`, `chooseDescriptionScript` |
| **Display description** | what the *People* list shows about them, with variants |

**Dialog…** opens the dialog editor ([[Character dialogs]]).

## In the JSON

```json
{
  "uid": "baker",
  "displayName":  { "main": "Baker", "list": [ { "name": "friend", "text": "Marta" } ] },
  "description":  { "main": "Bakes before sunrise.", "list": [] },
  "avatar":       { "main": "baker.jpg", "list": [ { "name": "angry", "uri": "baker_angry.jpg" } ] },
  "chooseNameScript": "return rt.props.metBaker ? 'friend' : null",
  "props": [], "overrideProps": [], "roles": ["shopkeeper"],
  "discussable": true,
  "dialog": { "…": "see Character dialogs" }
}
```

| Field | Meaning |
|---|---|
| `uid` | identity; used by links, windows' `actor`, reactions, `rt.ch.<uid>` |
| `displayName`, `description` | texts with [[Variants]] |
| `avatar` | image list; `main` is the default portrait |
| `chooseNameScript`, `chooseAvatarScript`, `chooseDescriptionScript` | pickers returning a variant name/index/`null` |
| `props`, `roles`, `overrideProps` | variables — [[Roles and character props]] |
| `discussable` | `false` hides the character from the "People" discussion topics |
| `dialog` | present ⇒ the character can be talked to |
| `traits` | stored, **never used** by the engine |

## At play time

* **Name variants work.** With `chooseNameScript` returning `'angry'`, the conversation title read *Talking with Angry Npc* and the speaker and topic list used
  the same name (verified). The name picker is a read-only picker script ([[Scripting overview]]).
* The character becomes **known** the first time the player enters their dialog ([[Known and visited]]); only known characters appear as discussion topics.
* The *People* tab lists known characters with the picked name, avatar and description.

## Scriptable properties

| Property | Kind | Runs | Returns | Changes kept? |
|---|---|---|---|---|
| `chooseNameScript` | picker | every draw that shows the name | variant of `displayName` | no |
| `chooseAvatarScript` | picker | every draw that shows the portrait | variant of `avatar` | no |
| `chooseDescriptionScript` | picker | when the *People* list is drawn | variant of `description` | no |

## Gotchas

* A character is a **database entry**, not a position: the player is never "in" a character except inside its dialog.
* Name and avatar scripts decide **the variant**, not state: do the changing in an action script and let the picker read a prop.
* `traits` is dead data; use roles/props instead.

See also: [[Character dialogs]], [[Actors]], [[Locations]].
