# DiaLogicNgine Server

FastAPI + uvicorn backend that stores game projects and uploaded images, proxies
AI generation (OffloadMQ), and — as of the auth rework — gates everything behind
a **login/password system** with per-user project ownership, with an opt-in
**publishing** flag that exposes a game to anonymous players.

- **Stack:** Python ≥ 3.14, FastAPI, uvicorn, Pillow, managed with **uv**
- The browser REST API lives under `/api/v1/`. MCP clients connect to `/mcp` (Editor MCP) or `/play-mcp` (Player MCP).
- **Storage root:** `backend/storage/` (never write outside this tree)

## Running

```bash
cd backend
uv run python main.py          # reload mode, port 4267 (HOST/PORT env override)
```

On startup the app runs `auth.ensure_root_and_migrate()` (see [Migration](#migration)).

---

## Editor MCP

Connect a Streamable HTTP client to `http://localhost:4267/mcp` for local development. For a deployment, set `MCP_PUBLIC_URL` to the external HTTPS origin (for example, `https://editor.example.org`) and preserve its Host header at the reverse proxy. The backend serves MCP, OAuth and discovery on that origin.

Configure `MCP_API_KEYS` in the backend environment or `backend/.env` as a JSON object mapping **existing editor usernames** to separate random secrets. Generate a key with `openssl rand -hex 32`, then set the variable and restart the backend. For example, the value has the shape `{"alice":"<generated secret>"}`. Each key grants editing access to the projects owned by that account.

Clients can send `X-API-Key` or `Authorization: Bearer <key>`. Clients using OAuth discover the authorization server from the 401 challenge, register a public client, and open the approval page. Enter the account's MCP key there to approve the displayed client and callback. The client exchanges its single-use code with S256 PKCE and receives an hour-long access token and a rotating 30-day refresh token. Grant records live in `storage/auth/mcp.sqlite`. Removing or changing an account's key and restarting the backend invalidates its outstanding grants.

### Edit a saved project

1. Call `list_projects` to select a saved game. Call `editor_planes` to discover sections and fields using the editor's organization.
2. Call `browse_field` with a project, plane and field. It returns immediate child pointers, short labels, a count and a revision. Supply a child path to drill down, or use `offset` and `limit` to page.
3. Call `read_fragment` with a selected pointer, for example `/0/windows/0/text/main` in the `dialog` plane's `dialogs` field. Reads are limited to 12 KB. Long strings support paging with `text_offset`.
4. Pass the field revision and RFC 6902 operations to `patch_field`. Both `path` and `from` start at the field root. On a revision conflict, browse again before applying the edit.

For example, after reading the first window in the selected dialog:

```json
{
  "project": "demo",
  "plane": "dialog",
  "field": "dialogs",
  "revision": "<revision from browse_field or read_fragment>",
  "operations": [
    {"op": "test", "path": "/0/windows/0/uid", "value": "start"},
    {"op": "replace", "path": "/0/windows/0/text/main", "value": "The shop opens at dawn."}
  ]
}
```

A successful patch persists the game and refreshes its project metadata. A failed operation or new schema violation rejects the batch. The browser editor still saves whole snapshots. Reload a previously opened project before making further browser edits to pick up MCP changes. The editor's sanity check can verify references across fields after a series of patches.

Use `editor_help` with group `schema`, `link` or `script`. Omit `topic` for the index, then request one entry, such as `DialogWindow`, `push` or `isVisible`. Scripts are edited as text.

Use `list_images` to browse filenames and `preview_image` for a single thumbnail. `upload_image` accepts a base64-encoded PNG, JPEG, WebP or GIF and returns a reference suitable for an image field. Uploading to an existing filename replaces the asset. Update references before using `delete_image` to remove an asset.

### Verification and schema maintenance

Run `uv run python -m unittest discover -s tests` from `backend/`. The integration tests start a loopback server with temporary project and credential storage and exercise the REST editor, OAuth and MCP clients.

The validation schema is generated from the editor's TypeScript model. After changing its types, run the following command from `dialogic/` and review any affected field or help entries.

```bash
npx --yes ts-json-schema-generator@2.4.0 --path src/game/GameDescription.ts --tsconfig tsconfig.json --type GameDescription --no-type-check --out ../backend/app/game_mcp/schema.json
```

---

## Player MCP

Connect a Streamable HTTP client to `http://localhost:4267/play-mcp` for local development (or `${MCP_PUBLIC_URL}/play-mcp` in deployment). It shares the same authentication stack as Editor MCP (`X-API-Key`, `Authorization: Bearer <key>`, or OAuth 2.0 S256 PKCE with resource metadata at `/.well-known/oauth-protected-resource/play-mcp`). OAuth tokens are resource-scoped, so an Editor MCP token cannot access `/play-mcp` and vice versa.

### Playable scope & isolation

- **Playable games:** every **published** game plus the caller's own **unpublished** games.
- **Session isolation:** each active session runs the game engine (`player-runner/dist/runner.mjs`, bundled from `dialogic/src/exec` and `dialogic/src/game`) in its own **Deno** subprocess launched with zero permissions (`--no-prompt --no-remote --no-npm`, V8 heap cap, `globalThis.Deno` removed before user script execution). Sessions are addressable only by their owning account + `session_code`.
- **Persistence:** serialized engine state is saved to `storage/play_mcp/sessions.sqlite` (WAL mode) after every turn alongside a 1-step previous autosave and optional named manual checkpoints. Idle workers are evicted on TTL or LRU cap and transparently rehydrated from SQLite on the next call.
- **Multimodal turns:** `start_game`, `resume_session`, `get_state`, `act`, and `load_checkpoint` return the structured turn state (scene text, speaker/location, HUD meters, new notifications, available links/routes/zones/topics/usable items) plus the current scene image (or an annotated 960×540 Point-and-Click composite with numbered zone boxes) as native MCP image content.

### Tools

- **Discovery & library:** `list_available_games`, `list_saved_games`, `list_recently_played`, `list_sessions`
- **Session & saves:** `start_game`, `resume_session`, `delete_session`, `save_checkpoint`, `list_checkpoints`, `load_checkpoint`, `delete_checkpoint`
- **Gameplay & inspection:** `get_state`, `act` (`choose_link` | `continue` | `travel` | `click_zone` | `discuss` | `use_item`), `inspect` (`inventory` | `facts` | `people` | `places` | `objectives` | `history` | `summary`), `view_image` (`scene` | `avatar` | `item` | `route` | `pac_annotated`)

### Building the runner & configuration

Build the headless JS runner after changing `dialogic/src/exec`, `dialogic/src/game`, or `player-runner/src/`:

```bash
task runner:build              # or: cd player-runner && npm run typecheck && npm run build
```

Optional environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PLAY_MCP_RUNNER_PATH` | auto-detected `player-runner/dist/runner.mjs` | Path to the bundled headless runner |
| `PLAY_MCP_DENO_BIN` | `deno` on `PATH` | Path to the Deno executable |
| `PLAY_MCP_TURN_TIMEOUT` | `5.0` | Per-turn execution timeout in seconds (kills hung worker) |
| `PLAY_MCP_IDLE_TTL` | `600.0` | Idle worker eviction timeout in seconds |
| `PLAY_MCP_MAX_WORKERS` | `16` | Maximum concurrent Deno workers (LRU eviction) |
| `PLAY_MCP_V8_MAX_MB` | `64` | `--max-old-space-size` limit per worker in MB |
| `PLAY_MCP_IMAGE_MAX_PX` | `1024` | Max image dimension returned to MCP clients |

---

## Authentication

Authentication is **cookie-based**, using a stateless **HMAC-signed token**.

### Why cookies (not a Bearer header)

Images are loaded by the browser through `<img src>` and CSS `url(...)`. The
browser only attaches credentials to those requests automatically as **cookies**,
not as `Authorization` headers. The dev frontend reaches the API same-origin
through the Vite proxy (`/api` → `:4267`), so the `dln_session` cookie rides along
with every request, including image loads.

### Sessions are stateless

There is no server-side session table. The cookie carries a signed token:

```
<base64url(json{"u": username, "exp": epoch})>.<base64url(HMAC-SHA256 signature)>
```

- Signed with a secret generated once and persisted to `storage/auth/secret`.
- TTL is **30 days** (`auth.TOKEN_TTL_SECONDS`); expiry is checked on every request.
- Because it is stateless, sessions **survive server reloads** (dev runs with
  `reload=True`). Logout simply clears the cookie client-side.

Cookie: `dln_session`, `HttpOnly`, `SameSite=Lax`, `Path=/`.

### Password storage

Passwords are hashed with **PBKDF2-HMAC-SHA256** (200 000 iterations, 16-byte
random salt) — stdlib only, no external crypto dependency. The user store is a
JSON file guarded by a process-wide lock:

```
storage/auth/users.json
{
  "root": { "pw_salt": "…", "pw_hash": "…", "created": 1781907213862 },
  "alice": { … }
}
```

Usernames are normalised to lowercase and must be 3–32 chars of `[a-z0-9_-]`.

### Auth endpoints (`/api/v1/auth`)

| Method | Path               | Auth | Description |
|--------|--------------------|------|-------------|
| POST   | `/auth/register`   | —    | Free registration. 409 if the username is taken. Sets the session cookie. |
| POST   | `/auth/login`      | —    | Validates credentials, sets the session cookie. 401 on bad credentials. |
| POST   | `/auth/logout`     | —    | Clears the session cookie. |
| POST   | `/auth/change-password` | ✓ | Verifies `old_password`, sets `new_password`. 401 if the current password is wrong. |
| GET    | `/auth/me`         | ✓    | Returns `{ "username": … }` for the current session, else 401. |

Request bodies are JSON: `{ "username", "password" }`, and for change-password
`{ "old_password", "new_password" }`.

---

## Ownership model

Projects keep a **flat** layout — `storage/projects/{project}/` — and record the
owner in the project's existing `.metadata` file:

```jsonc
// storage/projects/{project}/.metadata
{ "owner": "root", "published": true, "publishedAt": "…",
  "displayName": "…", "lastModified": "…", … }
```

[`app/ownership.py`](app/ownership.py) exposes:

- `get_owner(project_name)` → the owner username or `None`
- `require_owner(project_name, user)` → raises **403** unless the project is
  unclaimed (`owner is None`) or owned by `user`

### Access rules

| Action | Rule |
|--------|------|
| List projects | Auth required; returns **only the caller's** projects. |
| Save / delete project | Auth + `require_owner`. Saving a new project stamps `owner = caller`. |
| Publish / unpublish | Auth + `require_owner`. |
| Upload / list / delete / resize images | Auth + `require_owner`. |
| AI generation (LLM / imggen), prompt history | Auth + `require_owner` on the target project. |
| OffloadMQ settings | Auth required. |
| **List published projects** | **Public** — backs the gallery on the main page. |
| **Load `game.json`** | **Public if published**, otherwise owner-only. |
| **Serve image / thumbnail** | **Public** — required to render a played game. |

---

## Publishing

Publishing is a per-project boolean in `.metadata` (`published`, plus a
`publishedAt` timestamp), flipped by the owner through
`POST /projects/{p}/publish`. It lives outside `game.json`, and `save_game`
carries it over on every save, so re-saving a game never silently unpublishes it.

A **published** project:

- is listed by the public `GET /projects/published` endpoint (the gallery the
  frontend renders at `/` for logged-out visitors and at `/games` for everyone);
- has a **publicly readable `game.json`**, so `/play/{project}` works with no
  account.

An **unpublished** project is invisible to the gallery and its `game.json`
returns **403** to anyone but its owner (an *unclaimed* project — no `owner` in
`.metadata` — stays readable, matching `require_owner`).

### Trade-offs

- Project **names share one global namespace**, so a published game is reachable
  by anyone who knows its name — that is the point of publishing.
- Image and thumbnail serving stays public regardless of publication state: a
  played game must be able to render its assets, and locking images to published
  projects would break the editor's own image loads. Uploads are still
  owner-gated, and filenames are not enumerable without auth.
- The gallery response deliberately omits `owner`: usernames are not public
  data; attribution comes from the game's own `authors` field.

---

## Migration

`auth.ensure_root_and_migrate()` runs on every startup and is **idempotent**:

1. Creates the **`root`** user with password **`000000`** if it does not exist.
2. Stamps `owner: "root"` into the `.metadata` of every existing project under
   `storage/projects/` that has no owner yet.

So all pre-existing projects and uploads belong to `root` after the first boot
on the new code. **Change the root password in production** (via
`POST /auth/change-password` while logged in as root).

---

## Storage layout

```
backend/storage/
  auth/
    users.json            # username → {pw_salt, pw_hash, created}
    secret                # HMAC signing secret (generated once)
    mcp.sqlite            # MCP OAuth clients, codes, and token grants
  play_mcp/
    sessions.sqlite       # Player MCP sessions, autosaves, and manual checkpoints
  projects/
    {project}/
      .metadata           # {owner, displayName, lastModified, counts, …}
      game.json           # the GameDescription
      images/             # uploaded originals
      image_thumbs/       # 256px thumbnails (lazily generated)
  prompt_history.sqlite   # AI prompt history, keyed {project}::{workflow}
```

`prompt_history.sqlite` keeps a single global namespace keyed by project name;
no migration was needed because project names remain globally unique.

---

## Full route map

Public = no auth · Auth = valid session · Owner = auth + `require_owner`.

| Method | Path | Access |
|--------|------|--------|
| GET | `/api/v1/health`, `/health/ready` | Public |
| POST | `/api/v1/auth/register`, `/login`, `/logout` | Public |
| POST | `/api/v1/auth/change-password` | Auth |
| GET | `/api/v1/auth/me` | Auth |
| GET | `/api/v1/projects` | Auth (own only) |
| GET | `/api/v1/projects/published` | **Public** (paged, `?search=`) |
| GET | `/api/v1/projects/{p}/game` | **Public if published**, else Owner |
| PUT | `/api/v1/projects/{p}/game` | Owner |
| POST | `/api/v1/projects/{p}/publish` | Owner |
| DELETE | `/api/v1/projects/{p}` | Owner |
| GET | `/api/v1/projects/{p}/images/{file}`, `/image_thumbs/{file}` | **Public** |
| GET | `/api/v1/projects/{p}/images` | Owner |
| PUT/DELETE | `/api/v1/projects/{p}/images/{file}` | Owner |
| POST | `/api/v1/projects/{p}/images/resize` | Owner |
| GET | `/api/v1/llm/models`, `/imggen/models` | Auth |
| POST | `/api/v1/llm/generate-dialog`, `/generate-text` | Auth (+ Owner if `project_name` set) |
| POST | `/api/v1/imggen/generate` | Owner |
| GET | `/api/v1/imggen/status/{p}/…` | Owner |
| GET/POST/DELETE | `/api/v1/prompts/{p}/…` | Owner |
| GET/POST | `/api/v1/settings/offloadmq` | Auth |

---

## Security notes / production checklist

- **Change the `root` password** (`000000` is a migration default only).
- Serve over **HTTPS** and set the session cookie `Secure` (currently omitted so
  it works over plain `http://localhost`). See `_set_session_cookie` in
  [`app/api/v1/auth_routes.py`](app/api/v1/auth_routes.py).
- `storage/auth/secret` is the session signing key — back it up and keep it out
  of version control; deleting it invalidates all existing sessions.
- Registration is intentionally **open** ("free registration"). Add an allow-list
  or invite flow in `auth_routes.register` if you need to restrict signups.
- The user store and metadata writes are guarded by a process-wide lock, which is
  fine for a single uvicorn process; a multi-worker deployment would need an
  external store.
