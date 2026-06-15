"""Projects API: list projects, save/load game JSON per project."""
import json
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import JSONResponse

from app import prompt_history

STORAGE_ROOT = Path(__file__).parent.parent.parent.parent / "storage"
METADATA_FILENAME = ".metadata"
PAGE_SIZE = 10

router = APIRouter(tags=["projects"])

# In-memory metadata cache: project_name -> metadata dict
_metadata_cache: dict[str, dict] = {}


def _projects_base() -> Path:
    return (STORAGE_ROOT / "projects").resolve()


def _safe_project_dir(project_name: str) -> Path:
    base = _projects_base()
    target = (base / project_name).resolve()
    if not target.is_relative_to(base):
        raise HTTPException(status_code=400, detail="Invalid project name")
    return target


def _extract_metadata(game: dict) -> dict:
    general = game.get("general", {})
    start_menu = game.get("startMenu", {})
    return {
        "displayName": general.get("name", ""),
        "authors": general.get("authors", []),
        "description": general.get("description", ""),
        "version": general.get("version", ""),
        "mainImageUrl": start_menu.get("menuBackground") or None,
        "dialogCount": len(game.get("dialogs", [])),
        "characterCount": len(game.get("chars", [])),
        "locationCount": len(game.get("locs", [])),
    }


def _get_metadata(project_name: str, project_dir: Path) -> dict:
    """Return metadata from cache, falling back to disk, then empty dict."""
    if project_name in _metadata_cache:
        return _metadata_cache[project_name]
    meta_file = project_dir / METADATA_FILENAME
    if meta_file.exists():
        try:
            meta = json.loads(meta_file.read_text(encoding="utf-8"))
            _metadata_cache[project_name] = meta
            return meta
        except Exception:
            pass
    return {}


def _set_metadata(project_name: str, project_dir: Path, metadata: dict) -> None:
    """Write metadata to disk and update the cache."""
    (project_dir / METADATA_FILENAME).write_text(
        json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    _metadata_cache[project_name] = metadata


def _evict_metadata(project_name: str) -> None:
    _metadata_cache.pop(project_name, None)


@router.get("/projects")
async def list_projects(page: int = Query(1, ge=1)):
    base = _projects_base()
    if not base.exists():
        return {"projects": [], "total": 0, "page": page, "pageSize": PAGE_SIZE}

    # Only list directories that hold an actual saved game. Image uploads can
    # create a project directory (with images/ but no game.json); such folders
    # are not loadable games and must not appear in the list, or opening them
    # would 404 on GET /projects/{name}/game.
    dirs = sorted(
        d for d in base.iterdir() if d.is_dir() and (d / "game.json").exists()
    )
    total = len(dirs)
    start = (page - 1) * PAGE_SIZE
    page_dirs = dirs[start : start + PAGE_SIZE]

    projects = []
    for d in page_dirs:
        meta = _get_metadata(d.name, d)
        if "lastModified" not in meta:
            # Projects saved before lastModified was tracked: derive it from
            # the game.json file's modification time so the UI still has a date.
            mtime = (d / "game.json").stat().st_mtime
            meta = {
                **meta,
                "lastModified": datetime.fromtimestamp(
                    mtime, timezone.utc
                ).isoformat(),
            }
        projects.append({"name": d.name, **meta})

    return {"projects": projects, "total": total, "page": page, "pageSize": PAGE_SIZE}


@router.put("/projects/{project_name}/game")
async def save_game(project_name: str, request: Request):
    body = await request.body()
    try:
        game = json.loads(body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Body must be valid JSON")
    project_dir = _safe_project_dir(project_name)
    project_dir.mkdir(parents=True, exist_ok=True)
    (project_dir / "game.json").write_bytes(body)
    metadata = _extract_metadata(game)
    metadata["lastModified"] = datetime.now(timezone.utc).isoformat()
    _set_metadata(project_name, project_dir, metadata)
    return {"status": "ok"}


@router.get("/projects/{project_name}/game")
async def load_game(project_name: str):
    project_dir = _safe_project_dir(project_name)
    game_file = project_dir / "game.json"
    if not game_file.exists():
        raise HTTPException(status_code=404, detail="Game not found")
    return JSONResponse(content=json.loads(game_file.read_text(encoding="utf-8")))


@router.delete("/projects/{project_name}")
async def delete_project(project_name: str):
    project_dir = _safe_project_dir(project_name)
    if not project_dir.exists():
        raise HTTPException(status_code=404, detail="Project not found")
    shutil.rmtree(project_dir)  # removes game.json, images/ and image_thumbs/
    _evict_metadata(project_name)
    prompt_history.clear_project(project_name)  # drop host-DB prompt history
    return {"status": "ok"}
