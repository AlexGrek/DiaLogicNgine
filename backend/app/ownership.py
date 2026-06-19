"""
Project ownership checks.

Ownership is stored as the ``owner`` field inside each project's ``.metadata``
file (see app.api.v1.projects). This tiny helper lives in its own module so the
image / AI / prompt routers can enforce ownership without importing the projects
router (which would create an import cycle).
"""

import json
from pathlib import Path

from fastapi import HTTPException

STORAGE_ROOT = Path(__file__).parent.parent / "storage"
PROJECTS_DIR = STORAGE_ROOT / "projects"
METADATA_FILENAME = ".metadata"


def get_owner(project_name: str) -> str | None:
    """Return the owner username for a project, or ``None`` if unclaimed/unknown."""
    meta_file = PROJECTS_DIR / project_name / METADATA_FILENAME
    if not meta_file.exists():
        return None
    try:
        return json.loads(meta_file.read_text(encoding="utf-8")).get("owner")
    except Exception:
        return None


def require_owner(project_name: str, user: str) -> None:
    """Allow when the project is unclaimed or owned by ``user``; else 403."""
    owner = get_owner(project_name)
    if owner is not None and owner != user:
        raise HTTPException(status_code=403, detail="Not your project")
