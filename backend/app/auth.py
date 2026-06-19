"""
Authentication: user store, password hashing, signed-token cookies, and the
one-time migration that creates the ``root`` user and stamps ownership onto
pre-existing projects.

Design notes
------------
- Users live in a JSON file (``storage/auth/users.json``) guarded by a
  process-wide lock, mirroring ``app.prompt_history``.
- Passwords are hashed with PBKDF2-HMAC-SHA256 (stdlib only).
- Sessions are *stateless*: the cookie carries an HMAC-signed token so it
  survives server reloads (dev runs with ``reload=True``). The signing secret is
  generated once and persisted to ``storage/auth/secret``.
- Cookie auth (rather than a Bearer header) is required because images load via
  ``<img src>`` / CSS ``url(...)`` — the browser only attaches credentials to
  those automatically as cookies.
"""

import base64
import hashlib
import hmac
import json
import secrets
import threading
import time
from pathlib import Path

from fastapi import HTTPException, Request

STORAGE_ROOT = Path(__file__).parent.parent / "storage"
AUTH_DIR = STORAGE_ROOT / "auth"
USERS_FILE = AUTH_DIR / "users.json"
SECRET_FILE = AUTH_DIR / "secret"
PROJECTS_DIR = STORAGE_ROOT / "projects"
METADATA_FILENAME = ".metadata"

COOKIE_NAME = "dln_session"
TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60  # 30 days
PBKDF2_ITERATIONS = 200_000

ROOT_USERNAME = "root"
ROOT_PASSWORD = "000000"

# Serialises read-modify-write cycles on the users file.
_lock = threading.Lock()


# ---------------------------------------------------------------------------
# Username validation
# ---------------------------------------------------------------------------

def validate_username(username: str) -> str:
    """Normalise + validate a username. Raises HTTPException(400) on bad input."""
    username = (username or "").strip().lower()
    if not (3 <= len(username) <= 32):
        raise HTTPException(status_code=400, detail="Username must be 3-32 characters")
    if not all(c.isalnum() or c in "_-" for c in username):
        raise HTTPException(
            status_code=400,
            detail="Username may contain only letters, digits, '_' and '-'",
        )
    return username


# ---------------------------------------------------------------------------
# Password hashing
# ---------------------------------------------------------------------------

def _hash_password(password: str, salt: str) -> str:
    dk = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), bytes.fromhex(salt), PBKDF2_ITERATIONS
    )
    return dk.hex()


def _verify_password(password: str, salt: str, expected_hash: str) -> bool:
    return hmac.compare_digest(_hash_password(password, salt), expected_hash)


# ---------------------------------------------------------------------------
# User store (JSON file)
# ---------------------------------------------------------------------------

def _read_users() -> dict:
    if not USERS_FILE.exists():
        return {}
    try:
        return json.loads(USERS_FILE.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _write_users(users: dict) -> None:
    AUTH_DIR.mkdir(parents=True, exist_ok=True)
    USERS_FILE.write_text(
        json.dumps(users, ensure_ascii=False, indent=2), encoding="utf-8"
    )


def user_exists(username: str) -> bool:
    with _lock:
        return username in _read_users()


def create_user(username: str, password: str) -> None:
    """Create a user. Raises HTTPException(409) if it already exists."""
    if not password:
        raise HTTPException(status_code=400, detail="Password must not be empty")
    with _lock:
        users = _read_users()
        if username in users:
            raise HTTPException(status_code=409, detail="Username already taken")
        salt = secrets.token_hex(16)
        users[username] = {
            "pw_salt": salt,
            "pw_hash": _hash_password(password, salt),
            "created": int(time.time() * 1000),
        }
        _write_users(users)


def authenticate(username: str, password: str) -> bool:
    with _lock:
        rec = _read_users().get(username)
    if not rec:
        return False
    return _verify_password(password, rec.get("pw_salt", ""), rec.get("pw_hash", ""))


def change_password(username: str, old_password: str, new_password: str) -> None:
    """Verify the current password and set a new one. Raises HTTPException on error."""
    if not new_password:
        raise HTTPException(status_code=400, detail="New password must not be empty")
    with _lock:
        users = _read_users()
        rec = users.get(username)
        if not rec or not _verify_password(
            old_password, rec.get("pw_salt", ""), rec.get("pw_hash", "")
        ):
            raise HTTPException(status_code=401, detail="Current password is incorrect")
        salt = secrets.token_hex(16)
        rec["pw_salt"] = salt
        rec["pw_hash"] = _hash_password(new_password, salt)
        users[username] = rec
        _write_users(users)


# ---------------------------------------------------------------------------
# Signing secret + stateless tokens
# ---------------------------------------------------------------------------

def _get_secret() -> bytes:
    if SECRET_FILE.exists():
        return SECRET_FILE.read_text(encoding="utf-8").strip().encode("utf-8")
    AUTH_DIR.mkdir(parents=True, exist_ok=True)
    secret = secrets.token_hex(32)
    SECRET_FILE.write_text(secret, encoding="utf-8")
    return secret.encode("utf-8")


def _b64e(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64d(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


def make_token(username: str) -> str:
    payload = {"u": username, "exp": int(time.time()) + TOKEN_TTL_SECONDS}
    body = _b64e(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    sig = hmac.new(_get_secret(), body.encode("ascii"), hashlib.sha256).digest()
    return f"{body}.{_b64e(sig)}"


def verify_token(token: str) -> str | None:
    """Return the username for a valid, unexpired token, else ``None``."""
    if not token or "." not in token:
        return None
    body, _, sig = token.partition(".")
    expected = hmac.new(_get_secret(), body.encode("ascii"), hashlib.sha256).digest()
    try:
        if not hmac.compare_digest(_b64d(sig), expected):
            return None
        payload = json.loads(_b64d(body))
    except Exception:
        return None
    if payload.get("exp", 0) < int(time.time()):
        return None
    return payload.get("u")


# ---------------------------------------------------------------------------
# FastAPI dependencies
# ---------------------------------------------------------------------------

def get_optional_user(request: Request) -> str | None:
    return verify_token(request.cookies.get(COOKIE_NAME, ""))


def get_current_user(request: Request) -> str:
    username = get_optional_user(request)
    if not username:
        raise HTTPException(status_code=401, detail="Authentication required")
    return username


# ---------------------------------------------------------------------------
# Startup migration: create root + stamp ownership onto existing projects
# ---------------------------------------------------------------------------

def ensure_root_and_migrate() -> None:
    """Idempotent: create the root user and assign all unowned projects to it."""
    with _lock:
        users = _read_users()
        if ROOT_USERNAME not in users:
            salt = secrets.token_hex(16)
            users[ROOT_USERNAME] = {
                "pw_salt": salt,
                "pw_hash": _hash_password(ROOT_PASSWORD, salt),
                "created": int(time.time() * 1000),
            }
            _write_users(users)

    if not PROJECTS_DIR.exists():
        return
    for project_dir in PROJECTS_DIR.iterdir():
        if not project_dir.is_dir():
            continue
        meta_file = project_dir / METADATA_FILENAME
        meta: dict = {}
        if meta_file.exists():
            try:
                meta = json.loads(meta_file.read_text(encoding="utf-8"))
            except Exception:
                meta = {}
        if meta.get("owner"):
            continue
        meta["owner"] = ROOT_USERNAME
        meta_file.write_text(
            json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8"
        )
