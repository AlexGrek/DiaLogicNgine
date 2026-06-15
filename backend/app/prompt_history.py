"""
Host-level prompt history store.

All AI generation prompts (dialog, free text, image) are persisted in a single
host database — a SqliteDict key-value store living at
``storage/prompt_history.sqlite``. This is the "common Python kvpair database":
keys are composite ``{project_name}::{workflow}`` strings, values are lists of
prompt entries (most-recent first).

A "workflow" is the type of generation, e.g. ``dialog``, ``text`` or ``image``.

Each entry::

    {"prompt": "<text>", "ts": <epoch_ms>, "meta": {<optional>}}

Writes are best-effort: the recording helpers must never raise into a
generation request, so callers wrap them defensively (and we also guard here).
"""

import threading
import time
from pathlib import Path

from sqlitedict import SqliteDict

STORAGE_ROOT = Path(__file__).parent.parent / "storage"
DB_PATH = STORAGE_ROOT / "prompt_history.sqlite"

# Cap entries kept per (project, workflow) so the store never grows unbounded.
MAX_ENTRIES = 50

# SqliteDict opens its own sqlite connection per `with` block; a process-wide
# lock serialises our read-modify-write cycles so concurrent requests can't
# clobber each other's history list.
_lock = threading.Lock()


def _key(project_name: str, workflow: str) -> str:
    return f"{project_name}::{workflow}"


def _open() -> SqliteDict:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    return SqliteDict(str(DB_PATH), tablename="prompts", autocommit=True)


def record_prompt(
    project_name: str | None,
    workflow: str,
    prompt: str,
    meta: dict | None = None,
) -> None:
    """Prepend a prompt to the history for ``project_name``/``workflow``.

    No-op when project or prompt is empty. Identical consecutive prompts are
    de-duplicated (the older copy is dropped and the fresh one moved to top).
    Never raises — history must not break generation.
    """
    project_name = (project_name or "").strip()
    prompt = (prompt or "").strip()
    if not project_name or not prompt:
        return
    try:
        with _lock, _open() as db:
            key = _key(project_name, workflow)
            entries = db.get(key, [])
            entries = [e for e in entries if e.get("prompt") != prompt]
            entry = {"prompt": prompt, "ts": int(time.time() * 1000)}
            if meta:
                entry["meta"] = meta
            entries.insert(0, entry)
            db[key] = entries[:MAX_ENTRIES]
    except Exception:
        # Best-effort persistence; swallow storage errors.
        pass


def list_prompts(project_name: str, workflow: str) -> list[dict]:
    """Return history entries (most recent first) for project/workflow."""
    try:
        with _lock, _open() as db:
            return db.get(_key(project_name, workflow), [])
    except Exception:
        return []


def delete_prompt(project_name: str, workflow: str, ts: int) -> bool:
    """Delete the single entry with the given timestamp. Returns True if removed."""
    try:
        with _lock, _open() as db:
            key = _key(project_name, workflow)
            entries = db.get(key, [])
            remaining = [e for e in entries if e.get("ts") != ts]
            if len(remaining) == len(entries):
                return False
            db[key] = remaining
            return True
    except Exception:
        return False


def clear_prompts(project_name: str, workflow: str) -> None:
    """Remove all history for the given project/workflow."""
    try:
        with _lock, _open() as db:
            db.pop(_key(project_name, workflow), None)
    except Exception:
        pass


def list_workflows(project_name: str) -> list[str]:
    """Return the workflow names that have stored prompts for a project."""
    prefix = f"{project_name}::"
    try:
        with _lock, _open() as db:
            return [k[len(prefix):] for k in db.keys() if k.startswith(prefix)]
    except Exception:
        return []


def clear_project(project_name: str) -> None:
    """Remove all prompt history (every workflow) for a project."""
    prefix = f"{project_name}::"
    try:
        with _lock, _open() as db:
            for key in [k for k in db.keys() if k.startswith(prefix)]:
                db.pop(key, None)
    except Exception:
        pass
