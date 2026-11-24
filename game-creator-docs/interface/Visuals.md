---
tags: [interface, visuals]
verified: 2026-11-24
sources: dialogic/src/game/GameDescription.ts (VisualsConfiguration, LinkCategoryStyle, LinkDefaultsConfiguration), dialogic/src/game/Dialog.ts (LinkCategory), dialogic/src/lib/fonts.ts, dialogic/src/components/menuitems/visuals/*, dialogic/src/components/player/visualsClasses.ts, PlayerSettings.ts
---
# Visuals

## What it is

**Visuals** is the game-wide look of the player: fonts, text panel, link buttons, inventory layout, toasts, the stage shape, and custom
CSS. It is stored in one object, `game.visuals`. Nothing here changes game logic.

## In the editor

Sidebar **Visuals**. Every tab has hints, and most have a live preview.

### Screen

| Control | Field | Values |
|---|---|---|
| **Aspect ratio** | `aspectRatio` | `"16:9"` landscape (default) or `"9:16"` portrait for phone-shaped games. Pair portrait with the **Mobile** start menu ([[Game metadata]]). |

### Typography

| Control | Field | Notes |
|---|---|---|
| **Menu font** | `menuFontId` | in-game menus and HUD |
| **Text font** | `textFontId` | dialog and narrative text |
| **Text size (default)** | `textFontSize` | `xsmall` 14 px · `small` 17 · `normal` 22 · `large` 28 · `huge` 36 |
| **Responses font** | `responsesFontId` | link buttons |
| **Responses size (default)** | `responsesFontSize` | `xsmall` 12 px · `small` 15 · `normal` 20 · `large` 24 · `huge` 30 |

Fonts are picked from a bundled list (sans, serif, handwritten, legacy) by id, e.g. `"inter"`, `"lora"`, `"caveat"`. Check that your
font covers your language's alphabet ([[Localization]]). Sizes are **defaults**: players can override them in settings
([[In-game menu and notifications]]).

### Dialog

| Control | Field | Notes |
|---|---|---|
| **Dialog text placement** | `dialogTextAlignment` | `left`, `right` (default), `full` (where the text panel sits) |
| **Response alignment** | `responseAlignment` | `column` (default), `row`, `flexible` (how link buttons are laid out) |
| **Text background opacity** | `dialogTextBackgroundOpacity` | 0–100, default 27 |
| **Short history** | `shortHistoryVisible` | show recent exchanges above the current text |
| **Typewriter effect** / **Typewriter speed** | `typewriterEnabled`, `typewriterSpeedMs` | default on, 12 ms per character (3–80) |
| **Menu panels opacity** / **corner radius** | `menuPanelOpacity`, `menuPanelBorderRadius` | defaults 45 and 14 px |

### Link buttons (categories)

Each link has a **category** (set in the link editor; see [[Links]]): **Default**, **Action**, **Question**, **Special (icon)**,
**Special (color)**, **Class A**–**Class E**. Here you style each category once: icon, text colour, background colour, font, font size
(relative to the responses size), bold, italic, uppercase.

* **Special (icon)** takes its icon from each link's own `iconId`; **Special (color)** takes its colour from each link's `categoryColor`.
* Icon ids are `pack:name`, e.g. `tabler:heart`, `game:coins` (packs `tabler`, `lucide`, `game`); pick them in the icon picker.
* A link's own `iconId` always beats the category icon.
* The engine never branches on categories; they are purely visual. Use them to signal "this costs money", "this is a question", and so on.

### Link defaults

* **Style links by what they do** (`linkDefaults.byDirectionType`): links in the *Default* category get a style per **Direction type**
  (local, push, pop, jump, to location, talk…), so for example every "leave" link can look alike without setting categories.
* **Links leading somewhere already visited** (`markVisited`, `visitedOpacity` default 55, `visitedTextColor`): fade links whose target
  the player has already seen. What counts as visited is described in [[Known and visited]].

### Inventory

**Layout** (`inventoryLayout`): **Matrix** (grid, default), **List**, **Popup**, **Subwindow**, **Scroll**, with a live preview. Plus
**Custom CSS** for the inventory only (`inventoryCustomCss`) and a **CSS class reference** of the classes you can target.

### Notifications

Toast **Background opacity** (default 72), **Border radius** (0), **Border opacity** (0).

### Custom CSS

`customCss` is injected into the player as is. Target the player's classes, e.g. `.dialog-text`, `.dialog-variants`. It is powerful but
unversioned: class names can change between engine versions.

## In the JSON

```json
"visuals": {
  "aspectRatio": "16:9",
  "menuFontId": "inter", "textFontId": "lora", "responsesFontId": "inter",
  "textFontSize": "normal", "responsesFontSize": "normal",
  "dialogTextAlignment": "right", "responseAlignment": "column",
  "dialogTextBackgroundOpacity": 27, "shortHistoryVisible": true,
  "typewriterEnabled": true, "typewriterSpeedMs": 12,
  "menuPanelOpacity": 45, "menuPanelBorderRadius": 14,
  "notificationBackgroundOpacity": 72, "notificationBorderRadius": 0, "notificationBorderOpacity": 0,
  "inventoryLayout": "matrix", "inventoryCustomCss": "",
  "linkCategories": { "action": { "iconId": "tabler:heart", "textColor": "#ffd27a", "bold": true } },
  "linkDefaults": { "byDirectionType": false, "directionTypes": {}, "markVisited": true, "visitedOpacity": 55 },
  "customCss": ""
}
```

Missing keys fall back to the defaults when the game loads, so a hand-written file may list only what it changes.

## Gotchas

* Player settings override your sizes and typewriter choice, and they are shared by every game in that browser.
* Point-and-click scenes stay 16:9 even on a 9:16 stage ([[Point-and-click scenes]]).
* Meter colour and font are set per meter ([[HUD meters]]), not here.
* Background images are per window or location ([[Backgrounds]]); Visuals has no global background.

See also: [[Links]], [[Localization]], [[Game metadata]].
