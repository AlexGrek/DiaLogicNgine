---
name: game_json
description: Author and edit DiaLogicNgine games directly as JSON (game.json / GameDescription) — dialogs, windows, links, characters, roles, reactions, locations, items, facts, quests, events, point-and-click scenes, HUD meters, props, hooks and scripts. Use when creating game content, hand-editing a game file, generating a game from a scenario, or debugging a broken game file.
---

# Authoring DiaLogicNgine games as JSON

A game is **one JSON object** (`GameDescription`) — no other file is needed. Images are
the only external asset. This skill covers writing that JSON by hand: what every field
means, how the pieces reference each other, and how to verify the result.

- **Model source of truth:** `dialogic/src/game/*.ts` (the JSON is the literal serialization of these interfaces).
- **Working examples to copy:** `dialogic/src/game/GameDescription.ts` → `createDefaultGame()` (one of every entity) and `dialogic/src/game/templates.ts` → `createScriptingShowcaseGame()` (one of every *script* hook-point).
- **For engine internals** (how state transitions, rendering and eval actually work) use the `game_engine` skill. **For the editor UI** use the `frontend` skill.

## Files in this skill

| File | Read when |
|---|---|
| `references/schema.md` | You need the exact fields, types, defaults and required/optional status of any entity |
| `references/scripting.md` | You are writing any script string (`entryScript`, `actionCode`, `isVisible`, hooks, functions, meter `value`) |
| `references/recipes.md` | You are adding a concrete thing — a dialog chain, an NPC, a reaction, a quest, a shop, a PAC scene |
| `assets/minimal-game.json` | You are starting a brand-new game file — copy this skeleton |
| `scripts/validate_game.py` | Always, before declaring a hand-edited game done |

---

## Where the JSON lives

| Context | Location |
|---|---|
| Server project | `backend/storage/projects/<project>/game.json` (plus `.metadata`, `images/`, `image_thumbs/`) |
| Load (public, no auth) | `GET /api/v1/projects/<project>/game` |
| Save (owner only) | `PUT /api/v1/projects/<project>/game` with the raw JSON body |
| Editor UI | Save/Load menu → JSON import/export drawer (`SaveLoadJsonDrawer`) — paste the whole game and press *Import JSON* |
| Play it | `/play/<project>` |

Editing the file on disk under `backend/storage/projects/<project>/` is the fastest loop:
edit → reload the editor/player page. `.metadata` is regenerated only on `PUT`, so its
`displayName`/counters go stale after a direct disk edit — harmless.

## Engine version and migration

`engineVersion` is the **only mandatory** top-level field — `loadJsonStringAndPatch`
(`dialogic/src/game/Patches.ts`) throws without it. Current: **`"0.21"`** (`ENGINE_VERSION`
in `GameDescription.ts`).

- Writing a new game → set `"engineVersion": "0.21"` and include every top-level key.
- An older file is migrated automatically on load by chained patches (0.4 → … → 0.21), so
  do **not** hand-bump the version on an old file: that skips the patches that add the
  fields the new engine expects.
- Loading also back-fills `visuals`, `hooks`, `functions`, `dev` and `general.name` when
  missing, so a game saved by an older editor still loads — but a hand-written file should
  be complete rather than relying on that.

---

## The root object

```jsonc
{
  "engineVersion": "0.21",        // required, drives migration
  "buildVersion": 1,              // free-form int, unused by the engine
  "general":   { "name": "...", "version": "0.1.0", "authors": ["..."], "description": "...", "extras": {} },
  "startupDialog": { "kind": "window", "dialog": "main", "window": "start" },  // where a new game begins
  "startMenu": { "menuBackground": "bg.png" },     // optional main-menu background
  "config":    { "assetsPath": "" },
  "dev":       { "basicPromptSuffix": "" },        // AI-generation prompt suffix, not gameplay
  "visuals":   { /* fonts, alignment, opacity, typewriter — see schema.md */ },
  "translations": { "Menu": "", "Inventory": "" }, // UI-string overrides ("" = use the default)

  "dialogs":   [],  // Dialog[]        — the dialog graph (windows + links)
  "chars":     [],  // Character[]     — NPCs, their conversation and reactions
  "roles":     [],  // Role[]          — named prop bundles shared by characters
  "locs":      [],  // Loc[]           — places, routes between them, event hosting
  "props":     [],  // Prop[]          — declared game variables (number/string/boolean/variant/location)
  "facts":     [],  // Fact[]          — knowledge the player can learn and discuss
  "items":     [],  // Item[]          — inventory items
  "objectives":[],  // QuestLine[]     — quest lines → quests → tasks
  "events":    [],  // GameEvent[]     — random events fired on location entry
  "eventHosts":[],  // string[]        — named event-host channels
  "situations":[],  // string[]        — declared situation names
  "pacWidgets":[],  // PointAndClick[] — point-and-click scenes
  "uiElements":{ "meters": [] },       // HUD meters
  "hooks":     [],  // HookScript[]    — scripts fired by lifecycle events
  "functions": []   // ScriptFunction[]— reusable functions injected into every script
}
```

Every array may be empty, but **the key must exist** — the editor and engine iterate them
without guards. Start from `assets/minimal-game.json`.

---

## The reference graph — the thing to get right

Everything is wired by **string UIDs**. There are no object references and no integrity
enforcement at save time; a typo becomes a dead link that only shows up when a player
walks into it.

```
startupDialog ─────────────► dialogs[].name + .windows[].uid
DialogLink.mainDirection
  ├─ type "local"     → direction        = a window uid IN THE SAME dialog
  ├─ type "push"      → qualifiedDirection = {kind:"window", dialog, window}   (pushes return point)
  ├─ type "jump"      → qualifiedDirection = {…}                               (no return point)
  ├─ type "resetjump" → qualifiedDirection = {…}                               (clears the stack)
  ├─ type "tolocation"→ direction        = locs[].uid
  ├─ type "toperson"  → direction        = chars[].uid   (that char MUST have `dialog`)
  ├─ type "reply"     → replyText        = literal text, stays on the same screen
  ├─ type "pop"       → (no target — back to the pushed position)
  └─ type "return"    → (no target — back to the last character dialog / location)
DialogWindow.actor.character ─► chars[].uid
DialogWindow.specialWidget ───► "pac::" + pacWidgets[].id
DialogWindow.changeLocationInBg ─► locs[].uid   (background only, no navigation)
DialogWindow.changeSituation ────► situations[]  (editor-only today — see Gotchas)
Loc.routes / Loc.goto ────────► locs[].uid
Loc.eventHosts / Char.dialog.eventHosts / PointAndClick.eventHosts ─► eventHosts[]
GameEvent.targets ────────────► eventHosts[] or the implicit hosts "loc:<uid>" / "char:<uid>"
GameEvent.link ───────────────► {kind:"window", dialog, window}
Character.roles ──────────────► roles[].name
Reaction.trigger.{facts,chars,items,places} ─► facts[].uid / chars[].uid / items[].uid / locs[].uid
Reaction.dialogWindow ────────► {kind:"window", dialog, window}
Quest.path = [questLineUid, questUid]        Task.path = [questLineUid, questUid, taskUid]
HookScript.hook ──────────────► "<PREFIX>::" + fact/item/situation uid or "::"-joined quest path
scripts: rt.props.X ► props[].name │ rt.facts.X ► facts[].uid │ rt.items.add('X') ► items[].uid
         rt.objectives.L.Q.T ► questline/quest/task uids │ rt.ch.C.X ► char/role prop
```

**UID rules:** `uid`/`name` fields are the identity — renaming one breaks every reference
to it. Use lowercase snake_case. Prop, fact and objective uids are also **JS identifiers**
(they become `rt.props.<name>`, `rt.facts.<uid>`, `rt.objectives.<uid>`), so no spaces,
dashes or leading digits. Dialogs are keyed by `name`; window uids only need to be unique
inside their dialog.

---

## Entity cheat sheet

Minimal valid JSON for each. Full field lists, defaults and every optional script field
are in `references/schema.md`.

```jsonc
// dialogs[] — a named graph of windows
{ "name": "main", "windows": [
  { "uid": "start", "text": { "main": "Text shown.\n---\nSecond page.", "list": [] },
    "backgrounds": { "list": [] }, "tags": [], "specialWidget": null,
    "links": [ { "mainDirection": { "type": "local", "direction": "next" },
                 "text": "Go on", "alternativeDirections": [] } ] } ] }

// chars[] — an NPC; `dialog` is what "toperson" opens
{ "uid": "alice", "displayName": { "main": "Alice", "list": [] },
  "description": { "main": "A merchant.", "list": [] },
  "traits": [], "props": [], "overrideProps": [], "roles": ["merchant"],
  "avatar": { "list": [] }, "discussable": true,
  "dialog": { "text": { "main": "Looking to trade?", "list": [] },
              "background": { "list": [] }, "eventHosts": [],
              "behavior": { "speakingModel": { "agree": ["ok"], "deny": ["no"], "bye": ["bye"],
                                               "hello": ["hello"], "dontKnowObject": ["what is it"],
                                               "dontKnowChar": ["who is it"] },
                            "reactions": [] },
              "links": [ { "mainDirection": { "type": "return", "direction": "" },
                           "text": "Goodbye", "alternativeDirections": [] } ] } }

// roles[] — a prop bundle attached to characters
{ "name": "merchant", "description": "Sells goods",
  "props": [ { "name": "priceModifier", "datatype": "number", "defaultValue": 1 } ] }

// locs[] — a place; `routes` are the walkable exits shown to the player
{ "uid": "market", "displayName": "Market", "backgrounds": { "list": [] },
  "text": { "main": "Stalls line the road.", "list": [] },
  "goto": [], "routes": ["town_square"], "links": [], "discussable": true, "eventHosts": [] }

// props[] — declared variables; datatype: number | string | boolean | variant | location
{ "name": "gold", "datatype": "number", "defaultValue": 0 }
{ "name": "power", "datatype": "variant", "variants": ["off", "on"], "defaultValue": "off" }

// facts[] — learnable knowledge (rt.facts.gate_is_open.know())
{ "uid": "gate_is_open", "short": "The gate is open", "full": "Longer journal text.", "discussable": true }

// items[] — inventory
{ "uid": "rusty_key", "name": "Rusty key", "description": "An old iron key.",
  "price": 0, "unique": true, "stackable": false, "canGive": true,
  "discussable": true, "tags": ["quest_item"], "stats": {} }

// objectives[] — questline → quest → task; `path` MUST mirror the uids above it
{ "uid": "main_line", "name": "Main questline", "tags": [], "quests": [
  { "uid": "first", "path": ["main_line", "first"], "name": "First steps", "tags": [], "ordered": true,
    "tasks": [ { "uid": "visit_town", "path": ["main_line", "first", "visit_town"],
                 "text": "Visit the town square", "critical": true } ] } ] }

// events[] — rolled when the player ENTERS A LOCATION that hosts one of `targets`
{ "name": "Market announcement", "highPriority": false, "probability": 20,
  "targets": ["town_events"], "link": { "kind": "window", "dialog": "main", "window": "event_notice" } }

// pacWidgets[] — point-and-click scene; x/y/width/height are % of the screen
{ "id": "example_scene", "background": "scene.png", "eventHosts": [], "zones": [
  { "id": "door", "name": "Door", "x": 10, "y": 20, "width": 20, "height": 60,
    "idleOpacity": 0.2, "hoverOpacity": 0.8,
    "mainDirection": { "type": "local", "direction": "inside" } } ] }

// uiElements.meters[] — HUD readout; `value` is a script returning the number/string
{ "uid": "hp", "name": "Health", "value": "return rt.props.hp",
  "layout": { "opacity": 1 },
  "progressBar": { "min": 0, "max": 100, "colors": true, "yellowLevel": 25, "redLevel": 10 } }

// hooks[] — script fired by a lifecycle event
{ "name": "Reward", "hook": "FACTS::DISCOVERED::gate_is_open", "body": "rt.props.gold += 25" }

// functions[] — injected into the scope of EVERY script
{ "name": "powered", "args": "", "description": "Main power on?", "body": "return rt.props.power === 'on'" }
```

---

## Workflow for a hand-written game

1. **Declare state first.** `props`, `facts`, `items`, `situations`, `roles` — scripts can
   only touch things declared here (see Gotchas).
2. **Lay out the dialog graph.** One `Dialog` per scene/chapter; windows inside it link
   with cheap `local` links. Cross-dialog moves use `push`/`jump`.
3. **Set `startupDialog`** to an existing dialog+window.
4. **Add locations and characters**, then wire `tolocation` / `toperson` links to them.
5. **Layer scripting on top** — `entryScript`, `actionCode`, `isVisible`/`isEnabled`,
   quests, hooks (`references/scripting.md`).
6. **Validate**: `python3 .claude/skills/game_json/scripts/validate_game.py <file.json>` —
   catches every dangling UID, malformed quest path, unreachable window and undeclared
   prop/fact/item/quest reference in scripts. Errors are things that will break in play;
   warnings are suspicious but sometimes intentional. Add `--strict` to fail on warnings.
7. **Load it** in the editor (JSON drawer or `PUT`) and play through the new path.
   The editor's **Game configuration → Sanity check** tab runs the in-app checker
   (`runSanityCheck`), which additionally verifies that every referenced image file
   exists on the server.

---

## Gotchas that bite hand-written JSON

**Scripts only see declared state.** `rt.props.foo = 1` for an undeclared prop writes to a
throwaway object and is silently lost; `rt.facts.bar` on an undeclared fact is `undefined`
and throws. `rt.items.add('x')` on an unknown item logs an error and does nothing. Declare
first, script second. (Prop *type* validation is only a console warning — the bad value is
still written.)

**`local` links cannot leave their dialog.** `direction` is resolved against the current
dialog's windows only. To reach another dialog use `push` (returnable via `pop`) or
`jump`/`resetjump` with a `qualifiedDirection` object.

**`toperson` needs `char.dialog`.** A character without a `dialog` object renders nothing
and the position is dead. Give every talkable character at least one link back
(`pop` or `return`).

**A dialog with no visible link is a dead end** — there is no built-in back button in the
dialog view. Always leave an exit (or a `pop` to the pushed caller).

**Text paging:** a line containing only `---` splits `text.main` into pages; links are
shown only on the last page. A window whose single visible link has empty `text` becomes
"click anywhere to continue".

**`specialWidget`** must be exactly `"pac::<pacWidget id>"`; anything else throws at render
time. `null` for a normal window.

**Events fire only on location entry.** `EventsProcessor.withPossibleEvent` runs when
`position.kind === "location"`. `eventHosts` on characters and PAC widgets is stored and
rendered but does not auto-roll events. `"eventHosts": null` disables hosting; `[]` means
"only my implicit host" (`loc:<uid>` / `char:<uid>`) — and note `canHostEvents` returns
false for an empty host list, so give a location a named host in `game.eventHosts` (or
target `loc:<uid>` explicitly) if you want events there.

**Quest `path` is redundant data you must keep in sync.** `Task.path` must equal
`[questLineUid, questUid, taskUid]`; `Quest.path` must equal `[questLineUid, questUid]`.
Hooks and `state.progress` key off `path`, so a mismatch silently breaks completion.
`ordered` is typed as the literal `true` — always write `true`.

**`changeSituation` on a window is not applied by the engine.** Only the editor writes it.
Change the situation from a script: `state.situation = 'battle'` (that transition is what
fires `SITUATION::STARTED::*` / `SITUATION::ENDED::*` hooks).

**Image references are bare filenames**, resolved as
`/api/v1/projects/<project>/images/<filename>`. Values starting with `game_assets/`, `/`
or `http(s)://` are used as-is. Referencing a file that was never uploaded shows nothing —
only the in-editor sanity check detects it. Use `""`/omit rather than a placeholder name.

**`ImageList`/`TextList` shape:** `{ "main": "...", "list": [{ "name": "alt", "text": "..." }] }`.
`chooseTextScript` picks a variant by returning its `name` (string) or index (number);
`null`/`-1` selects `main`.

**Hooks are unordered.** Several hooks can match one event; execution order is undefined —
never let one hook depend on another.

**`translations` values of `""` mean "use the built-in string"** — it is an override map,
not a required table.

---

## Keeping this skill accurate

The JSON format is the literal serialization of `dialogic/src/game/*.ts`. When that model
changes — a new field, a new link type, a new hook prefix, a new `ENGINE_VERSION` and patch
— update `references/schema.md` and `scripts/validate_game.py` alongside
`runSanityCheck` (see the compliance rule in CLAUDE.md). The validator deliberately mirrors
`game/sanityCheck.ts` so both catch the same dangling pointers.
