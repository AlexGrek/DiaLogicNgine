"""
LLM dialog generation via OffloadMQ.

Reads credentials from backend/.env:
  OFFLOADMQ_URL      — base URL of the OffloadMQ server
  OFFLOADMQ_API_KEY  — client API key

Endpoints
---------
GET  /llm/models               — list available llm.* capabilities from online agents
POST /llm/generate-dialog      — submit urgent LLM task, return parsed dialog window stubs
"""

import json
import os
import re
from pathlib import Path

import httpx
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app import auth, prompt_history
from app.ownership import require_owner

load_dotenv(Path(__file__).parent.parent.parent.parent / ".env")

OFFLOADMQ_URL = os.getenv("OFFLOADMQ_URL", "").rstrip("/")
OFFLOADMQ_API_KEY = os.getenv("OFFLOADMQ_API_KEY", "")

router = APIRouter(prefix="/llm", tags=["llm"])

SYSTEM_PROMPT = """\
You are a JSON generator for a visual novel game engine.
Given a scene description, output dialog windows for that scene.

Return ONLY a valid JSON array — no markdown, no code fences, no explanation.

Each element in the array:
{
  "uid": "unique_js_identifier",
  "text": "What the character says",
  "links": [
    {"text": "Player choice label", "direction": "target_uid"}
  ]
}

Rules:
- uid must be a valid JS identifier: letters, digits, underscore only — no spaces, no hyphens
- links array may be empty to end the conversation branch
- every direction in links must reference a uid that exists in the same array
- generate 3–8 windows appropriate for the scene
- make dialogue feel natural and varied in voice\
"""


def _check_config() -> None:
    if not OFFLOADMQ_URL or not OFFLOADMQ_API_KEY:
        raise HTTPException(status_code=503, detail="OffloadMQ not configured (missing .env)")


def _extract_json_array(text: str) -> list:
    """Extract a JSON array from LLM output, stripping markdown fences if present."""
    text = re.sub(r"```(?:json)?\s*", "", text).strip()
    start = text.find("[")
    end = text.rfind("]")
    if start == -1 or end == -1:
        raise ValueError("No JSON array found in LLM response")
    return json.loads(text[start : end + 1])


# ---------------------------------------------------------------------------
# List available LLM models
# ---------------------------------------------------------------------------

@router.get("/models")
async def list_models(user: str = Depends(auth.get_current_user)) -> list[str]:
    """Return available llm.* capabilities from online agents."""
    _check_config()
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.post(
            f"{OFFLOADMQ_URL}/api/capabilities/online",
            json={"apiKey": OFFLOADMQ_API_KEY},
        )
    if r.status_code != 200:
        raise HTTPException(status_code=r.status_code, detail=r.text)
    caps: list[str] = r.json()
    return [c for c in caps if c.startswith("llm.")]


# ---------------------------------------------------------------------------
# Generate dialog windows from a text prompt
# ---------------------------------------------------------------------------

class GenerateDialogRequest(BaseModel):
    capability: str  # e.g. "llm.dolphin-mistral"
    prompt: str
    project_name: str | None = None  # when set, prompt is saved to host history


@router.post("/generate-dialog")
async def generate_dialog(
    req: GenerateDialogRequest,
    user: str = Depends(auth.get_current_user),
) -> list[dict]:
    """Submit an urgent LLM task and return parsed dialog window stubs."""
    _check_config()
    if req.project_name:
        require_owner(req.project_name, user)

    model = req.capability.removeprefix("llm.")
    payload = {
        "model": model,
        "stream": False,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": req.prompt},
        ],
    }

    async with httpx.AsyncClient(timeout=120) as client:
        r = await client.post(
            f"{OFFLOADMQ_URL}/api/task/submit_blocking",
            json={
                "capability": req.capability,
                "urgent": True,
                "restartable": False,
                "payload": payload,
                "apiKey": OFFLOADMQ_API_KEY,
            },
        )

    if r.status_code != 200:
        raise HTTPException(status_code=r.status_code, detail=r.text)

    data = r.json()
    result = data.get("result") or data.get("output") or {}
    message = result.get("message", {})
    content = message.get("content", "")

    if not content:
        raise HTTPException(status_code=502, detail="LLM returned empty response")

    try:
        windows = _extract_json_array(content)
    except (ValueError, json.JSONDecodeError) as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Could not parse LLM response as JSON: {exc}",
        )

    prompt_history.record_prompt(
        req.project_name, "dialog", req.prompt, {"capability": req.capability}
    )
    return windows


# ---------------------------------------------------------------------------
# Generate free-form text from a prompt
# ---------------------------------------------------------------------------

_DEFAULT_TEXT_SYSTEM_PROMPT = """\
You are a creative writing assistant for a visual novel game.
Write text based on the user's description.
Be concise and evocative. Return only the text with no preamble or explanation.\
"""


class GenerateTextRequest(BaseModel):
    capability: str
    prompt: str
    system_prompt: str = ""
    project_name: str | None = None  # when set, prompt is saved to host history


@router.post("/generate-text")
async def generate_text(
    req: GenerateTextRequest,
    user: str = Depends(auth.get_current_user),
) -> dict:
    """Submit an urgent LLM task and return generated free-form text."""
    _check_config()
    if req.project_name:
        require_owner(req.project_name, user)

    model = req.capability.removeprefix("llm.")
    system_content = req.system_prompt.strip() or _DEFAULT_TEXT_SYSTEM_PROMPT
    payload = {
        "model": model,
        "stream": False,
        "messages": [
            {"role": "system", "content": system_content},
            {"role": "user", "content": req.prompt},
        ],
    }

    async with httpx.AsyncClient(timeout=120) as client:
        r = await client.post(
            f"{OFFLOADMQ_URL}/api/task/submit_blocking",
            json={
                "capability": req.capability,
                "urgent": True,
                "restartable": False,
                "payload": payload,
                "apiKey": OFFLOADMQ_API_KEY,
            },
        )

    if r.status_code != 200:
        raise HTTPException(status_code=r.status_code, detail=r.text)

    data = r.json()
    result = data.get("result") or data.get("output") or {}
    message = result.get("message", {})
    content = message.get("content", "")

    if not content:
        raise HTTPException(status_code=502, detail="LLM returned empty response")

    prompt_history.record_prompt(
        req.project_name, "text", req.prompt, {"capability": req.capability}
    )
    return {"text": content.strip()}
