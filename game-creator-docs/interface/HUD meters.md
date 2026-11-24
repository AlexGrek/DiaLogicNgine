---
tags: [interface, hud, meters]
verified: 2026-11-24
sources: dialogic/src/game/GameUiElementDescr.ts, dialogic/src/exec/GameUiElementsProcessor.ts, dialogic/src/components/player/GameUiElementsView.tsx, GameMeterUiElementView.tsx, MicroProgressBar.tsx, PlayerCore.tsx, dialogic/src/components/menuitems/uielements/*
---
# HUD meters

## What it is

A **meter** is a small always-visible readout in the player's top bar: money, health, hope, the date. Each meter has a **value script**
that computes what to show from the current state, so it always reflects your [[Props]]. A meter shows either:

* the value as **text** (a number or any string), or
* a **progress bar** between a minimum and a maximum.

Meters only display; they cannot be clicked.

## In the editor

Sidebar **UI Elements**, **Meters**. Create a meter by uid; click a card to open **Edit meter**:

| Control | Field | Notes |
|---|---|---|
| *display meter name* | `name` | **editor-only label: not shown in the player** (from source) |
| **Layout →** *meter opacity* | `layout.opacity` | 0–1 |
| **Font** | `fontId` | optional; otherwise the menu font |
| **Icon** | `iconId` | optional 16 px icon before the value, as `pack:name` (`tabler:heart`, `game:coins`; packs `tabler`, `lucide`, `game`). **This is the way to label a meter.** |
| **Color** | `color` | text colour, or the bar's fill colour (default white); **Clear** resets |
| **Behavior → value** | `value` | script returning what to show |
| **Behavior → visibleIf** | `visibleIf` | predicate; hide the meter when false |
| **Progress → Progress bar** toggle | `progressBar` | on: show a bar with **max**, **min**, colour thresholds |

## In the JSON

```json
"uiElements": { "meters": [
  { "uid": "money", "name": "Rubles", "value": "return rt.props.money + ' ₽'",
    "layout": { "opacity": 1 }, "iconId": "game:coins", "color": "#f2d16b", "progressBar": null },
  { "uid": "hope", "name": "Hope", "value": "return rt.props.hope", "visibleIf": "return rt.props.day > 1",
    "layout": { "opacity": 0.9 }, "color": "#9ad",
    "progressBar": { "min": 0, "max": 10, "colors": false, "yellowLevel": 25, "redLevel": 10 } }
] }
```

## At play time

* Every time the screen renders, each meter's `visibleIf` is checked (missing = visible), and then `value` is evaluated.
* Meters sit in the top bar, left to right in list order, next to the in-game controls.
* **Text meter:** the returned value is printed as is. Format it in the script, e.g. `return rt.props.day + ' / 30'`. A missing `value`
  shows `0`.
* **Bar meter:** the value is turned into a number (`parseFloat`) and the fill is `(value − min) / (max − min)` of a 100 × 20 px bar.
  The number itself is **not** printed. Values above `max` are clipped to a full bar.

## Scriptable properties

| Property | Kind | Runs | Must return | Changes kept |
|---|---|---|---|---|
| `value` | value | every render | number or string | no |
| `visibleIf` | predicate | every render | true/false (missing = true) | no |

Both run often, so keep them fast and free of side effects; their changes are discarded anyway ([[Scripting overview]]).

## Gotchas

* **The meter `name` is never shown.** Players see a bare number, so either use an **icon** or put the label in the value
  (`return 'Hope ' + rt.props.hope`). A bar has no label at all unless it has an icon.
* **`colors`, `yellowLevel` and `redLevel` do nothing** (from source). The bar is always one colour, `color` or white. For a warning colour,
  use two meters with opposite `visibleIf` conditions and different colours.
* There is no number on a bar; pair it with a text meter if the exact value matters.
* A value script that throws shows nothing useful. Test it with the [[Script editor]] or a debug session.
* Meter texts come from your scripts, so they are not translated by the interface table; translate them in the script ([[Localization]]).

See also: [[Props]], [[Visuals]], [[In-game menu and notifications]].
