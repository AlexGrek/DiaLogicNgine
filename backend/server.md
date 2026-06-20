# DiaLogicNgine Server

FastAPI + uvicorn backend that stores game projects and uploaded images, proxies
AI generation (OffloadMQ), and — as of the auth rework — gates everything behind
a **login/password system** with per-user project ownership.

- **Stack:** Python ≥ 3.14, FastAPI, uvicorn, Pillow, managed with **uv**
- **All routes** live under `/api/v1/`
- **Storage root:** `backend/storage/` (never write outside this tree)

## Running

```bash
cd backend
uv run python main.py          # reload mode, port 4267 (HOST/PORT env override)
```

On startup the app runs `auth.ensure_root_and_migrate()` (see [Migration](#migration)).

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
{ "owner": "root", "displayName": "…", "lastModified": "…", … }
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
| Upload / list / delete / resize images | Auth + `require_owner`. |
| AI generation (LLM / imggen), prompt history | Auth + `require_owner` on the target project. |
| OffloadMQ settings | Auth required. |
| **Load `game.json`** | **Public** — published games stay playable. |
| **Serve image / thumbnail** | **Public** — required to render a played game. |

### Trade-off (Play is public)

Because game JSON and image serving are public, project **names share one global
namespace**, and a logged-in user who guesses another user's project *name* can
open it **read-only** (saving is blocked by `require_owner`). Project
*enumeration* (the listing) is private — you only see your own. This is the
deliberate cost of keeping shared `/play/{project}` links working without an
account.

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
| GET | `/api/v1/projects/{p}/game` | **Public** |
| PUT | `/api/v1/projects/{p}/game` | Owner |
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
