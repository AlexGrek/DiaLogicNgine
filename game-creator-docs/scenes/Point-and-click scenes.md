---
tags: [scenes, point-and-click]
verified: 2026-11-24
sources: dialogic/src/game/PointAndClick.ts, dialogic/src/exec/GameExecutor.tsx (pacZoneApply), dialogic/src/exec/RenderView.ts (renderSpecialWidget), dialogic/src/components/player/PacView.tsx, PointAndClickScene.tsx, GameUiWidgetDisplay.tsx, dialogic/src/components/menuitems/pointandclick/*, dialogic/src/components/menuitems/specialwindows/SpecialWindowsMenu.tsx
---
# Point-and-click scenes

## What it is

A **point-and-click scene** (PAC) is a picture with clickable rectangles, called **zones**: a desk, a door, a drawer. It replaces the
normal text-and-buttons layout of a **dialog window**, so you get a room to explore instead of a list of choices. Each zone can run a
script, navigate like a link, or both, and it can be hidden or greyed out by a condition.

A scene is defined once and shown by setting a window's **special widget** to `pac::<scene id>`. The window is still an ordinary window:
it has a uid, its `entryScript` runs on arrival, and links can lead to it.

## In the editor

1. Sidebar **Special windows**, then the **Point & Click** tab. Create a scene (uid), then set its background image.
   The other tabs (*Trading*, *Navigation*, *Canvas*, *Chapter opening*) are placeholders: **Not implemented yet**.
2. In the scene editor:
   * **Add Mode**: *Draw rectangles to create zones*.
   * **Edit Mode**: *Click zones to edit, drag to move*.
   * **Zone Properties** for the selected zone: **Name** (the hover label), **Idle Opacity**, **Hover Opacity**, an optional zone image,
     **Is Visible If (Script)**, **Is Disabled If (Script)**, **On Click Script**, and **Navigation**.
   * **Navigation → Navigate on click** gives the zone a link direction, edited like a [[Links|link]]'s, including
     **Use an alternative direction conditionally**. A *local* target is a window uid **in the hosting dialog**.
3. In the [[Dialogs|dialog editor]], open the window that should show the scene and pick `pac::<id>` in **Special display widget**.

## In the JSON

```json
"pacWidgets": [
  { "id": "office", "background": "office.jpg", "eventHosts": [],
    "zones": [
      { "id": "drawer", "name": "Drawer", "x": 12, "y": 55, "width": 18, "height": 15,
        "idleOpacity": 0, "hoverOpacity": 0.35,
        "isDisabledIfScript": "return rt.items.has('letter')",
        "onClickScript": "rt.items.add('letter')" },
      { "id": "door", "name": "Leave", "x": 80, "y": 10, "width": 15, "height": 75,
        "mainDirection": { "type": "local", "direction": "corridor" } }
    ] }
],
"dialogs": [ { "name": "office", "windows": [
  { "uid": "desk", "specialWidget": "pac::office", "text": { "main": "", "list": [] },
    "backgrounds": { "list": [] }, "tags": [], "links": [] }
] } ]
```

| Zone field | Meaning |
|---|---|
| `id` | unique in the scene |
| `name` | label shown on hover (also the "answer" recorded in short history) |
| `x`, `y`, `width`, `height` | **percent** of the scene, measured on a 16:9 canvas |
| `image` | optional picture drawn in the zone; without one the zone is a translucent yellow box |
| `idleOpacity`, `hoverOpacity` | 0–1; defaults 0.3 and 0.9. Use `0` idle for invisible hotspots. |
| `mainDirection`, `alternativeDirections`, `useAlternativeWhen` | navigation, same shapes as a link's ([[Links]]) |
| `isVisibleIfScript`, `isDisabledIfScript`, `onClickScript` | see below |

## At play time  *(verified on 2026-11-24)*

* The window's **text and links are not shown**; the scene takes the whole stage. Give the scene a zone that leaves.
* The window's `entryScript` runs on arrival as usual.
* The scene keeps **16:9** whatever the stage shape, and letterboxes in black, so zone percentages stay aligned with the picture. On a
  9:16 game ([[Visuals]]) the scene is small.
* Zones are re-evaluated after every click.

Clicking a zone:

1. A **disabled** zone (`isDisabledIfScript` returned true) does nothing. It is drawn faded and grey with a *not-allowed* cursor.
2. **No navigation** (no `mainDirection`, or a *local* one with an empty target): `onClickScript` runs **in place**. Its changes are kept,
   hooks fire, and the scene stays, with zones re-evaluated against the new state (verified: a click made a disabled zone clickable).
3. **With navigation**: the zone behaves **exactly like a link**. `onClickScript` runs as the link's `actionCode`, then the direction is
   followed (push, jump, tolocation, pop…), then the destination's entry runs (verified: `onClickScript` → navigation → destination
   `entryScript`).

Hidden zones (`isVisibleIfScript` returned false) are not drawn at all.

## Scriptable properties

| Property | Kind | Runs | Must return | Changes kept |
|---|---|---|---|---|
| `isVisibleIfScript` | predicate | on every render | true = shown (missing = shown) | no |
| `isDisabledIfScript` | predicate | on every render, and again on click | true = disabled | no |
| `onClickScript` | action | on click | nothing | **yes** |
| `useAlternativeWhen` | picker | on click, when alternatives exist | true = use the alternative | yes ([[Links]]) |

## Gotchas

* A scene with no navigating zone is a **dead end**; nothing else on screen leads out.
* `eventHosts` / `canHostEventsScript` on a scene are stored but **never used**: only locations roll [[Random events]].
* A *local* zone direction resolves against whichever dialog hosts the scene, so the [[Sanity check]] cannot validate it. Keep a scene in
  one dialog, or use push/jump targets.
* `specialWidget` must be exactly `pac::<id>`. A missing scene id is an error screen at play time; the [[Sanity check]] reports it.
* Disabled zones give no reason to the player (`disabled_reason` is always empty).

See also: [[Windows]], [[Links]], [[Items and inventory]].
