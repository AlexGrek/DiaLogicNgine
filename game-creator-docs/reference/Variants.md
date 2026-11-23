---
tags: [reference]
verified: 2026-11-23
sources: dialogic/src/game/TextList.ts, dialogic/src/game/ImageList.ts, dialogic/src/exec/GameExecutor.tsx
---
# Variants (alternative texts and images)

## What it is

Text ([[Text and pages]]) and images ([[Backgrounds]]) can hold a default plus **named alternatives**. A small
script then chooses which one is shown. This is how one window shows different content depending on what the
player did, without duplicating the window.

## The selection rule

The "choose" script (`chooseTextScript`, `chooseBackgroundScript`, and other pickers) returns:

| Returned value | Result |
|---|---|
| `null`, `undefined` or `-1` | the `main` entry |
| a **string** | the entry whose `name` equals it |
| a **number** `0…n-1` | the entry at that index in `list` |
| anything else, or no match | an error string beginning `! ERROR:` is shown **instead of** the content |

Picker scripts are read-only: state changes made inside them are thrown away. Do the changing in `entryScript` or a
link's `actionCode`.

## Example

```json
{
  "uid": "q_wait",
  "text": {
    "main": "Four hours.",
    "list": [
      { "name": "got",  "text": "At the window, a grey loaf lands in your hands." },
      { "name": "none", "text": "A woman in a stained apron says: \"Bread's out.\"" }
    ]
  },
  "chooseTextScript": "return rt.props.queueWon ? 'got' : 'none'",
  "backgrounds": { "main": "queue.jpg", "list": [] },
  "links": []
}
```

(`main` is shown only when the script returns `null`.)

## In the editor

In **Content → Text** (or **Background image**) each alternative is an extra tab with a **Name** field and a trash
button; the first tab is `main`. The picker script is edited under **Scripting**.

## When the picker script fails

A picker that **throws** is treated as returning `false`, which matches no variant, so the player sees
`! ERROR: cannot find text identified by <false>` in place of the text (verified) and the game continues. Check pickers
for typos in names and for property reads on undeclared props.

## Gotchas

* The name in the script and the name on the tab must match exactly. A typo shows `! ERROR: cannot find text with id <…>`
  in the game.
* For backgrounds, the picker is only consulted when `main` is set — see [[Backgrounds]].
* Translating a game: translate every variant's `text`, but leave the **names** (`got`, `none`) alone, because scripts refer to them.
