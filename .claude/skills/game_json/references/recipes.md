# Recipes — how to add or edit anything

Each recipe says **where** in the JSON it goes and **what else must be touched**. Field
details: `schema.md`. Script semantics: `scripting.md`.

---

## Start a new game file

Copy `assets/minimal-game.json`, then set `general.name`, `general.version`, and point
`startupDialog` at your first dialog + window. Keep every top-level key even when empty.

---

## Add a dialog

`dialogs[]` — a dialog is just a namespace of windows. One per scene, chapter or
conversation cluster; `local` links only work inside one dialog, so put windows the player
moves between rapidly in the same dialog.

```jsonc
{ "name": "chapter_2", "windows": [ /* … */ ] }
```
`name` is the identity: `startupDialog`, `push`/`jump` targets, event links and reaction
windows all reference it.

## Add a window

`dialogs[i].windows[]`:

```jsonc
{ "uid": "hallway",
  "text": { "main": "The hallway is dark.", "list": [] },
  "backgrounds": { "list": [] },
  "links": [],
  "tags": [],
  "specialWidget": null }
```
Then link *to* it from somewhere — an unreachable window is invisible. Check: does it have
at least one outgoing link (or an intentional ending)?

## Write a linear scene (a "chain")

Two ways to move the player forward:

**Pages inside one window** — split `text.main` with a `---` line. The player clicks
through pages; links appear only on the last page.
```jsonc
"text": { "main": "You wake up.\n---\nThe room is cold.\n---\nSomeone knocks.", "list": [] }
```

**A chain of windows** — one window per beat, each with a single `local` link. Give the
link an empty `text` to turn the whole screen into "click to continue":
```jsonc
{ "uid": "beat_1", "text": { "main": "You wake up.", "list": [] },
  "backgrounds": { "list": [] }, "tags": [], "specialWidget": null,
  "links": [ { "mainDirection": { "type": "local", "direction": "beat_2" },
               "text": "", "alternativeDirections": [] } ] }
```
Use separate windows when beats need their own background, actor, entry script or tags;
use pages when it is pure prose.

## Add a choice, and branch

```jsonc
"links": [
  { "mainDirection": { "type": "local", "direction": "took_key" },
    "text": "Take the key", "actionCode": "rt.items.add('rusty_key')",
    "alternativeDirections": [] },
  { "mainDirection": { "type": "local", "direction": "left_key" },
    "text": "Leave it", "alternativeDirections": [] }
]
```

Branch **without** extra windows by routing one link two ways:
```jsonc
{ "mainDirection": { "type": "local", "direction": "door_locked" },
  "text": "Open the door", "isAlternativeLink": true,
  "useAlternativeWhen": "return rt.items.has('rusty_key')",
  "alternativeDirections": [ { "type": "local", "direction": "door_opens" } ] }
```

Gate a choice: `"isVisible": "return rt.props.gold >= 5"` (hide) or
`"isEnabled": "return rt.props.gold >= 5"` (show greyed out).

## Move between dialogs

```jsonc
{ "mainDirection": { "type": "push", "direction": "",
                     "qualifiedDirection": { "kind": "window", "dialog": "shop", "window": "counter" } },
  "text": "Enter the shop", "alternativeDirections": [] }
```
Put `{ "mainDirection": { "type": "pop", "direction": "" }, "text": "Leave", "alternativeDirections": [] }`
in the target to come back. Use `jump` when there is nothing to return to, `resetjump` to
also clear the stack (chapter transitions).

## Add a character

`chars[]` — see the cheat sheet in SKILL.md for the full skeleton. Checklist:

1. `uid` (lowercase snake_case), `displayName`, `description`, `discussable`.
2. `roles: []` or role names that exist in `roles[]`.
3. `props` / `overrideProps` for per-character variables → `rt.ch.<uid>.<name>`.
4. `avatar`: `{ "main": "alice.png", "list": [] }` — the file must be uploaded to the project.
5. `dialog` — required for `toperson` links. Give it at least one exit link
   (`pop` or `return`).
6. Link to them: `{ "type": "toperson", "direction": "alice" }` from a window or a location.

Dynamic portrait/name: add `chooseAvatarScript` / `chooseNameScript` returning a variant
name from the respective `ImageList` / `TextList`.

## Add a role (shared props for a group)

```jsonc
{ "name": "guard", "description": "Keeps watch",
  "props": [ { "name": "alertLevel", "datatype": "variant",
               "variants": ["calm", "alert"], "defaultValue": "calm" } ] }
```
List `"guard"` in a character's `roles`; the prop is then `rt.ch.bob.alertLevel`. To give
one character a different default, put a prop of the same name in that character's
`overrideProps`.

## Show a speaker in a dialog window

```jsonc
"actor": { "character": "alice", "currentCharacter": false }
```
In a window reused inside several conversations use
`{ "character": "", "currentCharacter": true }` — it renders whoever
the player is currently talking to. `"avatar": "angry"` picks that variant from the
character's `avatar` list.

## Add character reactions (discussion topics)

`chars[i].dialog.behavior.reactions[]`. The player opens *Discuss…* in a conversation and
picks a known fact, person, place or carried item; the matching reaction answers.

```jsonc
{ "trigger": { "facts": ["gate_is_open"], "chars": [], "items": [], "places": [] },
  "reply": "Aye, it's been open since dawn." }
```

Push a full dialog instead of a one-liner:
```jsonc
{ "trigger": { "facts": [], "chars": [], "items": ["rusty_key"], "places": [] },
  "reply": "",
  "dialogWindow": { "kind": "window", "dialog": "merchant_talk", "window": "about_key" } }
```

Rules to design around:
- Triggers are **OR** lists: one reaction can answer several topics.
- When several reactions match, the one with the **fewest total trigger entries wins** —
  a broad one-topic reaction beats a specific multi-topic one. Keep triggers narrow.
- Use `isEnabled` for state-dependent variants of the same topic
  (`"return rt.props.trust > 3"`), and order-independent design: never rely on array order.
- A topic only appears if the player knows it *and* the entity is `discussable: true`.
  Facts become known via `rt.facts.X.know()`, people by talking to them, places by
  visiting (plus their visible routes), items by carrying them.
- No match ⇒ built-in "No reaction".

## Add a location and travel

```jsonc
{ "uid": "market", "displayName": "Market",
  "backgrounds": { "main": "market.png", "list": [] },
  "text": { "main": "Stalls line the road.", "list": [] },
  "goto": [], "routes": ["town_square"], "discussable": true, "eventHosts": [],
  "links": [ { "mainDirection": { "type": "toperson", "direction": "alice" },
               "text": "Talk to Alice", "alternativeDirections": [] } ] }
```
- `routes` are the walkable exits **and must be symmetric if you want two-way travel** —
  add `"market"` to `town_square.routes` too.
- Reach a location from a dialog with `{ "type": "tolocation", "direction": "market" }`.
- Get back into the dialog graph with a `resetjump` link on the location.
- Conditional exits: `isVisibleScript` on the destination hides its route;
  `isAccessibleScript` shows it disabled.
- `onEntryScript` fires on arrival — good for `rt.objectives.…complete()`.

## Add an item and use it

```jsonc
{ "uid": "coin", "name": "Coin", "description": "Currency.", "price": 1,
  "unique": false, "stackable": true, "canGive": true, "discussable": true,
  "tags": ["currency"], "stats": {} }
```
- Give: `"actionCode": "rt.items.add('coin', 10)"`. Take: `rt.items.remove('coin', 5)`.
- Gate on it: `"isEnabled": "return rt.items.count('coin') >= 5"`.
- `stackable: true` collapses into one row with a quantity; `false` lists each copy.
- A simple purchase is one link: `isEnabled` checks the price, `actionCode` does
  `rt.items.remove('coin', 5); rt.items.add('bread')`.
- React to acquisition anywhere with an `ITEMS::ACQUIRED::coin` hook.
- `image` / `thumbnail` are uploaded filenames.

## Add a fact

```jsonc
{ "uid": "gate_is_open", "short": "The gate is open",
  "full": "The main gate has been left open since morning.", "discussable": true }
```
Learn it from a link: `"actionCode": "rt.facts.gate_is_open.know()"`. Show a choice only
to players who don't know it yet: `"isVisible": "return !rt.facts.gate_is_open.known"`.
Reward learning with a `FACTS::DISCOVERED::gate_is_open` hook.

## Add a quest line

```jsonc
{ "uid": "main_line", "name": "Main questline", "tags": ["main"],
  "quests": [ { "uid": "first", "path": ["main_line", "first"], "name": "First steps",
                "tags": [], "ordered": true,
                "tasks": [ { "uid": "visit_town", "path": ["main_line", "first", "visit_town"],
                             "text": "Visit the town square", "critical": true },
                           { "uid": "meet_alice", "path": ["main_line", "first", "meet_alice"],
                             "text": "Talk to Alice", "critical": true } ] } ] }
```
Wire it up:
- Open: `rt.objectives.main_line.first.open()` (opens the line automatically) from an
  `entryScript` or `actionCode`.
- Progress: `rt.objectives.main_line.first.visit_town.complete()` from the location's
  `onEntryScript`, a link's `actionCode`, or a hook.
- Completing the last task completes the quest; a failed `critical` task fails it.
- Side effects on transitions: quest `onOpen`/`onComplete`/`onFail`, task
  `onComplete`/`onFail`, or `QUEST::*` / `TASK::*` hooks.
- **Keep `path` in sync with the uids** — it is the key used for all tracking.

## Add a random event

```jsonc
// events[]
{ "name": "Market announcement", "highPriority": false, "probability": 20,
  "targets": ["town_events"],
  "link": { "kind": "window", "dialog": "main", "window": "event_notice" },
  "canHappenScript": "return !rt.history.thisEventHappened(context)" }
```
1. Declare the host: add `"town_events"` to top-level `eventHosts`.
2. Attach it: `"eventHosts": ["town_events"]` on the location.
3. Give the target window a `pop` link so the player returns where they were.
4. Events roll **only on location entry**. `probability` is 0–100; high-priority events are
   checked first.
5. `canHappenScript` receives `context.thisEvent`; use `rt.history.thisEventHappened(context)`
   for once-only events.

## Add a point-and-click scene

```jsonc
// pacWidgets[]
{ "id": "lab_console", "background": "console.png", "eventHosts": [], "zones": [
  { "id": "switch", "name": "Main switch", "x": 8, "y": 28, "width": 20, "height": 40,
    "idleOpacity": 0.25, "hoverOpacity": 0.85,
    "onClickScript": "rt.props.power = rt.props.power === 'on' ? 'off' : 'on'" },
  { "id": "exit", "name": "Leave", "x": 38, "y": 78, "width": 24, "height": 16,
    "mainDirection": { "type": "local", "direction": "entrance" } } ] }
```
Show it by pointing a window at it: `"specialWidget": "pac::lab_console"`. Coordinates are
percentages of the screen. A zone with only `onClickScript` acts in place (the scene
re-renders, so other zones re-evaluate their visibility); a zone with `mainDirection`
navigates exactly like a link, including `useAlternativeWhen`. Keep a zone (or a link on
the hosting window) that leaves the scene.

## Add a HUD meter

```jsonc
// uiElements.meters[]
{ "uid": "gold", "name": "Gold", "value": "return rt.props.gold",
  "layout": { "opacity": 1 }, "progressBar": null, "iconId": "tabler:coin" }
```
For a bar, replace `progressBar` with
`{ "min": 0, "max": 100, "colors": true, "yellowLevel": 25, "redLevel": 10 }`. `value` can
compute anything: `"return rt.items.count('battery')"`. Hide contextually with
`"visibleIf": "return rt.props.inCombat"`.

## Add a situation

1. Declare the name in top-level `situations` (`["battle"]`) — this is what the editor and
   the validator check against.
2. Enter/leave it from a script: `state.situation = 'battle'` / `state.situation = undefined`.
   (A window's `changeSituation` field is **not** applied by the engine.)
3. React with `SITUATION::STARTED::battle` / `SITUATION::ENDED::battle` hooks, or read
   `rt.situation` in any condition.

## Add a reusable function

```jsonc
// functions[]
{ "name": "powered", "args": "", "description": "Main power on?",
  "body": "return rt.props.power === 'on'" }
```
Now `powered()` works in every script. Prefer this over repeating a condition across many
links — one edit changes them all.

## Localize UI strings

`translations` is a flat override map keyed by the built-in English string:
```jsonc
"translations": { "Inventory": "Ryggsäck", "Menu": "Meny", "Facts": "" }
```
`""` keeps the default. Game *content* (dialog text, item names) is not translated here —
it lives in the entities themselves; use `TextList` variants + `chooseTextScript` if you
need per-state wording.

## Change the look

`visuals` controls fonts, sizes, alignment, panel opacity and the typewriter effect —
see the table in `schema.md`. `visuals.customCss` and `visuals.inventoryCustomCss` inject
raw CSS into the player. `startMenu.menuBackground` sets the main-menu image.

## Use images

Upload via the editor (or `PUT /api/v1/projects/<project>/images/<filename>`), then
reference the **bare filename**: `"backgrounds": { "main": "market.png", "list": [] }`.
Values starting with `game_assets/`, `/` or `http(s)://` are used verbatim. A missing file
renders as nothing — the editor's Sanity check tab is the only thing that reports it.

## Rename or delete something safely

There are no cascading updates. Before renaming a `uid`/`name`, grep the whole file for the
old value and update every hit:

```bash
grep -o '"[^"]*old_uid[^"]*"' game.json | sort -u
```

Reference sites to check per entity type: dialog `name` → `startupDialog`,
`qualifiedDirection.dialog`, event `link.dialog`, reaction `dialogWindow.dialog`. Window
`uid` → `local` directions, all `qualifiedDirection.window`. Character `uid` → `toperson`
directions, `actor.character`, reaction `trigger.chars`, `rt.ch.<uid>` in scripts. Location
`uid` → `tolocation`, `routes`, `goto`, `changeLocationInBg`, `trigger.places`. Item/fact
uid → `rt.items.*('uid')`, `rt.facts.uid`, `trigger.items/facts`, hook strings. Prop `name`
→ `rt.props.name` everywhere. Quest/task uid → `path` arrays, `rt.objectives.*`, hook
strings. PAC `id` → `specialWidget`. Event host → `targets`.

Then run `scripts/validate_game.py` — it reports every dangling reference it can see.

## Verify

```bash
python3 .claude/skills/game_json/scripts/validate_game.py backend/storage/projects/<p>/game.json
```
Then load the game (editor JSON drawer, or `PUT` the file) and play the changed path. The
editor's **Game configuration → Sanity check** tab additionally verifies image files
against the server.
