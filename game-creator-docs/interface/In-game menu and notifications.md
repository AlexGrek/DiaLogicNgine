---
tags: [interface, player]
verified: 2026-11-24
sources: dialogic/src/components/player/GameMenuPanel.tsx, GameNotificationsView.tsx, PlayerCore.tsx, MenuTab.tsx, InventoryTab.tsx, ObjectivesTab.tsx, PlayerSettings.ts, dialogic/src/exec/GameState.tsx (InGameNotificationType)
---
# In-game menu and notifications

What the player sees around your story. None of it needs authoring, but your facts, items and quests fill it, and [[Visuals]] restyles it.

## The menu

A button at the bottom of the screen opens the menu panel with four sections:

| Button | Shows | Filled by |
|---|---|---|
| **Inventory** | carried items, item details, **Use** | [[Items and inventory]] |
| **Knowledge** | tabs **Facts** (learned facts, full text as markdown) and **People** (characters met, with their description) | [[Facts]], [[Known and visited]], [[Characters]] |
| **Journal** | tabs **Open**, **Completed**, **Failed**: quests grouped by quest line, with their touched tasks | [[Quests]] |
| **Menu** | save, load, new game, settings, about | [[Saving and loading]] |

While the menu is open, the story underneath is faded and cannot be clicked. All button and tab names are interface strings, translatable
in [[Localization]].

### Settings (player-side)

**Menu → Settings** lets each player change **text size**, **responses size**, the **typewriter** effect (letter by letter) and its speed,
and **short history**.

* Your [[Visuals]] values (default sizes, typewriter on/off and speed) are only the **starting point**. Once a player changes a setting,
  their choice wins.
* Player settings are saved **in the browser for all DiaLogicNgine games at once**, not per game (from source). A player who turned the
  typewriter off in one game has it off in yours.
* *Short history* can only be shown if you enabled it in Visuals.

## Notifications (toasts)

Small toasts slide in at the top when something changes. Each one lasts about 3.5 seconds; clicking it opens the matching menu section
(items → Inventory, quests → Journal).

| Toast label | When |
|---|---|
| **Item received** | `rt.items.add(...)`, with the item's thumbnail and *×n* |
| **New quest** / **Quest closed** | a quest line opens / closes |
| **New objective** | a quest opens |
| **Objective updated** | a task completes or fails |
| **Objective completed** / **Objective failed** | a quest completes / fails |
| **Item lost** | defined, but **never sent**: removing items is silent (from source) |

Facts, props, situations and locations produce no toasts. To announce something else, write it into the story text.

If more than 5 notifications arrive at once (for example after loading a save) they are skipped rather than flooding the screen.

Toast look (background opacity, border radius, border opacity) is set in **Visuals → Notifications**.

See also: [[HUD meters]], [[Visuals]], [[Localization]].
