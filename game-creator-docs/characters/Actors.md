---
tags: [characters, windows]
verified: 2026-11-23
sources: dialogic/src/game/Dialog.ts (Actor), dialogic/src/exec/RenderView.ts (getCurrentWindowActor), dialogic/src/components/common/actor/ActorEditor.tsx
---
# Actors

## What it is

An **actor** is *who is speaking* in a [[Windows|window]]. Without an actor, a window's text is plain narration. With one, the player sees that character's **name and
portrait** next to the text, so you can write conversations as ordinary windows without making the character a full dialog.

## In the editor

Window drawer → **Related → Actor**. Pick a character, optionally an avatar variant, or tick *current character*.

## In the JSON

```json
"actor": { "character": "baker", "currentCharacter": false, "avatar": "angry" }
```

| Field | Meaning |
|---|---|
| `character` | the speaker's uid |
| `currentCharacter` | `true` ⇒ ignore `character` and use **whoever the player is currently talking to** |
| `avatar` | optional: a variant of the character's `avatar` image list, by name or index (otherwise the usual portrait, including `chooseAvatarScript`) |

## At play time  *(verified)*

* A window with `actor: baker` shows the baker as speaker (name from the character's `displayName`, including `chooseNameScript`; portrait present).
* `currentCharacter: true` is for **reusable windows**: opened from the baker's dialog it shows the baker; opened from the smith's it shows the smith. Reached
  with *nobody* in conversation, it simply has no speaker — no error.
* An unknown character uid logs an error and shows no speaker **(from source)**.

## Gotchas

* Pushing a reusable window from a character dialog and popping back keeps the conversation going ([[Push]], [[Pop]], [[Character dialogs]]).
* The avatar override picks an image from *that character's* list; a name that does not exist produces an `! ERROR:` image ([[Variants]]).

See also: [[Characters]], [[Windows]].
