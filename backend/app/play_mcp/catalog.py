"""Playable game discovery and loading (published games + caller's own games)."""

import json
from datetime import datetime, timezone
from pathlib import Path

from app import ownership
from app.api.v1 import projects


def validate_project_name(name: str) -> str:
    if not name or name in {".", ".."} or "/" in name or "\\" in name or "\x00" in name:
        raise ValueError("Invalid project name")
    return name


def _game_file(project: str) -> tuple[Path, Path]:
    validate_project_name(project)
    base = projects._projects_base()
    directory = base / project
    game_path = directory / "game.json"
    if directory.resolve() != directory or game_path.is_symlink() or not game_path.is_file():
        raise ValueError(f"Game '{project}' not found")
    return directory, game_path


def _is_playable_meta(project: str, meta: dict, user: str) -> bool:
    if meta.get("published"):
        return True
    owner = meta.get("owner")
    if owner is None:
        owner = ownership.get_owner(project)
    return owner in (None, user)


def can_play(project: str, user: str) -> bool:
    try:
        directory, _ = _game_file(project)
    except ValueError:
        return False
    meta = projects._get_metadata(directory)
    return _is_playable_meta(project, meta, user)


def load_playable_game(project: str, user: str) -> tuple[dict, dict]:
    """Return (game_dict, metadata) if the caller is allowed to play this project."""
    directory, game_path = _game_file(project)
    meta = projects._get_metadata(directory)
    if not _is_playable_meta(project, meta, user):
        raise ValueError(f"Game '{project}' is not published and not owned by your account")
    return json.loads(game_path.read_bytes()), meta


def game_entry(project: str, directory: Path, meta: dict, user: str) -> dict:
    last_modified = meta.get("lastModified")
    if not last_modified and (directory / "game.json").exists():
        mtime = (directory / "game.json").stat().st_mtime
        last_modified = datetime.fromtimestamp(mtime, timezone.utc).isoformat()
    owner = meta.get("owner")
    return {
        "project": project,
        "display_name": meta.get("displayName") or project,
        "authors": meta.get("authors", []),
        "description": meta.get("description", ""),
        "version": meta.get("version", ""),
        "published": bool(meta.get("published")),
        "owned": owner == user,
        "dialog_count": meta.get("dialogCount"),
        "character_count": meta.get("characterCount"),
        "location_count": meta.get("locationCount"),
        "published_at": meta.get("publishedAt"),
        "last_modified": last_modified,
    }


def game_summary(project: str, user: str) -> dict:
    """Return metadata for a saved game even if it was later unpublished or deleted."""
    try:
        directory, _ = _game_file(project)
        meta = projects._get_metadata(directory)
        playable = _is_playable_meta(project, meta, user)
        return {
            "display_name": meta.get("displayName") or project,
            "published": bool(meta.get("published")),
            "owned": meta.get("owner") == user,
            "playable": playable,
        }
    except ValueError:
        return {
            "display_name": project,
            "published": False,
            "owned": False,
            "playable": False,
        }


def list_available_games(
    user: str,
    search: str = "",
    page: int = 1,
    page_size: int = 20,
    save_stats: dict[str, dict] | None = None,
) -> dict:
    """List all games the caller can play: published games plus their own unpublished games."""
    base = projects._projects_base()
    if not base.exists():
        return {"games": [], "total": 0, "page": page, "page_size": page_size}

    needle = search.strip().lower()
    stats = save_stats or {}
    entries = []
    for d in base.iterdir():
        if not d.is_dir() or d.is_symlink() or not (d / "game.json").is_file():
            continue
        meta = projects._get_metadata(d)
        if not _is_playable_meta(d.name, meta, user):
            continue
        entry = game_entry(d.name, d, meta, user)
        if needle:
            haystack = " ".join(
                [
                    entry["project"],
                    entry["display_name"],
                    entry["description"],
                    " ".join(entry["authors"] or []),
                ]
            ).lower()
            if needle not in haystack:
                continue
        st = stats.get(d.name)
        entry["has_saves"] = st is not None
        entry["save_count"] = st["session_count"] if st else 0
        entry["last_played_at"] = st["last_played_at"] if st else None
        entries.append(entry)

    entries.sort(
        key=lambda e: (e["last_played_at"] or "", e["published_at"] or e["last_modified"] or "", e["project"]),
        reverse=True,
    )
    total = len(entries)
    start = (page - 1) * page_size
    return {
        "games": entries[start : start + page_size],
        "total": total,
        "page": page,
        "page_size": page_size,
    }
