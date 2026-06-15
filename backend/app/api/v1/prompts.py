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

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app import prompt_history

router = APIRouter(prefix="/prompts", tags=["prompts"])


class RecordPromptRequest(BaseModel):
    prompt: str
    meta: dict | None = None


@router.get("/{project_name}")
def list_project_prompts(project_name: str) -> dict:
    """Return all prompts for a project, grouped by workflow."""
    return {
        wf: prompt_history.list_prompts(project_name, wf)
        for wf in prompt_history.list_workflows(project_name)
    }


@router.delete("/{project_name}")
def clear_project_prompts(project_name: str) -> dict:
    """Delete every stored prompt (all workflows) for a project."""
    prompt_history.clear_project(project_name)
    return {"status": "ok"}


@router.get("/{project_name}/{workflow}")
def list_prompts(project_name: str, workflow: str) -> list[dict]:
    """Return past prompts (most recent first) for project + workflow."""
    return prompt_history.list_prompts(project_name, workflow)


@router.post("/{project_name}/{workflow}")
def record_prompt(project_name: str, workflow: str, req: RecordPromptRequest) -> dict:
    """Record a prompt into the history for project + workflow."""
    prompt_history.record_prompt(project_name, workflow, req.prompt, req.meta)
    return {"status": "ok"}


@router.delete("/{project_name}/{workflow}/{ts}")
def delete_prompt(project_name: str, workflow: str, ts: int) -> dict:
    """Delete a single prompt entry by its timestamp."""
    if not prompt_history.delete_prompt(project_name, workflow, ts):
        raise HTTPException(status_code=404, detail="Prompt not found")
    return {"status": "ok"}


@router.delete("/{project_name}/{workflow}")
def clear_prompts(project_name: str, workflow: str) -> dict:
    """Clear all prompt history for project + workflow."""
    prompt_history.clear_prompts(project_name, workflow)
    return {"status": "ok"}
