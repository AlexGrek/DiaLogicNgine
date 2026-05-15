---
name: game_engine
description: Deep reference for the DiaLogicNgine execution engine and player rendering pipeline. Use when touching exec/, Runtime.ts, GameExecutor, State management, RenderView, Player/PlayerCore, or script evaluation.
---

# Game Engine Skill

## Files at a glance

```
src/exec/
  GameState.tsx          — State type + UiObjectId union + createInitialState
  GameProgress.ts        — GameProgress type (quest/task tracking arrays)
  GameExecutor.tsx       — GameExecManager: nav/link logic, executeEntry, applyLink
  RenderView.ts          — RenderViewGenerator: render() → RenderView; all *RenderView types
  Runtime.ts             — RuntimeRt, evaluate(), evaluateAs*Processor helpers
  NavigationUtils.ts     — tryGetDialogWindowById / tryGetLocationById / tryGetCharById
  EventsProcessor.ts     — random event firing on location entry
  DiscussionProcessor.ts — NPC discussion reaction lookup
  QuestProcessor.ts      — task/quest/questline open/complete/fail with notifications
  GameUiElementsProcessor.ts — visible HUD meter computation

src/components/player/
  Player.tsx             — React FC: creates GameExecManager + State; renders shell
  PlayerCore.tsx         — React FC: calls render(), routes to view components, transitions

src/AppGameRuntime.tsx   — Standalone player entry point (no editor chrome)
```

---

## State — the single runtime snapshot

`State` (`GameState.tsx`) is the **only mutable runtime object**. All exec methods take a `State` and return a new `State` (via `lodash.cloneDeep`).

```ts
interface State {
  position: UiObjectId        // current location in the UI graph
  positionStack: UiObjectId[] // push/pop navigation history
  positionHistory: UiObjectId[]
  location: string | null     // last visited location uid
  charDialog: string | null   // last visited char uid
  props: { [key: string]: any } // runtime prop values (keyed by full name)
  stepCount: number
  quickReplyText: string | null // set by QuickReply links, cleared on next step
  shortHistory: HistoryRecord[] // capped at 12, used by scripts
  background?: string          // current bg image path
  knownFacts: string[]
  knownPeople: string[]        // known char uids
  knownPlaces: string[]        // known location uids
  progress: GameProgress       // quest tracking (see below)
  notifications: InGameNotification[]
  situation?: string
  carriedItems: CarriedItem[]  // { item: uid, quantity: number }[]
  happenedEvents: string[]
  fatalError?: FatalError | null
  gameVersion: string
  engineVersion: string
}
```

### UiObjectId — the position discriminated union

```ts
type UiObjectId =
  | { kind: "window";   dialog: string; window: string }
  | { kind: "location"; location: string }
  | { kind: "chardialog"; char: string }
```

`createInitialState(game)` seeds `position` from `game.startupDialog`.

### GameProgress

Stored inside `State.progress`. Six arrays of path objects, one per status × entity:

```ts
interface GameProgress {
  completedTasks: TaskPath[];  failedTasks: TaskPath[];  openTasks: TaskPath[]
  completedQuests: QuestPath[]; failedQuests: QuestPath[]; openQuests: QuestPath[]
  openQuestLines: string[];    closedQuestLines: string[]
}
```

---

## GameExecManager — the orchestrator

`src/exec/GameExecutor.tsx`. Constructed with a `GameDescription`. Holds:
- `game: GameDescription`
- `renderer: RenderViewGenerator`
- `events: EventsProcessor`
- `quests: QuestProcessor`
- `uiEls: GameUiElementsProcessor`

### Navigation methods (all return new `State`)

| Method | Description |
|--------|-------------|
| `goToLocalLink(windowName, state)` | Update `position.window` within same dialog |
| `pushLink(direction, state)` | Push current position on stack, jump to `direction` |
| `jumpLink(direction, state, reset?)` | Jump; optionally clear stack |
| `popLink(state)` | Pop stack; fall back to `charDialog` or `location` position |
| `returnLink(state)` | Complex: cuts to last chardialog on stack; then falls to location/charDialog |
| `goToLocation(state, uid/Loc)` | Clears stack + shortHistory; calls `events.withPossibleEvent` |
| `goToCharDialog(state, charUid)` | Push current; clear shortHistory; set charDialog |

### `followLink(state, link)` — the link dispatcher

Evaluates `link.useAlternativeWhen` script first (if `isAlternativeLink`). Then dispatches on `LinkType`:

| LinkType | Method called |
|----------|--------------|
| `Local` | `goToLocalLink` |
| `Push` | `pushLink` |
| `Jump` | `jumpLink(…, false)` |
| `ResetJump` | `jumpLink(…, true)` |
| `Pop` | `popLink` |
| `QuickReply` | `quickReply` — sets `state.quickReplyText` |
| `Return` | `returnLink` |
| `NavigateToLocation` | `goToLocation` |
| `TalkToPerson` | `goToCharDialog` |

### `applyLink(state, link, clickData)` — the main interaction entry point

1. Run `link.actionCode` via `evaluateAsStateProcessor` if present
2. Call `followLink` → new position
3. Call `withUpdatedHistory` (appends `HistoryRecord`, increments step, clears quickReply)

### `dialogVariantApply(state, link, clickData)` — called by player on link click

1. `applyLink` (action + navigation)
2. `executeEntry` (run entry scripts / update background for the new position)

### `locRouteApply(state, view)` — called by player on location route click

`withUpdatedStep` → `withChangedLocation` (goToLocation) → `executeEntry`

### `executeEntry(state)` — side-effects on arrival

Checks `state.position.kind`:
- **location**: runs `onEntryScript`, updates background, sets `state.location`, adds known places
- **chardialog**: updates background, sets `state.charDialog`, adds to known people
- **window**: updates background if present, runs `window.entryScript`, sets `state.location` if `changeLocationInBg` is set

### `getBoolDecisionWithDefault(state, default, script?, contextVars?)` 

Returns `default` if script is empty; otherwise calls `evaluateAsBoolProcessor`.

### `modifyStateScript(state, script?)` 

Calls `evaluateAsStateProcessor` only if script is non-empty.

### `discuss(state, category, id, charUid)`

Creates a `DiscussionProcessor`, calls the appropriate `of*` method, then calls `followLink` + `executeEntry`.

### `stateError(state, msg, exception?)`

Returns cloned state with `fatalError` set. Used when navigation fails.

---

## Runtime.ts — script evaluation

### The eval pipeline

```ts
function evaluate(game, s, execManager, prevState, contextVars?): [any, State]
```

1. Deep-clones `prevState`
2. Creates `RuntimeRt` with that clone
3. Wraps `s` in `(function(rt, state, props, ch, facts, objectives, situation, items, context) { ${s} })`
4. Calls `window.eval.call(window, body)(rt, stateCopy, ...)`
5. Returns `[returnValue, stateCopy]`

### Three typed wrappers

| Function | Returns | When to use |
|----------|---------|-------------|
| `evaluateAsStateProcessor` | `State` | Entry scripts, action code — when script mutates state |
| `evaluateAsBoolProcessor` | `{ state, decision: boolean }` | `isVisible`, `isEnabled`, `canHappenScript` |
| `evaluateAsAnyProcessor` | `{ state, decision: any }` | Background/text/avatar chooser scripts |

All three catch exceptions → set `fatalError` on state, never throw.

`stateIsValid(candidate)` checks that the object has `position`, `positionStack`, `props` keys — used to detect if user code returned a valid state or just a bool/null.

### RuntimeRt — the `rt` object in user scripts

```ts
class RuntimeRt {
  props: any          // property descriptors → state.props[fullname]
  ch: any             // per-char sub-objects with property descriptors
  facts: any          // RuntimeFact per fact uid
  objectives: any     // RuntimeObjectiveQuestLine hierarchy
  items: RuntimeItemsManager
  history: RuntimeHistoryAccessManager
  situation: string | undefined
  contextVars: any    // arbitrary context passed by the engine (e.g. { thisEvent })
}
```

**`rt.props.*`** — defined via `Object.defineProperty` with get/set backed by `state.props[fullname]`. Validated on set (type checking by `Prop.datatype`).

**`rt.ch.<charUid>.*`** — same pattern with prefix `char:<uid>_`. Merges char.props + role props + overrideProps.

**`rt.facts.<uid>`** — `RuntimeFact` with `.known` getter and `.know()` mutator.

**`rt.objectives.<questlineUid>.<questUid>.<taskUid>`** — `RuntimeObjectiveQuestLine / Quest / Task` with `.open()`, `.complete()`, `.fail()`, `.status`.

**`rt.items`** — `RuntimeItemsManager`: `.add(uid)`, `.remove(uid)`, `.has(uid)`, `.count(uid)`, `.countTotal()`, `.list()`, `.listWithTag(tag)`.

**`rt.history.eventHappened(name)`** / **`rt.history.thisEventHappened(context)`** — check `state.happenedEvents`.

**Key contract:** scripts that modify state should return the state object (`return state`), or the modified state copy will be used automatically. Scripts that return a bool or non-state value use the `stateCopy` as the resulting state.

---

## RenderView.ts — the render pipeline

`RenderViewGenerator` is constructed with `exec: GameExecManager`. Its only public entry point called by the player:

```ts
render(state: State, oldbg: string | null): RenderView
```

Returns:
```ts
interface RenderView {
  uiWidgetView: RenderWidget  // the main content to show
  backgroundChange: BgChange  // null if bg unchanged, else { nextbg, effect }
  notifications: PlayerNotification[]
  step: number
  uiElements: UiElementRenderView[]
}
```

### RenderWidget discriminated union

```ts
type RenderWidget =
  | DialogRenderView    // widget: "dialog"
  | LocationRenderView  // widget: "location"
  | CharDialogRenderView // widget: "char"
  | PacRenderView       // widget: "pac"
  | ErrorView           // widget: "error"
```

### renderUiWidget(state) — the dispatch

Checks `state.fatalError` first → returns `ErrorView`.  
Then dispatches on `state.position.kind`:
- `"window"` → `renderDialog(state)` — checks for `window.specialWidget`; if `"pac::<id>"` → `renderSpecialWidget`; else builds `DialogRenderView`
- `"location"` → `renderLoc(state)` — builds `LocationRenderView` with `routes: LocRouteRenderView[]`
- `"chardialog"` → `renderCharDialog(state)` — builds `CharDialogRenderView`

### Link filtering in render (not in navigation)

`isLinkVisible(link, state)` — evaluates `link.isVisible` script; defaults true.  
`isLinkDisabled(link, state)` — evaluates `link.isEnabled` script; disabled = !enabled.  
Only visible links appear in `RenderLink[]`; disabled links are rendered but marked.

### Text/actor resolution

- `getCurrentWindowText` — returns `quickReplyText` if set, else evaluates `chooseTextScript` or returns `tlist.main`
- `getCurrentWindowActor` — resolves char by uid, evaluates `chooseAvatarScript` and `chooseNameScript`, respects `actor.currentCharacter` (→ uses `state.charDialog`)

### Background change detection

```ts
const bgChange = (state.background == undefined || oldbg === state.background)
  ? null
  : { nextbg: state.background, effect: 'fast' }
```

---

## EventsProcessor

- `withPossibleEvent(state)` — called after `goToLocation`. If the current location `canHostEvents`, calls `processPossibleEvents`.
- `processPossibleEvents` — filters `game.events` by matching hosts; partitions into priority/non-priority; sorts by probability; rolls dice per event; first matching event calls `happen()`.
- `happen(state, event)` — calls `exec.followLink` with `createImmediateDialogLink(event.link)`.
- `checkEventCanHappen(state, event)` — evaluates `canHappenScript` with `contextVars = { thisEvent: event.name }`.

---

## DiscussionProcessor

Used by `exec.discuss(state, category, id, charUid)`.

- `unknownReaction()` — QuickReply link with text "No reaction"
- `of*(id, charDialog, state)` — filters `charDialog.behavior.reactions` by trigger field; sorts by total trigger count ascending (most specific last, but finds first match → least specific wins — effectively finds lowest-trigger-count match)
- `returnReaction(reaction)` — if `reaction.dialogWindow` is set → Push link to that window; else QuickReply with `reaction.reply`

---

## QuestProcessor

`ObjectiveStatus = "open" | "failed" | "completed" | "untouched"`

Status is derived from `state.progress` arrays, not stored per-entity.

### Key behaviors
- `openTask` → auto-opens parent quest if untouched → auto-opens parent questline
- `completeTask` → runs `task.onComplete` script, advances to next task (if ordered) or checks all done
- `failTask` → if quest is `ordered` or task is `critical`, fails the whole quest
- Quest completion adds to `notifications` (`InGameNotification`)
- `safeStateUpdate(safeState, upd)` — copies only safe fields from script output into current state; notably **does NOT copy** `position`, `positionStack`, or `shortHistory`

---

## GameUiElementsProcessor

`getVisibleUiElements(state)` — filters `game.uiElements.meters` by `meter.visibleIf` script, then maps to `UiElementMeterRenderView` with `currentValue` from `meter.value` script.

---

## Player.tsx — React shell

```tsx
const Player: React.FC<{ game: GameDescription; handlers?: IUpds }> = ({ game }) => {
  const [gameExecutor, setGameExecutor] = useState(() => new GameExecManager(game))
  const [gameState, setGameState] = useState(() => createInitialState(game))
```

- `useEffect([game])` — recreates `GameExecManager` whenever `game` prop changes (editor pushes new game)
- Renders: restart button (resets to `createInitialState`), state debug drawer button, `<PlayerCore>`
- `handleStateChange` just calls `setGameState`

---

## PlayerCore.tsx — render loop + view routing

```tsx
const PlayerCore: React.FC<{ game: GameExecManager; state: State; onStateUpd: (s: State) => void }>
```

### On every `state` change (useEffect):
1. `game.renderer.render(state, background)` → `view`
2. Save `prevView`, set `currentView`
3. If `view.backgroundChange` → update `background` + `prevbackground` state
4. Set `inTransitionState = true`, clear after 200ms

### Background transition
Two `<div>` layers: `bg-host-old` (previous) and `bg-host-new` (current). CSS class `fade` added when `effect === 'fast'`. During transition, `prevView` is rendered instead of `currentView` so the user sees the old content while the background fades.

### handleStateUpd guard
If `inTransitionState` is true, state updates are **dropped** (prevents double-clicking during animation). Otherwise: calls `savesManager.current.newAutoSave(newState)` then `onStateUpd`.

### View routing
`<GameUiWidgetDisplay>` receives `view: RenderWidget` and `game: GameExecManager`. It reads `view.widget` and renders the matching component:

| `view.widget` | React component |
|--------------|-----------------|
| `"dialog"` | `DialogWindowView` |
| `"location"` | `LocationView` |
| `"char"` | `CharDialogView` |
| `"pac"` | `PacView` |
| `"error"` | error display |

State update callbacks from view components flow back through `handleStateUpd` → `onStateUpd` → `Player.setGameState`.

### Other PlayerCore children
- `InGameControlPad` — fullscreen + HUD toggle buttons
- `GameUiElementsView` — renders `view.uiElements` (meter bars)
- `GameMenuPanel` — in-game menu overlay (save/load, etc.) — receives `savesManager`, `executor`, `state`, `view`

---

## AppGameRuntime.tsx — standalone player

Class component wrapping `<Player game={...}>` in `<CustomProvider theme="dark">`. Initializes with `createDefaultGame()`. No editor chrome. Used as the standalone runtime entry point.

---

## Full interaction flow: link click → new render

```
User clicks link button
  → GameUiWidgetDisplay calls onStateUpd(exec.dialogVariantApply(state, link, clickData))
      → applyLink:
          1. evaluateAsStateProcessor(link.actionCode)
          2. followLink → navigation method → new position in state
          3. withUpdatedHistory (adds HistoryRecord, stepCount++, clears quickReplyText)
      → executeEntry:
          1. run onEntryScript / entryScript via evaluateAsStateProcessor
          2. update background
          3. set state.location / state.charDialog
  → PlayerCore.handleStateUpd:
      1. drop if inTransitionState
      2. savesManager.newAutoSave(newState)
      3. onStateUpd(newState) → Player.setGameState
  → PlayerCore useEffect([state]):
      1. render(state, oldbg) → RenderView
      2. detect bg change → set prevbackground + background
      3. inTransitionState = true → false after 200ms
  → React re-render → GameUiWidgetDisplay renders new view
```

---

## Key invariants

- **Never mutate `State` in place** inside `GameExecManager` — always `lodash.cloneDeep` first. Exception: `safeStateUpdate` does in-place field assignment intentionally.
- **Scripts must not break `State` shape** — `stateIsValid` guards against it; bad scripts get their state change dropped.
- `evaluateAsBoolProcessor` / `evaluateAsAnyProcessor` — state changes from these scripts ARE applied (returned as `state`), but the primary output is the `decision` value.
- `quickReplyText` — set by `QuickReply` link type, consumed by `getCurrentWindowText` and `renderCharDialog`. Cleared on the next `withUpdatedStep` call.
- `safeStateUpdate` deliberately **skips** `position`, `positionStack`, `shortHistory` — script side-effects cannot hijack navigation.
- Background change detection: `null` if `state.background` is undefined or matches `oldbg` (old bg passed by PlayerCore from its own `background` state).
