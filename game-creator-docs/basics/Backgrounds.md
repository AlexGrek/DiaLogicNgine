---
tags: [basics]
verified: 2026-11-23
sources: dialogic/src/game/ImageList.ts, dialogic/src/exec/GameExecutor.tsx, dialogic/src/exec/RenderView.ts, dialogic/src/components/common/text_list/ImageListEditor.tsx, dialogic/src/components/player/player.css
---
# Backgrounds

## What it is

The picture behind the text. A background is an image file belonging to the game; a [[Windows|window]] says which
one to show. Locations and character dialogs have their own backgrounds too.

## The one rule to remember: backgrounds persist

The game keeps **one current background**. It stays on screen until something *replaces* it. Three consequences
(all verified):

1. **A window without a background keeps the previous one.** Go from a window with `bgA.jpg` to a window with no
   background and `bgA.jpg` is still shown. Set a background only where the picture should change.
2. **A window changes the background only if `backgrounds.main` is set.** If you fill only the alternative
   `list` and leave `main` empty, nothing changes — even if `chooseBackgroundScript` returns a valid name.
3. **With `main` set, the picker script can override it.** If `main` is `day.jpg` and `chooseBackgroundScript`
   returns `"night"`, the window shows the image named `night` in `list` (see [[Variants]]); returning `null`
   shows `main`.

Locations and character dialogs apply **their own** background whenever they are entered **(from source)**, so
a window that follows a location does not inherit the location's picture unless it sets its own.

## In the editor

Window drawer → **Content → Background image**. The home-icon tab is `main`; **+** adds a named alternative (give
it a **Name**). Each tab has an image picker — **Select Image** — where you can choose an existing file, upload
a new one, or generate one with AI. The start-menu picture is a separate setting (`startMenu.menuBackground` in the JSON).
In the window drawer, **Scripting → chooseBackground** holds the picker script.

## In the JSON

```json
"backgrounds": {
  "main": "day.jpg",
  "list": [ { "name": "night", "uri": "night.jpg" } ]
},
"chooseBackgroundScript": "return rt.props.hour >= 20 ? 'night' : null"
```

No background at all: `"backgrounds": { "list": [] }`.

Image values are **bare filenames** of files uploaded to the game. They resolve to
`/api/v1/projects/<project>/images/<file>`. A value starting with `game_assets/`, `/`, or `http(s)://` is used
as-is instead. Referencing a file that was never uploaded shows nothing; the editor's **Game configuration →
Sanity check** reports missing files.

## How it is drawn

The player paints the background to fill the whole stage with `background-size: cover; background-position: center`:
the image is **scaled up or down to cover the stage and the overflow is cropped**, centred. It is not distorted.

So:

* **Match the stage's shape.** The stage is 16:9 landscape or 9:16 portrait, set by the game's `visuals.aspectRatio`.
  An image of another ratio loses its edges.
* **Use enough pixels.** The stage can be large; a small image is enlarged and looks blurry. As a rule of thumb,
  use **1280×720** or more for 16:9 (**720×1280** for 9:16). JPEG keeps files small; PNG suits flat art.
* Allowed formats for upload: PNG, JPEG, WebP, GIF.
* Keep the important part of the picture near the centre, since the edges may be cropped on other screens.

## Uploading many images

The editor uploads one image at a time. For a whole set, or full-resolution originals, use the `dialogic` CLI:
`dialogic assets push <project> a.jpg b.jpg` (see its README in the repo's `cli/` folder). Avoid sending big
images through an AI assistant's inline `upload_image` call: it has to be retyped as base64, which pushes people to
shrink images until they look blurry.

## Scriptable properties

| Property | Kind | When it runs | Returns | Changes kept? |
|---|---|---|---|---|
| window `chooseBackgroundScript` | picker | when the window is entered, **only if `backgrounds.main` is set** | variant name, index, or `null` (= `main`) | no |

A window's `entryScript` runs **after** the background is updated, so it can read the new picture in `state.background`
(verified). Location and character-dialog pickers are documented with those features (planned). See [[Order of execution]].

## Gotchas

* **Extension must match.** A window that references `room.png` will not find `room.jpg`. The name in the game
  must equal the uploaded filename exactly, including case and extension.
* **List-only backgrounds never apply** (rule 2 above) — the most common reason "my night background doesn't show".
* An unknown variant name in `chooseBackgroundScript` produces an `! ERROR: …` string as the image
  (see [[Variants]]), i.e. no picture.
* Coming back to a window with [[Pop]] (or staying on it with a [[Quick reply]]) re-runs its entry, so a window that has a
  `main` background puts its picture back; a window without `main` keeps whatever is currently shown.
