---
name: frontend
description: Work on the DiaLogicNgine React/TypeScript frontend (editor + player). Use when touching components, routing, game data model, editor features (dialogs, links, copy/paste, chain editor, PAC zones), player views, or the IUpds state interface.
---

# Frontend Skill

## Stack

- **React 18** + **TypeScript** + **Vite** (project root: `dialogic/`)
- **rsuite 5** — primary UI library (layout, form controls, drawers, panels, dark theme via `CustomProvider`)
- **lucide-react** — supplemental icons
- **react-router-dom 7** — client-side routing (BrowserRouter)
- **lodash** — deep cloning (`cloneDeep`) for immutable state updates
- **@uiw/react-textarea-code-editor** — in-editor script editing

## Commands (run from `dialogic/`)

```bash
npm run dev      # Vite dev server with HMR
npm run build    # tsc + vite build
npm run lint     # ESLint, zero-warnings tolerance
```

## Entry points

| File | Purpose |
|------|---------|
| `src/App.tsx` | Editor UI — layout + all routes |
| `src/AppGameRuntime.tsx` | Standalone player (no editor chrome) |
| `src/main.tsx` | React root, wraps `<App>` in `<BrowserRouter>` |

---

## Layer separation

```
src/game/       pure data-model types — no React, no side effects
src/exec/       game execution engine — state machine, script eval, processors
src/components/ React UI — editor views + player views
src/savegame/   browser localStorage persistence for runtime save slots
```

**Rule:** `game/` and `exec/` must never import from `components/`.

---

## Routing (App.tsx)

`AppLayout` is the layout route (header + `SidePanel` sidebar + `<Outlet>`). All section routes are children:

| Path | Component | Notes |
|------|-----------|-------|
| `/dialog` | `DialogRoute` | No dialog selected |
| `/dialog/:dialogId` | `DialogRoute` | Loads dialog by name from URL |
| `/player` | `PlayerRoute` | Game player |
| `/saveload` | `SaveLoadRoute` | Save/Load menu |
| `/config` | `ConfigRoute` | Game properties |
| `/locs` | `LocsRoute` | Location editor |
| `/chars` | `CharsRoute` | Character & role editor |
| `/scripts` | `ScriptsRoute` | Props & events editor |
| `/facts` | `FactsRoute` | Facts & objectives |
| `/items` | `ItemsRoute` | Inventory items |
| `/ui` | `UiRoute` | HUD/UI element editor |
| `/pac` | `PacRoute` | Point-and-click scene editor |

**Navigation:** always use `useNavigate()` — never `window.location`. Dialog links use `navigate('/dialog/' + encodeURIComponent(name))`.

**Active route in sidebar:** `SidePanel` reads `useLocation()` to derive `activeKey` — no prop needed.

**Outlet context** (`AppOutletContext`): route components access shared state via `useOutletContext<AppOutletContext>()`:
```ts
type AppOutletContext = {
  game: GameDescription;
  updates: IUpds;
  setGame: Dispatch<SetStateAction<GameDescription>>;
  handleNotify: NotifyCallback;
  setActiveDialog: (id: string) => void;
};
```

---

## State management

All editor state lives in `AppLayout` as `useState<GameDescription>`. There is no Redux or React Context — state flows down as props and mutations flow up through the `IUpds` callback interface.

### IUpds — the mutation interface

```ts
interface IUpds {
  handleDialogEdit(dialog: Dialog): void;
  handleDialogCreate(dialog: Dialog): void;
  handleDialogApplyChange(func: DialogWindowListUpdater, dialog_uid: string | null): void;
  handleDialogWindowChange(window: DialogWindow, dialog_uid: string | null, create?: boolean): void;
  handleLocChange(locs: Loc[]): void;
  handlePropChange(props: Prop[]): void;
  createProp(prop: Prop): void;
  createSituation(situation: string): void;
  notify: NotifyCallback;
  copy(obj: unknown, typename: string): void;
  paste(): CopiedObject | undefined;
  handleGameUpdate(game: GameDescription): void;
}
```

All handlers are `useCallback`-wrapped in `AppLayout` and collected into `updates` via `useMemo`. Pass `updates` (typed as `IUpds`) down to components via props or outlet context.

**Immutability rule:** always produce new objects — spread for shallow, `lodash.cloneDeep` for deep.

```ts
// shallow
setGame(prev => ({ ...prev, locs }));

// deep
const copy = lodash.cloneDeep(someNestedObject);
```

---

## Game data model (`src/game/`)

Root type: `GameDescription` — the entire serialized game definition.

| Field | Type | Description |
|-------|------|-------------|
| `dialogs` | `Dialog[]` | All dialog graphs |
| `chars` | `Character[]` | Character definitions |
| `roles` | `Role[]` | Character roles/traits |
| `locs` | `Loc[]` | Game locations |
| `props` | `Prop[]` | Game variables (number/string/bool/variant/location) |
| `facts` | `Fact[]` | Boolean game facts |
| `items` | `Item[]` | Inventory items |
| `events` | `GameEvent[]` | Scripted game events |
| `eventHosts` | `string[]` | Custom event hosts |
| `objectives` | `QuestLine[]` | Quest lines + tasks |
| `situations` | `string[]` | Named game situations |
| `uiElements` | `GameUiElementDescr` | HUD meter/widget definitions |
| `pacWidgets` | `PointAndClick[]` | Point-and-click scene definitions |
| `translations` | `Translations` | String→string localization map |
| `startupDialog` | `DialogWindowId` | Entry point (dialog + window) |
| `startMenu` | `StartMenuConfiguration` | Main menu background |
| `general` | `GeneralGameInfo` | name, version, description, authors |

### Dialog graph types (`src/game/Dialog.ts`)

```
Dialog
  └── windows: DialogWindow[]
        ├── uid: string
        ├── text: TextList          (main text + variants)
        ├── links: DialogLink[]
        ├── actor: Actor | null     (speaking character)
        ├── backgrounds: ImageList
        ├── entryScript: string     (JS run on enter)
        ├── tags: string[]
        └── specialWidget: string | null

DialogLink
  ├── mainDirection: LinkDirection  (type + target)
  ├── alternativeDirections: LinkDirection[]
  ├── text: TextList
  ├── actionCode: string            (JS run on follow)
  ├── textProcessingCode: string
  ├── isVisible: string             (JS → bool)
  ├── isEnabled: string             (JS → bool)
  └── useAlternativeWhen: string    (JS → bool)
```

### Link types (`LinkType` enum)

| Value | Meaning |
|-------|---------|
| `local` | Move to another window within the same dialog |
| `push` | Navigate to another dialog, push current position on stack |
| `pop` | Return to previous stack position |
| `jump` | Jump to any window (stack unchanged) |
| `resetjump` | Jump to window, clear entire stack |
| `tolocation` | Navigate to a location |
| `toperson` | Open a character's discussion |
| `reply` | Quick-reply (auto-advances) |
| `return` | Return to caller (used with push) |

---

## Editor features

### Dialog editor flow

1. `SidePanel` lists dialogs; clicking navigates to `/dialog/:name`
2. `DialogRoute` finds the dialog by name from `game.dialogs` and passes it to `DialogEditor`
3. `DialogEditor` renders a scrollable row of `WindowEditor` tiles + toolbar (add window, chain)
4. Clicking a tile opens `DialogWindowEditDrawer` — a full-height rsuite Drawer with tabs:
   - **Text** — `TextListEditor` for main text + reply variants
   - **Images** — background list
   - **Actor** — character avatar picker
   - **Links** — `LinksEditorPanel`
   - **Entry script** — `PopupCodeEditor`
   - **Tags**

### LinksEditorPanel

Three modes (toggled by toolbar buttons):
- **View** — compact `LinkShortView` cards for each link
- **Edit** — full `LinkEditor` for the selected link:
  - `LinkTypeTag` selector (chooses `LinkType`)
  - Target picker (window / location / character, depending on type)
  - `PopupCodeEditor` for action, visibility, enable, alternative scripts
  - Alternative directions list (conditional branching)
- **Reorder** — drag-and-drop reordering via `react-drag-reorder`

### Copy / paste

`CopiedObject = { value: unknown, typename: string }` stored in `AppLayout` state.

- `handlers.copy(obj, typename)` — deep-clones and stores
- `handlers.paste()` — returns the stored object (or `undefined`)
- Callers check `typename` to validate before applying
- Used in: `LinksEditorPanel` (copy/paste links), `PropsEditMenu` (copy/paste props)
- UI: `CopyButton` / `PasteButton` in `src/components/common/copypaste/`

### Chain editor (`src/components/chain/ChainEditor.tsx`)

Rapid sequential dialog creation:
- Input: list of text stubs + link button labels
- Output: auto-linked `DialogWindow[]` with generated UIDs
- Triggered from `DialogEditor` toolbar (Chain button)
- Result is applied via `handlers.handleDialogApplyChange`

### Point-and-click editor (`/pac` route)

- `PointAncClick` manages a list of `PointAndClick` scene definitions
- Each scene has a background image + `PointAndClickZone[]`
- Zones have position, size, and trigger scripts
- Edited via `PointAndClickEditor`

### JSON mode (Save/Load menu)

- **Export**: `DownloadAsJson` serializes `GameDescription` to a formatted JSON file
- **Import**: `UploadJson` / `SaveLoadJsonDrawer` parses and patches incoming JSON
- Version migration is applied via `loadJsonStringAndPatch(text, ENGINE_VERSION)` from `src/game/Patches.ts`
- Local-storage saves: `SaveLoadManager` in `src/SaveLoadManager.ts`

### Script editor (`/scripts` route, `PropsEditMenu`, `PopupCodeEditor`)

Scripts are authored as JS function bodies, evaluated at runtime via:
```js
window.eval(`(rt, state, props, ch, facts, objectives, situation, items, context) => { ${code} }`)
```
`rt` is a `RuntimeRt` proxy wrapping `State` with readable/writable descriptors for `rt.props.*`, `rt.ch.<uid>.*`, `rt.facts.*`, etc.

`PopupCodeEditor` (rsuite Drawer + `@uiw/react-textarea-code-editor`) is reused throughout for all inline script fields. It accepts `PopupCodeEditorUi` config with function name, argument list, and template snippets.

---

## Player (`/player` route)

### Execution layer

`GameExecManager` (`src/exec/GameExecutor.tsx`) is the core:
- Takes a `GameDescription` and drives `State` transitions
- Key methods: `getCurrentDialogWindow`, `getCurrentLocation`, `goToLocalLink`, `pushLink`, `popLink`, `jumpLink`, `resetJumpLink`
- Delegates to: `EventsProcessor`, `DiscussionProcessor`, `QuestProcessor`, `GameUiElementsProcessor`

`State` (`src/exec/GameState.tsx`) is the mutable runtime snapshot:
- `position` — current `UiObjectId` (dialog window / location / char dialog)
- `positionStack` — navigation history for push/pop
- `props` — runtime key→value store
- `knownFacts`, `carriedItems`, `happenedEvents`, `progress` — game progress
- `notifications` — in-game notification queue

### Render layer

`GameExecManager.renderer.render(state, background)` → `RenderView` (a prepared data bag — no React).

`PlayerCore` reads the `RenderView` type and renders the matching view component:

| RenderView type | Component |
|----------------|-----------|
| `DialogWindowView` | Dialog text + actor avatar + link buttons |
| `LocationView` | Location description + exit links |
| `CharDialogView` | NPC dialog + discussion topics |
| `PacView` | Point-and-click scene with zone overlays |

`PlayerCore` also handles:
- Background fade transitions (CSS class toggling)
- State display drawer (`StateDisplayDrawer`) for debugging
- Restart / Go-to controls

---

## Notification system

```ts
type NotificationType = "info" | "success" | "warning" | "error";
type NotifyCallback = (type: NotificationType, text: string, header?: string | null) => void;
```

- Call `handlers.notify("success", "Saved", null)` anywhere that receives `IUpds`
- `AppLayout` appends to `notifications[]`; `NotificationBar` shows the latest

---

## Styling conventions

**Horizontal margins:** All items (list rows, cards, panels, form fields, etc.) are rendered without horizontal margins by default. When adding or editing any component, add appropriate horizontal margins (e.g., `style={{ marginLeft: 8, marginRight: 8 }}` or an rsuite spacing class) wherever elements would otherwise sit flush against container edges.

---

## Key patterns

**Always** use `useCallback` for handlers passed as props to avoid re-render cascades.

**Always** use `useMemo` for derived lists (e.g., dialog tiles, link cards) that depend on `game.*`.

**Never** mutate `game` in place — always produce a new object.

**No `visible` prop** on route-level components — routing handles mounting/unmounting. The `visible` anti-pattern was removed; components mount only when their route is active.

**Adding a new editor section:**
1. Create a component in `src/components/menuitems/<section>/`
2. Add a route function in `App.tsx` that calls `useOutletContext<AppOutletContext>()`
3. Add a `<Route path="<key>" element={<NewRoute />} />` inside `AppLayout`'s `<Route>`
4. Add a `Nav.Item` + `onClick={() => navigate('/<key>')}` in `SidePanel.tsx`

Always add data-testids to new components for testing purposes.
