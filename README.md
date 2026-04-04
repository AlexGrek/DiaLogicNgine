# DiaLogicNgine

A visual novel / dialogue-based game editor and runtime. The editor runs in the browser; a Python backend handles asset storage.

## Prerequisites

| Tool | Purpose |
|------|---------|
| [Node.js](https://nodejs.org) + npm | Frontend |
| [uv](https://docs.astral.sh/uv/) | Python backend dependency management |
| [Task](https://taskfile.dev) | Running dev tasks |

## Quick start

```bash
# install frontend dependencies (first time only)
cd dialogic && npm install && cd ..

# start both servers
task dev
```

| Service | URL |
|---------|-----|
| Editor (Vite) | http://localhost:5173 |
| API (FastAPI) | http://localhost:8000 |
| API docs | http://localhost:8000/docs |

The Vite dev server proxies `/api/*` to the backend automatically — no CORS config needed.

## Running individually

```bash
task backend    # FastAPI on :8000 with --reload
task frontend   # Vite on :5173 with HMR
```

## Project structure

```
dialogic/   React + TypeScript + Vite frontend
backend/    Python FastAPI backend
  app/
    api/v1/
      health.py   GET /api/v1/health
      images.py   image upload, list, serve, thumbnails
storage/    uploaded files (git-ignored)
  projects/{project}/images/        original uploads
  projects/{project}/image_thumbs/  auto-generated 256px thumbnails
```

## Image assets

Images are uploaded through the editor's **Server** image picker tab and stored under `storage/`. On upload the backend automatically generates a thumbnail (max 256 px on the longer side) with Pillow.

To add a backend dependency:

```bash
cd backend && uv add <package>
```
