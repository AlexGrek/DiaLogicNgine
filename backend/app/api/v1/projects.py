"""Projects API: list projects, save/load game JSON per project, publishing.

Publishing is a per-project flag kept in the project's ``.metadata`` (outside the
game JSON, so it survives every save). A published project is listed by the
public gallery endpoint and its ``game.json`` may be fetched without an account;
an unpublished one is private to its owner.
"""
from contextlib import contextmanager
import fcntl
import json
import os
import tempfile
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app import auth, prompt_history
from app.ownership import require_owner

STORAGE_ROOT = Path(__file__).parent.parent.parent.parent / "storage"
METADATA_FILENAME = ".metadata"
PAGE_SIZE = 10

router = APIRouter(tags=["projects"])


class PublishRequest(BaseModel):
    published: bool


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


def _get_metadata(project_dir: Path) -> dict:
    """Read the latest metadata, including writes by other workers."""
    meta_file = project_dir / METADATA_FILENAME
    if meta_file.exists():
        try:
            meta = json.loads(meta_file.read_text(encoding="utf-8"))
            return meta
        except Exception:
            pass
    return {}


def _set_metadata(project_dir: Path, metadata: dict) -> None:
    _atomic_write(project_dir / METADATA_FILENAME, json.dumps(metadata, ensure_ascii=False, indent=2).encode())


def _atomic_write(path: Path, contents: bytes):
    with tempfile.NamedTemporaryFile(dir=path.parent, delete=False) as tmp:
        try:
            tmp.write(contents)
            tmp.close()
            os.replace(tmp.name, path)
        finally:
            Path(tmp.name).unlink(missing_ok=True)


@contextmanager
def project_write_lock():
    # Lock the stable parent directory, which survives project deletion/recreation.
    base = _projects_base()
    base.mkdir(parents=True, exist_ok=True)
    fd = os.open(base, os.O_RDONLY)
    try:
        fcntl.flock(fd, fcntl.LOCK_EX)
        yield
    finally:
        os.close(fd)


def _public_entry(name: str, meta: dict) -> dict:
    """Gallery view of a project.

    Deliberately omits ``owner``: project listing is private, and usernames are
    not public data. Attribution comes from the game's own ``authors`` field.
    """
    return {
        "name": name,
        "displayName": meta.get("displayName") or name,
        "authors": meta.get("authors", []),
        "description": meta.get("description", ""),
        "version": meta.get("version", ""),
        "mainImageUrl": meta.get("mainImageUrl"),
        "dialogCount": meta.get("dialogCount"),
        "characterCount": meta.get("characterCount"),
        "locationCount": meta.get("locationCount"),
        "publishedAt": meta.get("publishedAt"),
        "lastModified": meta.get("lastModified"),
    }


def _matches_search(entry: dict, needle: str) -> bool:
    haystack = " ".join(
        [
            entry["name"],
            entry.get("displayName") or "",
            entry.get("description") or "",
            " ".join(entry.get("authors") or []),
        ]
    ).lower()
    return needle in haystack


@router.get("/projects")
async def list_projects(
    page: int = Query(1, ge=1),
    user: str = Depends(auth.get_current_user),
):
    base = _projects_base()
    if not base.exists():
        return {"projects": [], "total": 0, "page": page, "pageSize": PAGE_SIZE}

    # Only list directories that hold an actual saved game AND are owned by the
    # current user. Image uploads can create a project directory (with images/
    # but no game.json); such folders are not loadable games and must not appear
    # in the list, or opening them would 404 on GET /projects/{name}/game.
    dirs = sorted(
        d
        for d in base.iterdir()
        if d.is_dir()
        and (d / "game.json").exists()
        and _get_metadata(d).get("owner") == user
    )
    total = len(dirs)
    start = (page - 1) * PAGE_SIZE
    page_dirs = dirs[start : start + PAGE_SIZE]

    projects = []
    for d in page_dirs:
        meta = _get_metadata(d)
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


@router.get("/projects/published")
async def list_published_projects(
    page: int = Query(1, ge=1),
    search: str = Query(""),
):
    """Public gallery: every project its owner has published, newest first.

    No auth — this backs the main page, where anyone can browse and play
    published games without registering.
    """
    base = _projects_base()
    if not base.exists():
        return {"projects": [], "total": 0, "page": page, "pageSize": PAGE_SIZE}

    needle = search.strip().lower()
    entries = [
        _public_entry(d.name, meta)
        for d in base.iterdir()
        if d.is_dir()
        and (d / "game.json").exists()
        and (meta := _get_metadata(d)).get("published")
    ]
    if needle:
        entries = [e for e in entries if _matches_search(e, needle)]
    # Newest publication first; projects published before publishedAt existed
    # sort last but stay in a stable, name-based order.
    entries.sort(key=lambda e: (e.get("publishedAt") or "", e["name"]), reverse=True)

    total = len(entries)
    start = (page - 1) * PAGE_SIZE
    return {
        "projects": entries[start : start + PAGE_SIZE],
        "total": total,
        "page": page,
        "pageSize": PAGE_SIZE,
    }


@router.put("/projects/{project_name}/game")
async def save_game(
    project_name: str,
    request: Request,
    user: str = Depends(auth.get_current_user),
):
    require_owner(project_name, user)
    body = await request.body()
    try:
        game = json.loads(body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Body must be valid JSON")
    with project_write_lock():
        require_owner(project_name, user)
        persist_game(project_name, user, game, body)
    return {"status": "ok"}


def persist_game(project_name: str, user: str, game: dict, body: bytes):
    """Save while holding project_write_lock; shared by REST and MCP."""
    project_dir = _safe_project_dir(project_name)
    previous = _get_metadata(project_dir)
    project_dir.mkdir(parents=True, exist_ok=True)
    metadata = _extract_metadata(game)
    _atomic_write(project_dir / "game.json", body)
    metadata["owner"] = user
    # Publication state is not part of the game JSON, so carry it over: saving a
    # published game must not silently unpublish it.
    if previous.get("published"):
        metadata["published"] = True
        metadata["publishedAt"] = previous.get("publishedAt")
    metadata["lastModified"] = datetime.now(timezone.utc).isoformat()
    _set_metadata(project_dir, metadata)


@router.post("/projects/{project_name}/publish")
async def set_published(
    project_name: str,
    body: PublishRequest,
    user: str = Depends(auth.get_current_user),
):
    """Publish / unpublish a project (owner only).

    Publishing lists the game in the public gallery and opens its game.json to
    anonymous players; unpublishing takes both away again.
    """
    with project_write_lock():
        require_owner(project_name, user)
        project_dir = _safe_project_dir(project_name)
        if not (project_dir / "game.json").exists():
            raise HTTPException(status_code=404, detail="Game not found")

        metadata = _get_metadata(project_dir)
        metadata["owner"] = metadata.get("owner") or user
        metadata["published"] = body.published
        metadata["publishedAt"] = (
            datetime.now(timezone.utc).isoformat() if body.published else None
        )
        _set_metadata(project_dir, metadata)
        return {
            "name": project_name,
            "published": metadata["published"],
            "publishedAt": metadata["publishedAt"],
        }


@router.get("/projects/{project_name}/game")
async def load_game(project_name: str, request: Request):
    # Public for published games, so /play/{project} links work without an
    # account. Unpublished games stay readable by their owner only (an unclaimed
    # project has no owner to protect, matching require_owner).
    project_dir = _safe_project_dir(project_name)
    game_file = project_dir / "game.json"
    if not game_file.exists():
        raise HTTPException(status_code=404, detail="Game not found")
    meta = _get_metadata(project_dir)
    if not meta.get("published"):
        owner: Optional[str] = meta.get("owner")
        if owner is not None and auth.get_optional_user(request) != owner:
            raise HTTPException(
                status_code=403, detail="This game has not been published"
            )
    return JSONResponse(content=json.loads(game_file.read_text(encoding="utf-8")))


@router.delete("/projects/{project_name}")
async def delete_project(
    project_name: str,
    user: str = Depends(auth.get_current_user),
):
    with project_write_lock():
        require_owner(project_name, user)
        project_dir = _safe_project_dir(project_name)
        if not project_dir.exists():
            raise HTTPException(status_code=404, detail="Project not found")
        shutil.rmtree(project_dir)  # removes game.json, images/ and image_thumbs/
        prompt_history.clear_project(project_name)  # drop host-DB prompt history
        return {"status": "ok"}
