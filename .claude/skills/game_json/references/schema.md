# GameDescription JSON — field reference

Field-by-field reference for every entity. **R** = required (the TS interface has no `?`
and the engine/editor reads it unguarded), **O** = optional (may be omitted or `null`).
Source: `dialogic/src/game/*.ts`.

---

## Root — `GameDescription`

| Field | R/O | Type | Notes |
|---|---|---|---|
| `engineVersion` | R | string | `"0.21"`. The only field whose absence throws on load. |
| `buildVersion` | R | number | Free-form; nothing reads it. |
| `general` | R | `GeneralGameInfo` | `{ name, version, authors: string[], description, extras: {} }`. `name` back-filled with a random slug if empty. `version` is copied into save games as `gameVersion`. `extras` is a free `{[k]: string|number}` map exposed read-only as `rt.general.extras`. |
| `startupDialog` | R | `DialogWindowId` | `{ "kind": "window", "dialog": "<dialog name>", "window": "<window uid>" }`. Where every new game starts. |
| `startMenu` | R | object | `{ "menuBackground"?: "<image>" }`. `{}` is fine. Also read by the backend for the project card image. |
| `config` | R | object | `{ "assetsPath": "" }`. Legacy; `{}` also loads. |
| `dev` | R | object | `{ "basicPromptSuffix": "" }` — appended to AI generation prompts, no gameplay effect. |
| `visuals` | R | `VisualsConfiguration` | See below. Missing keys are merged from defaults on load. |
| `translations` | R | `{[string]: string \| number}` | UI-string override map; `""` = keep the default English string. |
| `dialogs` | R | `Dialog[]` | |
| `chars` | R | `Character[]` | |
| `roles` | R | `Role[]` | |
| `locs` | R | `Loc[]` | |
| `props` | R | `Prop[]` | |
| `facts` | R | `Fact[]` | |
| `items` | R | `Item[]` | |
| `objectives` | R | `QuestLine[]` | |
| `events` | R | `GameEvent[]` | |
| `eventHosts` | R | `string[]` | Named channels events can target. |
| `situations` | R | `string[]` | Declared situation names. |
| `pacWidgets` | R | `PointAndClick[]` | |
| `uiElements` | R | `{ meters: GameUiElementMeter[] }` | |
| `hooks` | R | `HookScript[]` | Back-filled to `[]` on load. |
| `functions` | R | `ScriptFunction[]` | Back-filled to `[]` on load. |

### `VisualsConfiguration` (all R; defaults from `createDefaultVisuals()`)

| Field | Default | Values |
|---|---|---|
| `dialogTextAlignment` | `"right"` | `left` \| `right` \| `full` |
| `responseAlignment` | `"column"` | `column` \| `row` \| `flexible` |
| `shortHistoryVisible` | `true` | bool |
| `menuFontId` / `textFontId` / `responsesFontId` | see `src/lib/fonts.ts` | any `FontOption.id` — e.g. `outfit`, `inter`, `lora`, `playfair`, `caveat`, `jetbrains-mono`, plus legacy `involve`, `palanquin`, `m-plus-1p` |
| `textFontSize` / `responsesFontSize` | `"normal"` | `xsmall` \| `small` \| `normal` \| `large` \| `huge` |
| `dialogTextBackgroundOpacity` | `27` | 0–100 |
| `notificationBackgroundOpacity` | `72` | 0–100 |
| `notificationBorderRadius` | `0` | px |
| `notificationBorderOpacity` | `0` | 0–100 |
| `typewriterEnabled` | `true` | bool |
| `typewriterSpeedMs` | `12` | ms per char |
| `menuPanelOpacity` | `45` | 0–100 |
| `menuPanelBorderRadius` | `14` | px |
| `inventoryLayout` | `"matrix"` | `matrix` \| `list` \| `popup` \| `subwindow` \| `scroll` |
| `inventoryCustomCss` | `""` | CSS scoped to the inventory menu |
| `customCss` | `""` | CSS injected into the player |

### `translations` — keys seeded by `createTranslations()`

`Discuss...`, `Facts`, `Knowledge`, `Inventory`, `Menu`, `Journal`, `Known people`,
`People`, `Items`, `Places`, `Cancel`, `Open`, `Failed`, `Completed`, `Create new save`,
`Save`, `About`, `New game`, `Load`, `Start new game`, `Confirm restart`.
Any other key is simply unused; the lookup is by the literal default string.

---

## `Dialog` / `DialogWindow` / `DialogLink`

### `Dialog`

| Field | R/O | Type |
|---|---|---|
| `name` | R | string — the dialog's identity, referenced by `startupDialog`, `push`/`jump` targets, event links |
| `windows` | R | `DialogWindow[]` |

### `DialogWindow`

| Field | R/O | Type | Notes |
|---|---|---|---|
| `uid` | R | string | Unique **within its dialog**. |
| `text` | R | `TextList` | `{ main, list }`. Split `main` into pages with a line containing only `---`. |
| `links` | R | `DialogLink[]` | May be `[]` (dead end — usually a bug). |
| `backgrounds` | R | `ImageList` | `{ "list": [] }` for none. Background changes only when `backgrounds.main` is set. |
| `tags` | R | `string[]` | Author-side labels; no engine behaviour. |
| `specialWidget` | R | `string \| null` | `"pac::<pac id>"` renders a point-and-click scene instead of the text view. |
| `actor` | O | `Actor` | `{ "character": "<char uid>", "currentCharacter": false }`. `currentCharacter: true` uses whoever the player is currently talking to (`state.charDialog`) and ignores `character`. `avatar` picks from that char's `ImageList` by name (string) or index (number). |
| `entryScript` | O | script | Runs on every entry. State processor. |
| `chooseTextScript` | O | script | Returns a `text.list[].name`, an index, or `null` for `main`. State changes ignored. |
| `chooseBackgroundScript` | O | script | Same selection rules against `backgrounds`. Only consulted when `backgrounds.main` is set. |
| `changeLocationInBg` | O | `<loc uid>` | Sets `state.location` (background/context) without navigating. |
| `changeSituation` | O | `<situation>` | **Editor-only today** — the engine does not apply it. Set `state.situation` from a script instead. |

### `DialogLink`

| Field | R/O | Type | Notes |
|---|---|---|---|
| `mainDirection` | R | `DialogLinkDirection` | Where the link goes. |
| `alternativeDirections` | R | `DialogLinkDirection[]` | `[]` when unused; index 0 is taken when `useAlternativeWhen` returns true. |
| `text` | R | string | Button label. Empty + only-visible-link ⇒ "click anywhere to continue". |
| `isAlternativeLink` | O | bool | Must be `true` for `useAlternativeWhen` to be consulted on dialog links. |
| `useAlternativeWhen` | O | script → bool | True ⇒ follow `alternativeDirections[0]`. |
| `actionCode` | O | script | Runs **before** navigation. State processor. |
| `isVisible` | O | script → bool | False ⇒ the link is not rendered at all. Default true. |
| `isEnabled` | O | script → bool | False ⇒ rendered greyed out. Default true. |
| `textProcessingCode` | O | script | **Inert** — stored by the editor, never executed by the current engine. |
| `changeLocationInBg` | O | `<loc uid>` | Background/context change on follow. |
| `iconId` | O | string | `"<pack>:<icon>"` — packs `tabler`, `lucide`, `game` (`src/lib/icons/index.ts`), e.g. `"tabler:sword"`. |
| `iconPlacement` | O | `"before"` \| `"after"` | Default `"before"`. |

### `DialogLinkDirection`

| `type` | Target field | Meaning |
|---|---|---|
| `"local"` | `direction` = window uid in the **same** dialog | Cheapest move; cannot cross dialogs. |
| `"push"` | `qualifiedDirection` = `{kind,dialog,window}` | Pushes the current position so a later `pop` returns here. |
| `"jump"` | `qualifiedDirection` | Moves without a return point. |
| `"resetjump"` | `qualifiedDirection` | Moves and clears the whole stack. |
| `"pop"` | — (`direction: ""`) | Back to the last pushed position, else the current char dialog / location. |
| `"return"` | — | Back to the last character dialog on the stack, else location. |
| `"tolocation"` | `direction` = loc uid | Travel; clears the stack and short history, rolls events. |
| `"toperson"` | `direction` = char uid | Opens that character's `dialog`. |
| `"reply"` | `replyText` = literal string | Stays put and replaces the shown text for one step (quick reply). |

---

## `Character` / `Role` / `CharacterDialog` / `Reaction`

### `Character`

| Field | R/O | Type | Notes |
|---|---|---|---|
| `uid` | R | string | Referenced by `toperson`, actors, reaction triggers, `rt.ch.<uid>`. |
| `displayName` | R | `TextList` | Variants selectable via `chooseNameScript`. |
| `description` | R | `TextList` | Shown in the in-game people list. |
| `traits` | R | `string[]` | Author-side labels. |
| `props` | R | `Prop[]` | Per-character variables → `rt.ch.<uid>.<name>` (state key `char:<uid>_<name>`). |
| `overrideProps` | R | `Prop[]` | Same shape; overrides a role prop of the same name. |
| `roles` | R | `string[]` | `roles[].name` values; their props are merged into `rt.ch.<uid>`. |
| `avatar` | R | `ImageList` | |
| `discussable` | R | bool | Whether this character appears as a discussion topic once known. |
| `dialog` | O | `CharacterDialog` | Required in practice for `toperson`. |
| `chooseNameScript` / `chooseDescriptionScript` / `chooseAvatarScript` | O | script | Variant pickers (name/index/`null`). |

### `Role`

`{ "name": "merchant", "description": "…" (O), "props": Prop[] }` — a named prop bundle.
Characters listing the role get those props on `rt.ch.<uid>`.

### `CharacterDialog`

| Field | R/O | Type | Notes |
|---|---|---|---|
| `text` | R | `TextList` | What the character says when the conversation opens. |
| `links` | R | `DialogLink[]` | Conversation options. Same link semantics as dialog windows; `local` is meaningless here. |
| `background` | R | `ImageList` | |
| `behavior` | R | `{ speakingModel, reactions }` | |
| `eventHosts` | R | `string[] \| null` | `null` disables hosting; otherwise the implicit host `char:<uid>` is added. |
| `chooseTextScript` / `chooseBgScript` / `canHostEventsScript` | O | script | |

`speakingModel` is `{ agree, deny, bye, hello, dontKnowObject, dontKnowChar }`, each a
`string[]` of stock phrases.

### `Reaction` — how a character answers a discussion topic

```jsonc
{ "trigger": { "facts": ["gate_is_open"], "chars": [], "items": [], "places": [] },
  "reply": "Yes, the gate has been open all morning.",   // quick reply text
  "dialogWindow": { "kind": "window", "dialog": "…", "window": "…" },  // O — push instead of replying
  "isEnabled": "return rt.props.trust > 3",              // O — script → bool, default true
  "actionScript": "…" }                                  // O — stored, not executed by the engine
```

Matching: the player picks a topic (fact / character / item / place) in the discussion
picker; enabled reactions whose matching trigger array contains that uid are collected and
**the one with the fewest total trigger entries wins**. Write specific multi-trigger
reactions knowing that a broader single-trigger one takes precedence — keep triggers small
and add `isEnabled` for context. No match ⇒ the built-in "No reaction" quick reply.

Discussion topics are limited to what the player **knows**: `state.knownFacts` (via
`rt.facts.X.know()`), `knownPeople` (characters talked to), `knownPlaces` (locations
visited plus their visible routes), and carried items — each further filtered by the
entity's `discussable` flag.

---

## `Loc`

| Field | R/O | Type | Notes |
|---|---|---|---|
| `uid` | R | string | |
| `displayName` | R | string | Plain string, not a `TextList`. |
| `text` | R | `TextList` | Description shown at the location. |
| `backgrounds` | R | `ImageList` | |
| `routes` | R | `string[]` | Loc uids offered as travel destinations (the visible exits). Visiting a location also makes its visible routes "known". |
| `goto` | R | `string[]` | Legacy secondary exit list; keep `[]`. |
| `links` | R | `DialogLink[]` | Extra buttons (talk to someone, jump into a dialog, run an action). |
| `discussable` | R | bool | |
| `eventHosts` | R | `string[] \| null` | `null` = never hosts events. Non-null adds the implicit host `loc:<uid>`. An **empty** list means `canHostEvents` is false. |
| `thumbnail` | O | image | Shown on the route button. |
| `isVisibleScript` | O | script → bool | Hides the route from other locations. |
| `isAccessibleScript` | O | script → bool | Renders the route disabled. |
| `onEntryScript` | O | script | Runs on arrival. |
| `chooseTextScript` / `choosebackgroundScript` | O | script | Variant pickers (note the lowercase `b`). |
| `canHostEventsScript` | O | script → bool | |

---

## `Prop`

Discriminated on `datatype`:

```jsonc
{ "name": "gold",     "datatype": "number",   "defaultValue": 0, "min": 0, "max": 999 }  // min/max optional
{ "name": "title",    "datatype": "string",   "defaultValue": "" }
{ "name": "hasKey",   "datatype": "boolean",  "defaultValue": false }
{ "name": "power",    "datatype": "variant",  "variants": ["off","on"], "defaultValue": "off" }
{ "name": "homeBase", "datatype": "location", "defaultValue": "town_square" }
```

`name` must be a JS identifier. Global props live at `state.props[name]`; character/role
props at `state.props["char:<charUid>_<name>"]`. `defaultValue` is what `rt.props.x` reads
before anything writes to it — defaults are **not** materialised into the save at start.

---

## `Fact`

`{ "uid", "short", "full", "discussable" }` — all required. `short` is the journal line,
`full` the expanded text. Learned with `rt.facts.<uid>.know()`, tested with
`rt.facts.<uid>.known`; learning fires `FACTS::DISCOVERED::<uid>` hooks.

## `Item`

| Field | R/O | Notes |
|---|---|---|
| `uid`, `name`, `description` | R | |
| `unique` | R | bool — author-side marker for one-of-a-kind items. |
| `stackable` | R | bool — `true` merges into one entry with `quantity`; `false` adds one carried entry per unit. |
| `canGive` | R | bool — may be handed to characters. |
| `discussable` | R | bool | 
| `tags` | R | `string[]` — queried by `rt.items.listWithTag(tag)`. |
| `stats` | R | `{[key]: number \| string}` — free-form; read it yourself in scripts. |
| `price` | O | number |
| `image` / `thumbnail` | O | image filenames |

Acquiring/losing fires `ITEMS::ACQUIRED::<uid>` / `ITEMS::LOST::<uid>` hooks.

## `QuestLine` → `Quest` → `Task`

| Type | Fields |
|---|---|
| `QuestLine` | `uid` R, `name` R, `tags` R (`string[]`), `quests` R |
| `Quest` | `uid` R, `path` R `[lineUid, questUid]`, `name` R, `tags` R, `ordered` R (**literal `true`**), `tasks` R, `onOpen`/`onComplete`/`onFail` O scripts |
| `Task` | `uid` R, `path` R `[lineUid, questUid, taskUid]`, `text` R, `critical` R bool, `onComplete`/`onFail` O scripts, `autoCheckScript` O (**inert**) |

Status is **not stored on the entity** — it is derived from `state.progress`
(`openTasks`/`completedTasks`/`failedTasks`, same for quests, plus
`openQuestLines`/`closedQuestLines`), keyed by `path`. Hence the strict path invariant.

Behaviour: opening a task auto-opens its quest and questline; completing the last task
completes the quest; failing a `critical` task (or any task of an `ordered` quest) fails
the whole quest. Every transition fires the matching hook and pushes an in-game
notification.

## `GameEvent`

| Field | R/O | Notes |
|---|---|---|
| `name` | R | Also the key in `state.happenedEvents` and `context.thisEvent`. |
| `probability` | R | 0–100; rolled as `random(0..100) <= probability`. |
| `highPriority` | R | Priority events are considered first (ascending probability); the rest descending. The first event that both *can* happen and wins its roll fires. |
| `targets` | R | Host names: entries of `game.eventHosts`, or the implicit `loc:<uid>` / `char:<uid>`. |
| `link` | R | `DialogWindowId \| null` — pushed as an immediate link when the event fires. |
| `canHappenScript` | O | script → bool, receives `context.thisEvent`. |
| `onEventActionScript` | O | Stored; not executed by the current engine. |

Only **location entry** rolls events.

## `PointAndClick` / `PointAndClickZone`

| `PointAndClick` | R/O | Notes |
|---|---|---|
| `id` | R | Referenced as `"pac::<id>"` by a window's `specialWidget`. |
| `background` | R | Image filename; `""` for none. |
| `zones` | R | |
| `eventHosts` | R | `string[] \| null` |
| `canHostEventsScript` | O | |

| Zone field | R/O | Notes |
|---|---|---|
| `id`, `name` | R | `name` is the hover label / synthetic link text. |
| `x`, `y`, `width`, `height` | R | Percentages of the screen (0–100). |
| `idleOpacity` / `hoverOpacity` | O | 0–1. |
| `image` | O | Optional zone image. |
| `onClickScript` | O | Runs on click (acts as the link's `actionCode`). |
| `isVisibleIfScript` / `isDisabledIfScript` | O | script → bool. |
| `mainDirection` | O | Same `DialogLinkDirection` as a link — a zone can navigate anywhere a link can. Omit (or use `local` with an empty `direction`) for an in-place action. |
| `alternativeDirections` / `useAlternativeWhen` | O | Conditional routing, same semantics as links. Zones do not need `isAlternativeLink`. |

Because a scene is not bound to one dialog, `local` in a zone resolves against whatever
dialog hosts it at runtime — reuse a scene across dialogs only with absolute targets.

## `GameUiElementMeter` (`uiElements.meters[]`)

| Field | R/O | Notes |
|---|---|---|
| `uid`, `name` | R | `name` is the label. |
| `value` | R | Script returning the displayed value (`"return rt.props.hp"`). `""` shows nothing. |
| `layout` | R | `{ "opacity": 1 }` |
| `progressBar` | R | `null` for a plain readout, or `{ min, max, colors, yellowLevel, redLevel }` — `colors: true` turns the bar yellow/red below those thresholds. |
| `visibleIf` | O | script → bool |
| `fontId`, `iconId`, `color` | O | Font id / `"pack:icon"` / CSS colour. |

## `HookScript` / `ScriptFunction`

`{ "name": "<label>", "hook": "<hook string>", "body": "<script>" }` — `name` is
documentation only. See `scripting.md` for the full hook-string table.

`{ "name": "<js identifier>", "args": "a, b", "body": "<script>", "description": "<docs>" }` —
compiled as `function name(args) { body }` into the scope of every script. An invalid
identifier is silently skipped.

## Shared value types

```jsonc
TextList  { "main": "…", "list": [ { "name": "variant_id", "text": "…" } ] }
ImageList { "main": "bg.png", "list": [ { "name": "night", "uri": "bg_night.png" } ] }   // main optional
DialogWindowId { "kind": "window", "dialog": "<dialog name>", "window": "<window uid>" }
```

Variant selection (`chooseTextScript`, `chooseBackgroundScript`, `actor.avatar`, …):
return the entry's `name` (string) or its index (number); `null`, `undefined` or `-1`
selects `main`. An unknown name/index renders `! ERROR: …` text instead of throwing.
