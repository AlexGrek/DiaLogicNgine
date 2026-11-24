---
tags: [configuration, localization]
verified: 2026-11-23
sources: dialogic/src/exec/Localization.ts, dialogic/src/components/menuitems/configuration/ConfigurationMenu.tsx, dialogic/src/components/player/*.tsx (every localization.local(...) call), dialogic/src/lib/fonts.ts
---
# Localization

## What it is

There are **two separate things** to localize, and the engine helps with only one of them:

| Layer | What it covers | Built-in support |
|---|---|---|
| **Interface** | the player's own words: menu buttons, tab names, save-game screen, settings, notification labels | **Yes** — a translation table in the game |
| **Story content** | everything *you* wrote: window text, link labels, character and item names, quest text, HUD labels | **No** — there is no multi-language switch; make one game per language |

## 1. Translating the interface

### In the editor

**Game configuration → Localization** is a key → value editor. Each row is one interface string: the left side is the **English original, exactly as
the player would see it**, the right side is your replacement.

### In the JSON

```json
"translations": {
  "Menu": "Меню",
  "Inventory": "Инвентарь",
  "Save": "Сохранить",
  "Start new game": "Начать заново"
}
```

### How lookup works

For every interface string the player looks it up in this table by the **exact English text**:

* found with a non-empty text → your translation is shown;
* missing, empty (`""`) or a number → the English original.

So an untranslated game is just an empty table, and you can translate as many or as few strings as you like. Keys are **case-sensitive and
punctuation-sensitive** (`Discuss...` has three dots; `Save name (optional)` has parentheses).

A game created in the editor starts with 21 common keys present and blank **(from source)**; a game created through the MCP or `dialogic editor create_project`
starts with an **empty table**, so add the keys you need.

### Every key the player looks up

Taken from every place the player code calls the translation function (43 in all):

| Where it appears | Keys |
|---|---|
| **Game menu** (the buttons) | `Inventory`, `Knowledge`, `Journal`, `Menu` |
| **Knowledge / people tabs** | `Facts`, `People`, `Known people` |
| **Journal** (quests) | `Open`, `Completed`, `Failed` |
| **Talking to a character** | `Discuss...`; in the topic picker `People`, `Facts`, `Items`, `Places`, `Cancel` |
| **Menu tab: saves** | `Saves`, `Quicksaves`, `Autosaves`, `Create new save`, `Save name (optional)`, `Save`, `Load`, `Delete`, `step`, `No saved games yet`, `Your saves will appear here` |
| **Menu tab: restart & About** | `New game`, `Start new game`, `Confirm restart`, `About` |
| **Menu tab: settings** | `Settings`, `Text size`, `Text speed`, `Letter by letter`, `Answers size`, `Short history` |
| **Pop-up notifications** | `Item received`, `Item lost`, `New objective`, `Objective updated`, `Objective completed`, `Objective failed`, `New quest`, `Quest closed` |

Editor-made games pre-fill 21 of these 43 keys (`Discuss...`, `Facts`, `Knowledge`, `Inventory`, `Menu`, `Journal`, `Known people`, `People`, `Items`, `Places`, `Cancel`, `Open`, `Failed`,
`Completed`, `Create new save`, `Save`, `About`, `New game`, `Load`, `Start new game`, `Confirm restart`). The other 22 — the settings, save-screen
extras and notification labels — work the same; just add them yourself.

### What stays English

* A few strings are not routed through the table, for example the hint `Choose item below` in the item picker and the inventory's
  **Use** button ([[Items and inventory]]).
* The **Restart / State / Go to** bar is a developer tool of the editor preview; it is hidden when a game is opened through its public play link.
* Engine error text such as `! ERROR: …` ([[Variants]]).

## 2. Translating the story

Link labels, HUD meter values ([[HUD meters]]) and similar strings are **plain text with no variant mechanism**, so one game cannot switch language in place
(window text could, via [[Variants]] and a script, but the buttons could not). The practical approach is **one game per language**.

### Recommended: a copy per language

```bash
dialogic clone kommunalka_1991 kommunalka_1991_ru -title "Коммуналка 1991"   # JSON + all images, byte-exact
dialogic game get kommunalka_1991_ru -o ru.json                              # edit the texts
dialogic game put kommunalka_1991_ru ru.json
```

Then, in the copy, translate everything a player can read and leave everything the engine reads:

| Translate | Leave exactly as is |
|---|---|
| window `text.main` and each `text.list[].text` | all `uid`s, dialog names, prop names |
| link `text` and `replyText` | `---` page separators, blank-line paragraphs |
| HUD meter `name` | the `name` of text/image variants (`got`, `none`, `night`) — **scripts refer to them** |
| `general.name` and `general.description` | scripts, conditions, hook strings, function bodies |
| character `displayName`/`description`, item `name`/`description`, fact `short`/`full`, location `displayName`/`text`, quest and task text | numbers that scripts also use (prices, thresholds) — change the *wording*, keep the *values* |
| the `translations` table (interface) | |

Checks that caught mistakes when the Russian copy of *Kommunalka 1991* was made: same number of pages (`---`) and paragraphs per window,
same number of links, same numbers in every sentence (unless intentionally changed), and an unchanged diff of every `actionCode` / `isVisible`.
An automatic comparison like that is cheap and catches a lost `---` or a stray edit to a script.

Remember:

* **Give each copy its own `general.name`** — saved games are filed by game name in the player's browser, so two games with the same name share
  saves ([[Game metadata]]).
* The copies are independent: fixing a bug or adding a scene in the original does not reach the translations. Do structural work first, translate last, and
  re-run the comparison when the original changes.
* Each language appears as its own game in the gallery.

## 3. Fonts and layout

* Pick a font that has the letters your language needs. In the Visuals font picker (68 fonts), these ship **Cyrillic**: Inter, Raleway, Nunito, Manrope,
  Plus Jakarta Sans, Rubik, Playfair Display, Lora, Merriweather, EB Garamond, PT Serif, Cormorant Garamond, Spectral, Vollkorn, Caveat, Pacifico,
  Amatic SC, JetBrains Mono, Fira Code, Source Code Pro, IBM Plex Mono, Roboto Mono, Overpass Mono, Oswald, Lobster, Black Ops One, Russo One and Press Start 2P.
  The rest are Latin-only (the three legacy fonts — Involve, Palanquin, M PLUS 1p — were not checked). This was determined from the font packages' own
  glyph ranges, not by eye; for a final check, play the game.
* Other scripts (Greek, CJK, Arabic, Hebrew…) and right-to-left text were **not investigated**.
* Translated text is often longer than English. Re-check page breaks and button widths in the player at your chosen aspect ratio ([[Backgrounds]] explains the stage).

## Gotchas

* A key with a typo or different capitalization silently does nothing — the English stays.
* Translating the interface does **not** touch your story text, and vice versa.
* `translations` values must be text; numbers are ignored.
* The language of the start screen's description, title and version is whatever you put in [[Game metadata]].

See also: [[Game configuration menu]], [[Variants]], [[Game metadata]].
