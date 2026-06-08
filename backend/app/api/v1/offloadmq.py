"""
OffloadMQ proxy routes for AI image generation (imggen.*).

Reads credentials from backend/.env:
  OFFLOADMQ_URL      — base URL of the OffloadMQ server
  OFFLOADMQ_API_KEY  — client API key

Flow
----
1. POST /imggen/generate            — create output bucket, submit task, return task ref
2. GET  /imggen/status/{project}/.. — poll; on completion download file → save to project → delete bucket
"""

import mimetypes
import os
import time
from pathlib import Path
from typing import Literal

import httpx
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.image_storage import image_dir, safe_path, save_image

load_dotenv(Path(__file__).parent.parent.parent.parent / ".env")

OFFLOADMQ_URL = os.getenv("OFFLOADMQ_URL", "").rstrip("/")
OFFLOADMQ_API_KEY = os.getenv("OFFLOADMQ_API_KEY", "")
# Comma-separated model name suffixes (without "imggen." prefix) that are
# allowed for each workflow.  If empty, all online imggen.* models are returned.
IMGGEN_TXT2IMG_MODELS = os.getenv("IMGGEN_TXT2IMG_MODELS", "")
IMGGEN_IMG2IMG_MODELS = os.getenv("IMGGEN_IMG2IMG_MODELS", "")

router = APIRouter(prefix="/imggen", tags=["imggen"])


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _headers() -> dict:
    return {"X-API-Key": OFFLOADMQ_API_KEY}


def _check_config() -> None:
    if not OFFLOADMQ_URL or not OFFLOADMQ_API_KEY:
        raise HTTPException(status_code=503, detail="OffloadMQ not configured (missing .env)")


# ---------------------------------------------------------------------------
# List available imggen models
# ---------------------------------------------------------------------------

@router.get("/models")
async def list_models(workflow: str | None = None) -> list[str]:
    """Return available imggen.* capabilities from online agents.

    Optional ``workflow`` query param (``txt2img`` or ``img2img``) filters
    results using the IMGGEN_TXT2IMG_MODELS / IMGGEN_IMG2IMG_MODELS env vars
    (comma-separated model suffixes without the ``imggen.`` prefix).
    If the relevant env var is empty all online imggen.* caps are returned.
    """
    _check_config()
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.post(
            f"{OFFLOADMQ_URL}/api/capabilities/online",
            json={"apiKey": OFFLOADMQ_API_KEY},
        )
    if r.status_code != 200:
        raise HTTPException(status_code=r.status_code, detail=r.text)
    caps: list[str] = r.json()
    all_imggen = [c for c in caps if c.startswith("imggen.")]

    if workflow == "txt2img" and IMGGEN_TXT2IMG_MODELS:
        allowed = {m.strip() for m in IMGGEN_TXT2IMG_MODELS.split(",") if m.strip()}
        return [c for c in all_imggen if c.removeprefix("imggen.") in allowed]
    if workflow == "img2img" and IMGGEN_IMG2IMG_MODELS:
        allowed = {m.strip() for m in IMGGEN_IMG2IMG_MODELS.split(",") if m.strip()}
        return [c for c in all_imggen if c.removeprefix("imggen.") in allowed]
    return all_imggen


# ---------------------------------------------------------------------------
# Submit a txt2img task
# ---------------------------------------------------------------------------

class GenerateRequest(BaseModel):
    project_name: str
    model: str          # e.g. "imggen.flux-dev"
    prompt: str
    negative_prompt: str | None = None
    override_negative: bool = False
    workflow: Literal["txt2img", "img2img"] = "txt2img"
    input_image: str | None = None
    data_preparation: dict[str, str] | None = None
    width: int = 1024
    height: int = 1024
    seed: int | None = None
    comfy_params: dict[str, object] | None = None
    # UI snapshot for prompt editing parity with oai; currently unused on backend.
    rescale: dict[str, object] | None = Field(default=None)


class TaskRef(BaseModel):
    cap: str
    id: str
    output_bucket: str


@router.post("/generate")
async def generate(req: GenerateRequest) -> TaskRef:
    """Create required buckets, submit txt2img/img2img task, return task reference."""
    _check_config()
    if not req.model.startswith("imggen."):
        raise HTTPException(status_code=400, detail="Model must start with imggen.")
    if req.workflow == "img2img" and not req.input_image:
        raise HTTPException(status_code=400, detail="img2img requires input_image")

    async with httpx.AsyncClient(timeout=15) as client:
        # Create output bucket
        bucket_r = await client.post(
            f"{OFFLOADMQ_URL}/api/storage/bucket/create",
            headers=_headers(),
            json={},
        )
        if bucket_r.status_code not in (200, 201):
            raise HTTPException(status_code=bucket_r.status_code, detail=bucket_r.text)
        output_bucket = bucket_r.json()["bucket_uid"]

        input_bucket: str | None = None
        input_filename: str | None = None

        if req.workflow == "img2img":
            input_filename = Path(req.input_image).name if req.input_image else None
            if not input_filename:
                raise HTTPException(status_code=400, detail="img2img requires valid input_image")

            input_path = safe_path(image_dir(req.project_name), input_filename)
            if not input_path.exists():
                raise HTTPException(status_code=404, detail=f"Input image not found: {input_filename}")

            input_bucket_r = await client.post(
                f"{OFFLOADMQ_URL}/api/storage/bucket/create?rm_after_task=true",
                headers=_headers(),
                json={},
            )
            if input_bucket_r.status_code not in (200, 201):
                raise HTTPException(status_code=input_bucket_r.status_code, detail=input_bucket_r.text)
            input_bucket = input_bucket_r.json()["bucket_uid"]

            mime = mimetypes.guess_type(input_filename)[0] or "application/octet-stream"
            files = {
                "file": (input_filename, input_path.read_bytes(), mime),
            }
            upload_r = await client.post(
                f"{OFFLOADMQ_URL}/api/storage/bucket/{input_bucket}/upload",
                headers=_headers(),
                files=files,
            )
            if upload_r.status_code not in (200, 201):
                raise HTTPException(status_code=upload_r.status_code, detail=upload_r.text)

        payload: dict = {
            "workflow": req.workflow,
            "prompt": req.prompt,
            "resolution": {"width": req.width, "height": req.height},
        }
        if req.override_negative and (req.negative_prompt or "").strip():
            payload["secondary_prompts"] = {"negative": req.negative_prompt.strip()}
        if req.seed is not None:
            payload["seed"] = req.seed
        if input_filename:
            payload["input_image"] = input_filename
        if req.comfy_params:
            payload.update(req.comfy_params)

        # Submit task — include both legacy and newer field naming variants.
        submit_body: dict = {
            "apiKey": OFFLOADMQ_API_KEY,
            "capability": req.model,
            "urgent": False,
            "outputBucket": output_bucket,
            "output_bucket": output_bucket,
            "payload": payload,
        }
        if input_bucket:
            submit_body["file_bucket"] = [input_bucket]
            submit_body["fileBucket"] = [input_bucket]
        if req.data_preparation:
            submit_body["dataPreparation"] = req.data_preparation

        submit_r = await client.post(
            f"{OFFLOADMQ_URL}/api/task/submit",
            json=submit_body,
        )
    if submit_r.status_code not in (200, 201, 202):
        raise HTTPException(status_code=submit_r.status_code, detail=submit_r.text)

    data = submit_r.json()
    return TaskRef(
        cap=data["id"]["cap"],
        id=data["id"]["id"],
        output_bucket=output_bucket,
    )


# ---------------------------------------------------------------------------
# Poll task status — on completion: save file to project, delete bucket
# ---------------------------------------------------------------------------

@router.get("/status/{project_name}/{cap}/{task_id}/{output_bucket}")
async def poll_status(project_name: str, cap: str, task_id: str, output_bucket: str):
    """
    Poll task status.

    When completed: downloads the first output image from the OffloadMQ bucket,
    saves it (+ thumbnail) into the project's image directory, deletes the bucket,
    and returns {status: 'completed', filename: '<saved name>'}.
    """
    _check_config()

    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.post(
            f"{OFFLOADMQ_URL}/api/task/poll/{cap}/{task_id}",
            json={"apiKey": OFFLOADMQ_API_KEY},
        )

    if r.status_code == 404:
        raise HTTPException(status_code=404, detail="Task not found")
    if r.status_code != 200:
        raise HTTPException(status_code=r.status_code, detail=r.text)

    data = r.json()
    status = data.get("status")

    if status != "completed":
        result: dict = {"status": status, "log": data.get("log")}
        output = data.get("output")
        if output and isinstance(output, dict) and "error" in output:
            result["error"] = output["error"]
        typical = data.get("typicalRuntimeSeconds")
        if isinstance(typical, dict):
            result["avg_time"] = typical.get("secs", 0) + typical.get("nanos", 0) / 1e9
        return result

    # ---- Task completed: download first image, save locally, delete bucket ----
    output = data.get("output") or {}
    images: list[dict] = output.get("images", [])

    if not images:
        return {"status": "failed", "error": "No images in task output"}

    first = images[0]
    file_uid = first.get("file_uid")
    bucket_uid = first.get("bucket_uid", output_bucket)
    original_filename = first.get("filename", "generated.png")

    async with httpx.AsyncClient(timeout=60) as client:
        # Download the generated image
        dl = await client.get(
            f"{OFFLOADMQ_URL}/api/storage/bucket/{bucket_uid}/file/{file_uid}",
            headers=_headers(),
        )
        if dl.status_code != 200:
            return {"status": "failed", "error": f"Failed to download result: {dl.status_code}"}

        contents = dl.content
        ext = Path(original_filename).suffix or ".png"
        saved_filename = f"generated_{int(time.time() * 1000)}{ext}"

        try:
            save_image(contents, saved_filename, project_name)
        except Exception as e:
            return {"status": "failed", "error": f"Failed to save image: {e}"}

        # Delete the OffloadMQ bucket (best-effort)
        await client.delete(
            f"{OFFLOADMQ_URL}/api/storage/bucket/{output_bucket}",
            headers=_headers(),
        )

    return {"status": "completed", "filename": saved_filename}

