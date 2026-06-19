"""
Prompt history API.

Exposes the host-level prompt store (see app.prompt_history) so the editor UI
can show a "past prompts" popup per project + workflow and let users re-use or
delete previous prompts.

Endpoints (all under /api/v1/prompts):
  GET    /prompts/{project_name}/{workflow}        — list past prompts
  POST   /prompts/{project_name}/{workflow}        — record a prompt
  DELETE /prompts/{project_name}/{workflow}        — clear all prompts
  DELETE /prompts/{project_name}/{workflow}/{ts}   — delete a single prompt
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app import auth, prompt_history
from app.ownership import require_owner

router = APIRouter(prefix="/prompts", tags=["prompts"])


class RecordPromptRequest(BaseModel):
    prompt: str
    meta: dict | None = None


@router.get("/{project_name}")
def list_project_prompts(
    project_name: str,
    user: str = Depends(auth.get_current_user),
) -> dict:
    """Return all prompts for a project, grouped by workflow."""
    require_owner(project_name, user)
    return {
        wf: prompt_history.list_prompts(project_name, wf)
        for wf in prompt_history.list_workflows(project_name)
    }


@router.delete("/{project_name}")
def clear_project_prompts(
    project_name: str,
    user: str = Depends(auth.get_current_user),
) -> dict:
    """Delete every stored prompt (all workflows) for a project."""
    require_owner(project_name, user)
    prompt_history.clear_project(project_name)
    return {"status": "ok"}


@router.get("/{project_name}/{workflow}")
def list_prompts(
    project_name: str,
    workflow: str,
    user: str = Depends(auth.get_current_user),
) -> list[dict]:
    """Return past prompts (most recent first) for project + workflow."""
    require_owner(project_name, user)
    return prompt_history.list_prompts(project_name, workflow)


@router.post("/{project_name}/{workflow}")
def record_prompt(
    project_name: str,
    workflow: str,
    req: RecordPromptRequest,
    user: str = Depends(auth.get_current_user),
) -> dict:
    """Record a prompt into the history for project + workflow."""
    require_owner(project_name, user)
    prompt_history.record_prompt(project_name, workflow, req.prompt, req.meta)
    return {"status": "ok"}


@router.delete("/{project_name}/{workflow}/{ts}")
def delete_prompt(
    project_name: str,
    workflow: str,
    ts: int,
    user: str = Depends(auth.get_current_user),
) -> dict:
    """Delete a single prompt entry by its timestamp."""
    require_owner(project_name, user)
    if not prompt_history.delete_prompt(project_name, workflow, ts):
        raise HTTPException(status_code=404, detail="Prompt not found")
    return {"status": "ok"}


@router.delete("/{project_name}/{workflow}")
def clear_prompts(
    project_name: str,
    workflow: str,
    user: str = Depends(auth.get_current_user),
) -> dict:
    """Clear all prompt history for project + workflow."""
    require_owner(project_name, user)
    prompt_history.clear_prompts(project_name, workflow)
    return {"status": "ok"}
