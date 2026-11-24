"""
OffloadMQ background removal (onnx.bgremove.*) for character "looks".

Flow
----
1. POST /imggen/bgremove        — upload a project image to an input bucket, submit the task
2. GET  /imggen/status/{...}    — the shared imggen poll route (offloadmq.py) downloads the
                                  transparent result into the project and deletes the bucket

`remove_background_and_wait` runs the whole flow in-process for the editor MCP.
"""

import asyncio
import mimetypes
from pathlib import Path

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app import auth
from app.api.v1 import offloadmq
from app.api.v1.offloadmq import TaskRef, _check_config, _headers
from app.image_storage import image_dir, safe_path
from app.ownership import require_owner

router = APIRouter(prefix="/imggen/bgremove", tags=["imggen"])

CAPABILITY_PREFIX = "onnx.bgremove."
DEFAULT_MODEL = "onnx.bgremove.birefnet-general"


class BgRemoveRequest(BaseModel):
    project_name: str
    image: str
    model: str = DEFAULT_MODEL
    format: str = Field(default="webp", pattern="^(webp|png)$")
    crop: bool = True
    padding: int = Field(default=16, ge=0, le=512)


async def _online_models() -> list[str]:
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.post(
            f"{offloadmq.OFFLOADMQ_URL}/api/capabilities/online",
            json={"apiKey": offloadmq.OFFLOADMQ_API_KEY},
        )
    if r.status_code != 200:
        raise HTTPException(status_code=r.status_code, detail=r.text)
    return sorted(c for c in r.json() if c.startswith(CAPABILITY_PREFIX))


@router.get("/models")
async def list_models(user: str = Depends(auth.get_current_user)) -> list[str]:
    """Online onnx.bgremove.* capabilities (birefnet-general is the recommended default)."""
    _check_config()
    return await _online_models()


async def submit_bgremove(req: BgRemoveRequest, user: str) -> TaskRef:
    _check_config()
    require_owner(req.project_name, user)
    if not req.model.startswith(CAPABILITY_PREFIX):
        raise HTTPException(status_code=400, detail=f"Model must start with {CAPABILITY_PREFIX}")
    filename = Path(req.image).name
    if not filename or filename != req.image:
        raise HTTPException(status_code=400, detail="image must be a bare project image filename")
    source = safe_path(image_dir(req.project_name), filename)
    if not source.is_file():
        raise HTTPException(status_code=404, detail=f"Image not found: {filename}")

    async with httpx.AsyncClient(timeout=30) as client:
        buckets = []
        for query in ("?rm_after_task=true", ""):
            r = await client.post(
                f"{offloadmq.OFFLOADMQ_URL}/api/storage/bucket/create{query}", headers=_headers(), json={}
            )
            if r.status_code not in (200, 201):
                raise HTTPException(status_code=r.status_code, detail=r.text)
            buckets.append(r.json()["bucket_uid"])
        input_bucket, output_bucket = buckets

        mime = mimetypes.guess_type(filename)[0] or "application/octet-stream"
        up = await client.post(
            f"{offloadmq.OFFLOADMQ_URL}/api/storage/bucket/{input_bucket}/upload",
            headers=_headers(),
            files={"file": (filename, source.read_bytes(), mime)},
        )
        if up.status_code not in (200, 201):
            raise HTTPException(status_code=up.status_code, detail=up.text)

        submit = await client.post(
            f"{offloadmq.OFFLOADMQ_URL}/api/task/submit",
            json={
                "apiKey": offloadmq.OFFLOADMQ_API_KEY,
                "capability": req.model,
                "urgent": False,
                "file_bucket": [input_bucket],
                "output_bucket": output_bucket,
                "payload": {
                    "input_image": filename,
                    "format": req.format,
                    "background": "transparent",
                    "crop": req.crop,
                    "padding": req.padding,
                },
            },
        )
    if submit.status_code not in (200, 201, 202):
        raise HTTPException(status_code=submit.status_code, detail=submit.text)
    data = submit.json()
    return TaskRef(cap=data["id"]["cap"], id=data["id"]["id"], output_bucket=output_bucket)


@router.post("")
async def remove_background(req: BgRemoveRequest, user: str = Depends(auth.get_current_user)) -> TaskRef:
    """Submit a background-removal task; poll it with GET /imggen/status/{project}/{cap}/{id}/{bucket}."""
    return await submit_bgremove(req, user)


async def remove_background_and_wait(req: BgRemoveRequest, user: str, timeout_s: float = 240) -> dict:
    """Submit, poll until done, and return {status, filename} (the new transparent image)."""
    task = await submit_bgremove(req, user)
    loop = asyncio.get_running_loop()
    deadline = loop.time() + timeout_s
    while loop.time() < deadline:
        await asyncio.sleep(3)
        status = await offloadmq.poll_status(req.project_name, task.cap, task.id, task.output_bucket, user)
        if status.get("status") == "completed":
            return status
        if status.get("status") in ("failed", "canceled"):
            raise ValueError(status.get("error") or "Background removal failed")
    raise ValueError(f"Timed out after {int(timeout_s)} s; task {task.cap}/{task.id} may still finish")
