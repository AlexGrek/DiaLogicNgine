---
tags: [tooling, validation]
verified: 2026-11-24
sources: dialogic/src/game/sanityCheck.ts, dialogic/src/components/menuitems/configuration/SanityCheckPanel.tsx, .claude/skills/game_json/scripts/validate_game.py
---
# Sanity check

## What it is

Everything in a game is wired by uid strings, and nothing stops you from deleting a window that links still point at. The **sanity
check** walks the whole game looking for **dangling pointers**: references whose target does not exist. It reports them before a player
walks into them.

## In the editor

Sidebar **Game Properties → Sanity check** tab ([[Game configuration menu]]). It runs when opened and lists issues with:

* a **category**: *link*, *reference* or *file*;
* a **severity**: **error** (will break at play time) or **warning** (suspicious, maybe intended);
* where it is, and the missing target;
* for issues inside a dialog, a button that opens that dialog.

A button re-runs it after you fix things (it reloads the server's image list).

## What it checks

| Where | Errors | Warnings |
|---|---|---|
| **Startup dialog** | malformed (not `{kind: "window", dialog, window}`) or pointing at a missing dialog or window | — |
| **Links** in windows, locations and character dialogs (main and alternative directions) | push / jump / reset-jump to a missing dialog or window; local link to a missing window; to-location or talk-to-person target missing; `changeLocationInBg` location missing | a link with no target; a local link used outside a dialog |
| **Windows** | actor's character missing; `changeLocationInBg` location missing; `pac::<id>` scene missing | `changeSituation` not a declared situation |
| **Locations** | `routes` or `goto` entries pointing at missing locations | — |
| **Characters** | discussion links (as above); reaction `dialogWindow` missing | — |
| **Events** | destination window missing | — |
| **Point-and-click zones** | navigation targets missing (except *local* and *pop*, which depend on the hosting dialog) | — |
| **Images** | any image file referenced anywhere but **not on the server** (one entry per file) | — |

It also reports counts (dialogs, windows, links and image references checked).

## What it does *not* check

The sanity check does not read scripts. It also skips some references (from source):

* uids inside **scripts**: `rt.props.typo`, `rt.facts.x`, `rt.items.add('x')`, quest paths in `rt.objectives`;
* **reaction triggers** (facts, characters, items and places named in `trigger`);
* **event targets** and location / character **event hosts**;
* **character roles**, **quest `path`s**, **hook** strings;
* unreachable windows, and dead ends (windows with no way out).

For those, run the repo's validator on the JSON:

```sh
dialogic game get my_game -o game.json
python3 .claude/skills/game_json/scripts/validate_game.py game.json          # errors and warnings
python3 .claude/skills/game_json/scripts/validate_game.py --strict game.json # fail on warnings too
```

It mirrors the sanity check's link rules and adds the checks above, except image files.

## Gotchas

* A clean sanity check does not mean the game works. Scripts can still throw, and conditions can still hide every link. Play it
  ([[Playtesting]]).
* Image checks need the server's image list. If it cannot be loaded, image checking is skipped.

See also: [[JSON import and export]], [[Links]], [[Playtesting]].
