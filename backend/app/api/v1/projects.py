"""Projects API: list projects, save/load game JSON per project."""
import json
from pathlib import Path

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse

STORAGE_ROOT = Path(__file__).parent.parent.parent.parent / "storage"

router = APIRouter(tags=["projects"])


def _projects_base() -> Path:
    return (STORAGE_ROOT / "projects").resolve()


def _safe_project_dir(project_name: str) -> Path:
    base = _projects_base()
    target = (base / project_name).resolve()
    if not target.is_relative_to(base):
        raise HTTPException(status_code=400, detail="Invalid project name")
    return target


@router.get("/projects")
async def list_projects():
    base = _projects_base()
    if not base.exists():
        return {"projects": []}
    return {"projects": [d.name for d in sorted(base.iterdir()) if d.is_dir()]}


@router.put("/projects/{project_name}/game")
async def save_game(project_name: str, request: Request):
    body = await request.body()
    try:
        json.loads(body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Body must be valid JSON")
    project_dir = _safe_project_dir(project_name)
    project_dir.mkdir(parents=True, exist_ok=True)
    (project_dir / "game.json").write_bytes(body)
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
    import shutil
    project_dir = _safe_project_dir(project_name)
    if not project_dir.exists():
        raise HTTPException(status_code=404, detail="Project not found")
    shutil.rmtree(project_dir)
    return {"status": "ok"}
