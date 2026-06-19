# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

**DiaLogicNgine** is a visual novel / dialogue-based game editor and runtime built with React + TypeScript + Vite. The app is located in the `dialogic/` subdirectory.

## Commands

All commands run from `dialogic/`:

```bash
npm run dev       # Start Vite dev server with HMR
npm run build     # TypeScript compile + Vite production build
npm run lint      # ESLint (zero warnings tolerance)
npm run preview   # Preview production build
npm run cypress:run   # Run Cypress integration tests (headless)
npm run cypress:open  # Open Cypress interactive runner
```

## Integration tests

Cypress e2e tests live in `dialogic/cypress/e2e/`. **Run them whenever a change touches routing, navigation, the home page, the editor layout, the sidebar, or the player.** Both services must be running first:

```bash
# Terminal 1
cd dialogic && npm run dev        # frontend on :5173

# Terminal 2
cd backend && uv run python main.py   # backend on :4267

# Terminal 3
cd dialogic && npm run cypress:run
```

The scripts handle the `ELECTRON_RUN_AS_NODE` NVM quirk automatically — never run `npx cypress run` directly.

Specs:
- `home-page.cy.js` — home page load, create-form validation
- `editor-routes.cy.js` — direct URL nav + sidebar nav for all 12 routes
- `main-path.cy.js` — create project → editor → sidebar → player → new game

## Architecture

### Two entry points

- **`App.tsx`** — the game editor UI
- **`AppGameRuntime.tsx`** — standalone runtime player (renders only `<Player>`)

### Layer separation

```
game/        — Pure data model types (no React)
exec/        — Game execution engine (no React, except GameExecutor.tsx)
components/  — React UI (editor + player views)
savegame/    — Save/load persistence
```

### `game/` — Data model

`GameDescription` is the root data structure holding the entire game definition. Key fields: `dialogs`, `chars`, `roles`, `locs`, `props`, `facts`, `items`, `events`, `eventHosts`, `objectives`, `situations`, `uiElements`, `pacWidgets`, `translations`.

Notable types:
- `Dialog` → has `windows: DialogWindow[]`
- `DialogWindow` → has `links: DialogLink[]`, `entryScript`, `specialWidget`
- `DialogLink` → supports link types: `local`, `push`, `pop`, `jump`, `resetjump`, `tolocation`, `toperson`, `reply`, `return`
- `Prop` — game variables (string/number/boolean/variant datatypes)
- `PointAndClick` — point-and-click scene with clickable `PointAndClickZone[]`

### `exec/` — Execution engine

**→ Use the `game_engine` skill when working with these files.**

`GameExecManager` orchestrates game execution, delegating to sub-processors:
- `EventsProcessor` — fires game events
- `DiscussionProcessor` — character discussion topics
- `QuestProcessor` — quest/task objective tracking
- `GameUiElementsProcessor` — runtime UI element state

**Script evaluation** (`Runtime.ts`): user-authored scripts are executed via `window.eval()` with the signature:
```js
(rt, state, props, ch, facts, objectives, situation, items, context) => { ... }
```
`RuntimeRt` (the `rt` object) wraps `State` with JS property descriptors to expose `rt.props.*`, `rt.ch.<charUid>.*`, `rt.facts.*`, `rt.objectives.*`, `rt.items.*`, `rt.history.*` as readable/writable game state accessors.

`State` (in `GameState.ts`) is the mutable runtime state: `position`, `positionStack`, `props`, `knownFacts`, `carriedItems`, `happenedEvents`, etc.

### `components/` — React UI

**→ Use the `frontend` skill when working with components, routing, or the IUpds state interface.**

**Editor components** (`components/menuitems/`):
- `DialogEditor` — main dialog graph editor
- `charedit/` — character + role editor
- `locedit/` — location editor
- `scriptedit/` — script editor
- `factsobjectives/` — facts & quest editor
- `items/` — inventory item editor
- `uielements/` — HUD/UI element editor
- `pointandclick/` — point-and-click scene editor
- `configuration/` — game config & general info

**Player components** (`components/player/`): `Player.tsx` → `PlayerCore.tsx` → view components (`DialogWindowView`, `LocationView`, `CharDialogView`, `PacView`, etc.)

→ **For player rendering architecture**, see the `game_engine` skill (it covers `Player.tsx`, `PlayerCore.tsx`, and the `GameExecManager` → `RenderView` flow).

### State management pattern

All editor state lives in `App.tsx` as `useState<GameDescription>`. All mutations are funneled through the `IUpds` interface, which is passed as `handlers` prop to every editor component. Updates always produce new objects (lodash `cloneDeep` for deep copies, spread for shallow).

### Save/load

`SaveLoadManager.ts` serializes/deserializes `GameDescription` to/from JSON. `savegame/LocalStorageSavesManager.ts` handles browser localStorage persistence for runtime save slots.

### Sanity check

`game/sanityCheck.ts` (`runSanityCheck`) is a pure validator that walks the whole `GameDescription` looking for **dangling pointers** — links and references whose target no longer exists (dialog/location/character links, startup dialog, actors, situations, PAC widgets, event links) and image file references missing on the server. It is surfaced in the editor under **Game configuration → Sanity check** tab (`components/menuitems/configuration/SanityCheckPanel.tsx`).

**Compliance rule:** the sanity checker must stay in sync with the data model. Whenever you add or change a reference/pointer field on the model — a new link type, a new field that holds a UID/dialog-window id, a new image-bearing field, or a migration in `game/Patches.ts` that introduces or rewrites such a field — review `runSanityCheck` and extend it so the new reference is validated. A patch that adds referencing data without a matching sanity-check rule is incomplete.

## Backend

A FastAPI + uvicorn Python backend lives in `backend/`. It serves file storage for the editor.

### Stack

- **Python** (>=3.14), managed with **uv**
- **FastAPI** + **uvicorn** for the HTTP server
- **Pillow** for image thumbnail generation

### Running the server

```bash
cd backend
uv run python main.py          # reload mode on port 8000
```

### Structure

```
backend/
  main.py                     — entry point (uvicorn launcher)
  app/
    main.py                   — FastAPI app creation
    api/v1/
      router.py               — registers all route modules
      health.py               — GET /api/v1/health, /api/v1/health/ready
      images.py               — image upload/serve/thumbnail routes
storage/projects/{project}/   — uploaded files root (never write outside this)
```

### Image API (`/api/v1/projects/{project_name}/`)

- `PUT  /images/{filename}` — upload image (validates MIME, generates 256px thumbnail)
- `GET  /images` — list images for a project
- `GET  /images/{filename}` — serve original image
- `GET  /image_thumbs/{filename}` — serve thumbnail

### Adding a new route module

1. Create `backend/app/api/v1/<module>.py` with an `APIRouter`.
2. Register it in `backend/app/api/v1/router.py`:
   ```python
   from app.api.v1 import <module>
   router.include_router(<module>.router)
   ```

### Conventions

- All routes are prefixed `/api/v1/`.
- Use `PUT` for idempotent file uploads, `POST` for non-idempotent resource creation.
- Validate `Content-Type` at upload boundaries — reject unknown types with HTTP 415.
- Always resolve paths and verify with `Path.is_relative_to()` before writing files.
- Return `{"status": "ok"}` for simple confirmations; richer dicts for resource responses.

### Adding a dependency

```bash
cd backend && uv add <package>
```
