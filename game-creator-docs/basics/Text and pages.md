---
tags: [basics]
verified: 2026-11-23
sources: dialogic/src/game/TextList.ts
---
# Text and pages

## What it is

A window's `text` is a **TextList**: a `main` string plus optional named alternatives (see [[Variants]]).
Long text is split into **pages** that the player clicks through.

## Pages

A line that contains only `---` (surrounding spaces are fine) starts a new page. Each page is trimmed, and empty
pages are dropped.

```text
7:40 a.m. Minus 22 outside, minus 4 inside.
---
In your pocket: 14 rubles and a ration coupon.
---
From the kitchen, a kettle screams.
```

That is three pages. Blank lines *inside* a page make paragraphs.

**Links appear only on the last page.** On earlier pages the player just continues. (Verified: a 3-page window reports
no links on pages 1 and 2 and its links on page 3.)

## "Click anywhere to continue"

If a window's only *visible* link has an **empty label**, the player gets no button: clicking the screen
follows it (verified: the engine reports a `continue_link` mode and lists no link buttons). Use it for
cutscenes and linear stretches.

## Choosing between texts by script

The window's `chooseTextScript` picks one of the text's variants at draw time — see [[Variants]]. It runs on every draw, so it must only *read*
the game state ([[Scripting overview]]).

## In the editor

In the window drawer open **Content → Text**. The main text is the default tab; alternative texts are extra named
tabs ([[Variants]]).

## In the JSON

```json
"text": { "main": "First page.\n---\nSecond page.", "list": [] }
```

`\n` is a newline, so `---` lines are written as `\n---\n`.

## Gotchas

* The separator must be alone on its line. `Wait --- what` does not split.
* Don't end a window with `---` and nothing after it expecting an empty last page: empty pages are dropped.
* Numbers in text are plain text. If the text shows a variable (rubles, days), the number will not update when the
  variable changes. Use a [[Variants|variant]] picked by a script, or the HUD meters (planned in [[Home]]).
