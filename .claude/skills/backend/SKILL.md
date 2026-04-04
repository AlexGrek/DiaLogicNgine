---
name: backend
description: Work on the DiaLogicNgine Python backend (FastAPI + uvicorn + uv). Use when adding routes, file handling, dependencies, or running the server in backend/.
---

# Backend Python Skill

## Stack

- **Python** (>=3.14), managed with **uv**
- **FastAPI** + **uvicorn** for the HTTP server
- **python-multipart** for file uploads
- Project root: `backend/`

## Running the server

```bash
cd backend
uv run python main.py                        # reload mode on port 8000
uv run uvicorn app.main:app --reload         # equivalent
```

## Adding a new route module

1. Create `backend/app/api/v1/<module>.py` with an `APIRouter`.
2. Register it in `backend/app/api/v1/router.py`:
   ```python
   from app.api.v1 import <module>
   router.include_router(<module>.router)
   ```

## File storage

Uploaded files are stored under `backend/storage/projects/{project_name}/`. Never write outside that tree — always resolve paths and verify with `Path.is_relative_to()`.

## Conventions

- All routes live under `/api/v1/`.
- Use `PUT` for idempotent file uploads, `POST` for non-idempotent resource creation.
- Validate `Content-Type` at the boundary (upload endpoints) — reject unknown types with HTTP 415.
- Return `{"status": "ok"}` shape for simple confirmations; richer dicts for resource responses.

## Adding a dependency

```bash
cd backend && uv add <package>
```
