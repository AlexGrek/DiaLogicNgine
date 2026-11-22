"""SQLite persistence for Player MCP sessions, per-turn autosaves, and manual checkpoints."""

import hmac
import json
import secrets
import sqlite3
from contextlib import closing, contextmanager
from datetime import datetime, timezone
from pathlib import Path

STORAGE_ROOT = Path(__file__).parent.parent.parent / "storage"

SCHEMA = """
CREATE TABLE IF NOT EXISTS sessions (
    session_code      TEXT PRIMARY KEY,
    owner             TEXT NOT NULL,
    project           TEXT NOT NULL,
    title             TEXT NOT NULL DEFAULT '',
    state_json        TEXT NOT NULL,
    prev_state_json   TEXT,
    step_count        INTEGER NOT NULL DEFAULT 0,
    position_kind     TEXT NOT NULL DEFAULT '',
    position_summary  TEXT NOT NULL DEFAULT '',
    last_background   TEXT,
    game_version      TEXT NOT NULL DEFAULT '',
    created_at        TEXT NOT NULL,
    last_played_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_owner_played
    ON sessions(owner, last_played_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_owner_project
    ON sessions(owner, project, last_played_at DESC);

CREATE TABLE IF NOT EXISTS checkpoints (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    session_code      TEXT NOT NULL REFERENCES sessions(session_code) ON DELETE CASCADE,
    owner             TEXT NOT NULL,
    name              TEXT NOT NULL,
    state_json        TEXT NOT NULL,
    step_count        INTEGER NOT NULL,
    position_summary  TEXT NOT NULL DEFAULT '',
    created_at        TEXT NOT NULL,
    UNIQUE(session_code, name)
);
CREATE INDEX IF NOT EXISTS idx_checkpoints_session
    ON checkpoints(session_code, created_at DESC);
"""


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def db_path() -> Path:
    path = STORAGE_ROOT / "play_mcp" / "sessions.sqlite"
    path.parent.mkdir(parents=True, exist_ok=True)
    return path


@contextmanager
def _connect():
    conn = sqlite3.connect(db_path(), timeout=10.0)
    conn.row_factory = sqlite3.Row
    with closing(conn), conn:
        conn.execute("PRAGMA journal_mode = WAL")
        conn.execute("PRAGMA foreign_keys = ON")
        conn.execute("PRAGMA busy_timeout = 5000")
        conn.executescript(SCHEMA)
        yield conn


def _encode_state(state: dict) -> str:
    return json.dumps(state, ensure_ascii=False, separators=(",", ":"))


def _validate_session_code(code: str) -> str:
    if not code or len(code) > 128 or any(ch.isspace() for ch in code):
        raise ValueError("Invalid session_code")
    return code


def create_session(
    owner: str,
    project: str,
    title: str,
    state: dict,
    turn: dict,
) -> dict:
    session_code = "play_" + secrets.token_urlsafe(18)
    now = _now_iso()
    state_json = _encode_state(state)
    position_kind = str((state.get("position") or {}).get("kind", ""))
    position_summary = str(turn.get("position_summary", ""))
    last_bg = (turn.get("scene") or {}).get("background_ref")
    step_count = int(turn.get("step", state.get("stepCount", 0)))
    game_version = str(turn.get("game_version", state.get("gameVersion", "")))

    with _connect() as db:
        db.execute(
            """
            INSERT INTO sessions (
                session_code, owner, project, title, state_json, prev_state_json,
                step_count, position_kind, position_summary, last_background,
                game_version, created_at, last_played_at
            ) VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                session_code,
                owner,
                project,
                title.strip(),
                state_json,
                step_count,
                position_kind,
                position_summary,
                last_bg,
                game_version,
                now,
                now,
            ),
        )
    return {
        "session_code": session_code,
        "owner": owner,
        "project": project,
        "title": title.strip(),
        "step_count": step_count,
        "position_kind": position_kind,
        "position_summary": position_summary,
        "last_background": last_bg,
        "game_version": game_version,
        "created_at": now,
        "last_played_at": now,
    }


def get_session(owner: str, session_code: str) -> dict | None:
    _validate_session_code(session_code)
    with _connect() as db:
        row = db.execute(
            "SELECT * FROM sessions WHERE session_code = ? AND owner = ?",
            (session_code, owner),
        ).fetchone()
        if not row or not hmac.compare_digest(row["session_code"], session_code):
            return None
        return dict(row)


def require_session(owner: str, session_code: str) -> dict:
    record = get_session(owner, session_code)
    if not record:
        raise ValueError("Play session not found")
    return record


def update_session_turn(
    owner: str,
    session_code: str,
    state: dict,
    turn: dict,
    *,
    shift_prev: bool = True,
) -> None:
    _validate_session_code(session_code)
    now = _now_iso()
    state_json = _encode_state(state)
    position_kind = str((state.get("position") or {}).get("kind", ""))
    position_summary = str(turn.get("position_summary", ""))
    last_bg = (turn.get("scene") or {}).get("background_ref")
    step_count = int(turn.get("step", state.get("stepCount", 0)))
    game_version = str(turn.get("game_version", state.get("gameVersion", "")))

    with _connect() as db:
        if shift_prev:
            cur = db.execute(
                """
                UPDATE sessions
                SET prev_state_json = state_json,
                    state_json = ?,
                    step_count = ?,
                    position_kind = ?,
                    position_summary = ?,
                    last_background = ?,
                    game_version = ?,
                    last_played_at = ?
                WHERE session_code = ? AND owner = ?
                """,
                (
                    state_json,
                    step_count,
                    position_kind,
                    position_summary,
                    last_bg,
                    game_version,
                    now,
                    session_code,
                    owner,
                ),
            )
        else:
            cur = db.execute(
                """
                UPDATE sessions
                SET state_json = ?,
                    step_count = ?,
                    position_kind = ?,
                    position_summary = ?,
                    last_background = ?,
                    game_version = ?,
                    last_played_at = ?
                WHERE session_code = ? AND owner = ?
                """,
                (
                    state_json,
                    step_count,
                    position_kind,
                    position_summary,
                    last_bg,
                    game_version,
                    now,
                    session_code,
                    owner,
                ),
            )
        if cur.rowcount == 0:
            raise ValueError("Play session not found")


def touch_session(owner: str, session_code: str) -> None:
    _validate_session_code(session_code)
    with _connect() as db:
        cur = db.execute(
            "UPDATE sessions SET last_played_at = ? WHERE session_code = ? AND owner = ?",
            (_now_iso(), session_code, owner),
        )
        if cur.rowcount == 0:
            raise ValueError("Play session not found")


def delete_session(owner: str, session_code: str) -> bool:
    _validate_session_code(session_code)
    with _connect() as db:
        cur = db.execute(
            "DELETE FROM sessions WHERE session_code = ? AND owner = ?",
            (session_code, owner),
        )
        return cur.rowcount > 0


def list_sessions(
    owner: str,
    project: str = "",
    offset: int = 0,
    limit: int = 20,
) -> dict:
    with _connect() as db:
        where = "s.owner = ?"
        params: list[object] = [owner]
        if project:
            where += " AND s.project = ?"
            params.append(project)

        total = db.execute(f"SELECT COUNT(*) FROM sessions s WHERE {where}", params).fetchone()[0]
        rows = db.execute(
            f"""
            SELECT
                s.session_code, s.project, s.title, s.step_count,
                s.position_kind, s.position_summary, s.game_version,
                s.created_at, s.last_played_at,
                (s.prev_state_json IS NOT NULL) AS has_previous_autosave,
                (SELECT COUNT(*) FROM checkpoints c WHERE c.session_code = s.session_code) AS checkpoint_count
            FROM sessions s
            WHERE {where}
            ORDER BY s.last_played_at DESC, s.created_at DESC
            LIMIT ? OFFSET ?
            """,
            [*params, limit, offset],
        ).fetchall()
    return {
        "sessions": [
            {
                **dict(r),
                "has_previous_autosave": bool(r["has_previous_autosave"]),
            }
            for r in rows
        ],
        "total": total,
    }


def list_saved_games(owner: str) -> list[dict]:
    """Return one aggregated row per project the owner has saved sessions for."""
    with _connect() as db:
        rows = db.execute(
            """
            SELECT
                s.project,
                COUNT(*) AS session_count,
                MAX(s.last_played_at) AS last_played_at
            FROM sessions s
            WHERE s.owner = ?
            GROUP BY s.project
            ORDER BY last_played_at DESC, s.project ASC
            """,
            (owner,),
        ).fetchall()
        results = []
        for r in rows:
            latest = db.execute(
                """
                SELECT session_code, title, step_count, position_summary, last_played_at
                FROM sessions
                WHERE owner = ? AND project = ?
                ORDER BY last_played_at DESC, created_at DESC
                LIMIT 1
                """,
                (owner, r["project"]),
            ).fetchone()
            results.append(
                {
                    "project": r["project"],
                    "session_count": r["session_count"],
                    "last_played_at": r["last_played_at"],
                    "latest_session_code": latest["session_code"] if latest else None,
                    "latest_title": latest["title"] if latest else "",
                    "latest_step_count": latest["step_count"] if latest else 0,
                    "latest_position_summary": latest["position_summary"] if latest else "",
                }
            )
    return results


def get_game_save_stats(owner: str) -> dict[str, dict]:
    return {row["project"]: row for row in list_saved_games(owner)}


def list_recently_played(owner: str, limit: int = 10) -> list[dict]:
    with _connect() as db:
        rows = db.execute(
            """
            SELECT
                session_code, project, title, step_count,
                position_kind, position_summary, created_at, last_played_at
            FROM sessions
            WHERE owner = ?
            ORDER BY last_played_at DESC, created_at DESC
            LIMIT ?
            """,
            (owner, limit),
        ).fetchall()
    return [dict(r) for r in rows]


def save_checkpoint(owner: str, session_code: str, name: str) -> dict:
    clean_name = name.strip()
    if not clean_name or len(clean_name) > 100:
        raise ValueError("Checkpoint name must be 1–100 non-empty characters")
    session = require_session(owner, session_code)
    now = _now_iso()
    with _connect() as db:
        db.execute(
            """
            INSERT INTO checkpoints (session_code, owner, name, state_json, step_count, position_summary, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(session_code, name) DO UPDATE SET
                state_json = excluded.state_json,
                step_count = excluded.step_count,
                position_summary = excluded.position_summary,
                created_at = excluded.created_at
            """,
            (
                session_code,
                owner,
                clean_name,
                session["state_json"],
                session["step_count"],
                session["position_summary"],
                now,
            ),
        )
    return {
        "session_code": session_code,
        "name": clean_name,
        "step_count": session["step_count"],
        "position_summary": session["position_summary"],
        "created_at": now,
    }


def list_checkpoints(owner: str, session_code: str) -> dict:
    session = require_session(owner, session_code)
    with _connect() as db:
        rows = db.execute(
            """
            SELECT name, step_count, position_summary, created_at
            FROM checkpoints
            WHERE session_code = ? AND owner = ?
            ORDER BY created_at DESC, id DESC
            """,
            (session_code, owner),
        ).fetchall()
    return {
        "session_code": session_code,
        "project": session["project"],
        "has_previous_autosave": session["prev_state_json"] is not None,
        "checkpoints": [dict(r) for r in rows],
    }


def get_checkpoint_state(owner: str, session_code: str, name: str) -> dict:
    require_session(owner, session_code)
    with _connect() as db:
        row = db.execute(
            "SELECT state_json FROM checkpoints WHERE session_code = ? AND owner = ? AND name = ?",
            (session_code, owner, name.strip()),
        ).fetchone()
    if not row:
        raise ValueError(f"Checkpoint '{name}' not found")
    return json.loads(row["state_json"])


def get_previous_autosave_state(owner: str, session_code: str) -> dict:
    session = require_session(owner, session_code)
    if not session["prev_state_json"]:
        raise ValueError("No previous autosave is available for this session")
    return json.loads(session["prev_state_json"])


def delete_checkpoint(owner: str, session_code: str, name: str) -> bool:
    require_session(owner, session_code)
    with _connect() as db:
        cur = db.execute(
            "DELETE FROM checkpoints WHERE session_code = ? AND owner = ? AND name = ?",
            (session_code, owner, name.strip()),
        )
        return cur.rowcount > 0
