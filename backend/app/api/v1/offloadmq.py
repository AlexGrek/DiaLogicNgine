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

import io
import os
import time
from pathlib import Path

import httpx
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException
from PIL import Image
from pydantic import BaseModel

load_dotenv(Path(__file__).parent.parent.parent.parent / ".env")

OFFLOADMQ_URL = os.getenv("OFFLOADMQ_URL", "").rstrip("/")
OFFLOADMQ_API_KEY = os.getenv("OFFLOADMQ_API_KEY", "")

STORAGE_ROOT = Path(__file__).parent.parent.parent.parent / "storage"
THUMB_MAX_PX = 256

router = APIRouter(prefix="/imggen", tags=["imggen"])


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _headers() -> dict:
    return {"X-API-Key": OFFLOADMQ_API_KEY}


def _check_config() -> None:
    if not OFFLOADMQ_URL or not OFFLOADMQ_API_KEY:
        raise HTTPException(status_code=503, detail="OffloadMQ not configured (missing .env)")


def _image_dir(project_name: str) -> Path:
    return (STORAGE_ROOT / "projects" / project_name / "images").resolve()


def _thumb_dir(project_name: str) -> Path:
    return (STORAGE_ROOT / "projects" / project_name / "image_thumbs").resolve()


def _save_image(contents: bytes, filename: str, project_name: str) -> None:
    img_dir = _image_dir(project_name)
    thumb_dir = _thumb_dir(project_name)
    img_dir.mkdir(parents=True, exist_ok=True)
    thumb_dir.mkdir(parents=True, exist_ok=True)

    dest = img_dir / filename
    dest.write_bytes(contents)

    thumb_dest = thumb_dir / filename
    with Image.open(io.BytesIO(contents)) as img:
        img = img.convert("RGBA") if img.mode in ("P", "RGBA") else img.convert("RGB")
        img.thumbnail((THUMB_MAX_PX, THUMB_MAX_PX), Image.LANCZOS)
        fmt = Image.registered_extensions().get(thumb_dest.suffix.lower(), "PNG")
        save_fmt = fmt if fmt in ("JPEG", "PNG", "WEBP", "BMP", "GIF", "TIFF") else "PNG"
        if save_fmt == "JPEG" and img.mode == "RGBA":
            img = img.convert("RGB")
        img.save(thumb_dest, format=save_fmt)


# ---------------------------------------------------------------------------
# List available imggen models
# ---------------------------------------------------------------------------

@router.get("/models")
async def list_models() -> list[str]:
    """Return available imggen.* capabilities from online agents."""
    _check_config()
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.post(
            f"{OFFLOADMQ_URL}/api/capabilities/online",
            json={"apiKey": OFFLOADMQ_API_KEY},
        )
    if r.status_code != 200:
        raise HTTPException(status_code=r.status_code, detail=r.text)
    caps: list[str] = r.json()
    return [c for c in caps if c.startswith("imggen.")]


# ---------------------------------------------------------------------------
# Submit a txt2img task
# ---------------------------------------------------------------------------

class GenerateRequest(BaseModel):
    project_name: str
    model: str          # e.g. "imggen.flux-dev"
    prompt: str
    width: int = 1024
    height: int = 1024


class TaskRef(BaseModel):
    cap: str
    id: str
    output_bucket: str


@router.post("/generate")
async def generate(req: GenerateRequest) -> TaskRef:
    """Create an output bucket, submit a txt2img task, return task reference."""
    _check_config()

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

        # Submit task — outputBucket is camelCase per the tasks API
        submit_r = await client.post(
            f"{OFFLOADMQ_URL}/api/task/submit",
            json={
                "apiKey": OFFLOADMQ_API_KEY,
                "capability": req.model,
                "urgent": False,
                "outputBucket": output_bucket,
                "payload": {
                    "workflow": "txt2img",
                    "prompt": req.prompt,
                    "resolution": {"width": req.width, "height": req.height},
                },
            },
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
            _save_image(contents, saved_filename, project_name)
        except Exception as e:
            return {"status": "failed", "error": f"Failed to save image: {e}"}

        # Delete the OffloadMQ bucket (best-effort)
        await client.delete(
            f"{OFFLOADMQ_URL}/api/storage/bucket/{output_bucket}",
            headers=_headers(),
        )

    return {"status": "completed", "filename": saved_filename}
