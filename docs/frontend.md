# Frontend Component Reference

All source under `dialogic/src/`.

---

## Image / Asset Pipeline

### `Utils.ts` — `generateImageUrl(uri, projectName?)`

Central URL resolver for all image references stored in game data.

| Stored value | Resolved URL |
|---|---|
| `"filename.png"` (plain) | `/api/v1/projects/{projectName}/images/filename.png` |
| `"game_assets/filename.png"` | `/game_assets/filename.png` (Vite static) |
| `"/absolute"` or `"http..."` | returned as-is |
| `""` | `""` |

`generateImageUrlCss(uri)` wraps this in `url(...)` for CSS `backgroundImage`.

**Rule**: all image URIs stored in `GameDescription` (backgrounds, avatars, thumbnails) are plain filenames when they come from the server upload flow, and `game_assets/<name>` when from the legacy local file list. Never store full URLs.

---

### `components/common/useServerImages.ts`

Custom hook. Encapsulates all server image state and operations.

```
useServerImages(projectName) →
  { images, uploading, fetchImages, uploadFile, thumbUrl, fileInputRef }
```

- `fetchImages()` — GET `/api/v1/projects/{projectName}/images`, sets `images: string[]`
- `uploadFile(file, onSelect)` — PUT to API, calls `onSelect(filename)` on success
- `thumbUrl(filename)` — returns `/api/v1/projects/{projectName}/image_thumbs/{filename}`

---

### `components/common/ServerImageSelect.tsx`

Reusable **Local / Server** tab switcher. No container, no preview — only the picker UI.

Props: `{ extensions?, value?, onChange, projectName? }`

- **Server tab**: `SelectPicker` from `images[]`, with thumbnail preview in menu items. "Upload image" button triggers hidden `<input type=file>` → `uploadFile`.
- **Local tab**: renders `<PublicFileUrl>` which reads `game_assets/list.json`. Strips `game_assets/` prefix before passing to `PublicFileUrl`, and re-adds it in `onChange` so stored values always carry the prefix.

Used by: `ImagePicker`, `ImageListEditor`.

---

### `components/common/ImagePicker.tsx`

Full picker with preview image below the selector. Wraps `ServerImageSelect`.

Props: `{ extensions?, value?, onChange, children?, projectName? }`

Preview URL logic (`isServerImage` helper):
- plain filename → thumbnail API URL
- `game_assets/` prefix → `generateImageUrl` (static path)

`isServerImage(v)` = `!v.startsWith('game_assets/')` and not absolute.

Used by: `LocEditor` (thumbnail), `ConfigurationMenu` (menu background), `CharEditing` (avatar preview).

---

### `components/common/text_list/ImageListEditor.tsx`

Tabbed editor for `ImageList` (main image + named list of alternatives). Each tab is an index into `imageList.list`.

- Main tab (index -1): edits `imageList.main`
- Named tabs: edit `imageList.list[i].uri` and `.name`
- `+` tab: creates new entry
- Uses `ServerImageSelect` for picking
- Preview (`displayImage`): thumbnail API for server images, `generateImageUrl` for local

Props: `{ imageList, onChange, projectName? }`

Used by: `DialogWindowEditDrawer` (backgrounds), `CharEditing` (avatar list).

---

### `components/common/PublicFileUrl.tsx`

Legacy local file picker. Fetches `game_assets/list.json` and renders a `SelectPicker`. Still used inside `ServerImageSelect`'s local tab. Values are plain filenames (no prefix).

---

## Editor UI — Image rendering in player

### `components/UiUtils.ts` — `styleWithImage(background?)`

Returns `{ backgroundImage: url("...") }` using `generateImageUrl`. Used by `PlayerCore` for main background container styles.

### `components/player/LocationView.tsx`

Renders location background via inline `url("/api/v1/projects/default/images/...")` string (hardcoded default project).

### `components/player/DialogWindowView.tsx`

Renders character avatar via `generateImageUrl(actor.avatar)`.

### `components/player/PointAndClickScene.tsx`

Uses `generateImageUrlCss` for both scene background and zone images.

### `components/menuitems/charedit/CharEditing.tsx`

Shows avatar preview via `generateImageUrl(img.main)`.

### `components/menuitems/locedit/LocationPreview.tsx`

Shows location card thumbnail via `generateImageUrl(location.thumbnail)` in CSS backgroundImage.

---

## Editor Drawers / Panels

### `components/DialogWindowEditDrawer.tsx`

Full-screen drawer for editing a `DialogWindow`. Contains:
- `TextListEditor` for window text
- `ImageListEditor` for backgrounds
- `LinksEditorPanel` for dialog links
- `PopupCodeEditor` for `chooseText`, `chooseBackground`, `onEntry` scripts
- `ActorEditor`, `SituationModifier`, `LocationPicker`

Requires `dialogHandlers: DialogHandlers` (defined in `DialogEditor.tsx`).

### `components/DialogEditor.tsx`

Main dialog graph editor. Exports `DialogHandlers` interface:
```ts
interface DialogHandlers {
    createDialogWindowHandler: (window: DialogWindow) => void;
    openAnotherWindowHandler: (window: DialogWindow) => void;
}
```

### `components/LinksEditorPanel.tsx`

Renders a list of `DialogLink` with drag-reorder. Opens `LinkEditor` drawer for editing individual links. Accepts optional `dialogHandlers` for in-place window creation/navigation.

### `components/linkedit/LinkEditor.tsx`

Edits a single `DialogLink`. Handles all link types (`local`, `push`, `pop`, `jump`, `resetjump`, `tolocation`, `toperson`, `reply`, `return`). Uses `InputPicker` (creatable) for local window refs. Uses `LocationPicker` for `changeLocationInBg`.

---

## Location Editor

### `components/menuitems/locedit/LocEditor.tsx`

Bottom drawer for editing a `Loc`. Columns:
1. UID (read-only if existing), `ImagePicker` for thumbnail, routes manager
2. Display name, `TextListEditor`, `ImageListEditor` for backgrounds, scripting panel, events panel
3. `LinksEditorPanel`

Scripting fields: `isAccessibleScript`, `isVisibleScript`, `chooseTextScript`, `choosebackgroundScript`, `onEntryScript`, `canHostEventsScript`.

### `components/menuitems/locedit/LocationPreview.tsx`

Compact location card (name + background thumbnail). Clicking opens `LocEditor`.

---

## Configuration

### `components/menuitems/configuration/ConfigurationMenu.tsx`

Game-level settings panel. Contains:
- `GeneralEditor` drawer for name/version/authors/description
- `DialogWindowPicker` for startup dialog
- `StringListEditor` for situations
- `ImagePicker` for menu background
- `StringMapEditor` for translations

---

## Common Utilities

### `components/common/StaticTabs.tsx`

Simple tab container. `keepOpen` prop currently has no effect (both branches render `renderContentSingleTab`). `_renderContentAllTabs` exists but is unused.

### `components/common/QuickWindowCreator.tsx`

Modal for creating a new dialog+window in one step. Used from link pickers when a target window doesn't exist yet.

### `components/common/magic/Magic.tsx`

Generic parameterised-operation UI. Each `MagicOperation` has a name, `parameters` map, and `onApply` callback. Renders an `InputNumber` or `Input` per parameter key.

---

## Exec Layer (relevant to image URLs)

### `exec/RenderView.ts`

`renderSpecialWidget(state, widget, _data, _dialog)` — signature takes `Dialog` type for the dialog parameter. `renderDialog` destructures `getCurrentDialogWindow` result as `[dialog, window]` where `dialog` is a `Dialog` object.

### `exec/GameState.ts`

`getCurrentDialogWindow(state)` returns `Readonly<[Dialog, DialogWindow]> | null`.
