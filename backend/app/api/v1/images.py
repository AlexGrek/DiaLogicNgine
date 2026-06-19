import mimetypes
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel

from app import auth
from app.ownership import require_owner
from app.image_storage import (
    ALLOWED_MIME_PREFIXES,
    THUMB_MAX_PX,
    ensure_thumbnail,
    image_dir,
    make_thumbnail,
    safe_path,
    thumb_dir,
)

router = APIRouter(tags=["images"])


@router.put("/projects/{project_name}/images/{filename}")
async def upload_image(
    project_name: str,
    filename: str,
    file: UploadFile,
    user: str = Depends(auth.get_current_user),
):
    require_owner(project_name, user)
    mime = file.content_type or mimetypes.guess_type(filename)[0] or ""
    if not any(mime.startswith(p) for p in ALLOWED_MIME_PREFIXES):
        raise HTTPException(status_code=415, detail=f"Unsupported media type: {mime}")

    contents = await file.read()

    dest = safe_path(image_dir(project_name), filename)
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(contents)

    thumb_dest = safe_path(thumb_dir(project_name), filename)
    thumb_dest.parent.mkdir(parents=True, exist_ok=True)
    try:
        make_thumbnail(contents, thumb_dest)
    except Exception:
        # Image saved; thumbnail is optional (backfilled on first GET).
        if thumb_dest.exists():
            thumb_dest.unlink(missing_ok=True)

    return {"project": project_name, "file": filename, "size": len(contents)}


@router.get("/projects/{project_name}/images")
async def list_images(
    project_name: str,
    user: str = Depends(auth.get_current_user),
):
    # Editor-only: listing a project's uploads is owner-scoped.
    require_owner(project_name, user)
    base = image_dir(project_name)
    if not base.exists():
        return {"images": []}
    return {"images": [f.name for f in sorted(base.iterdir()) if f.is_file()]}


@router.get("/projects/{project_name}/images/{filename}")
async def serve_image(project_name: str, filename: str):
    # Public: serving an image by name keeps published games playable.
    path = safe_path(image_dir(project_name), filename)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(path)


@router.get("/projects/{project_name}/image_thumbs/{filename}")
async def serve_thumbnail(project_name: str, filename: str):
    path = ensure_thumbnail(project_name, filename)
    return FileResponse(path)


class ResizeImageRequest(BaseModel):
    source_image: str
    width: int = THUMB_MAX_PX
    height: int = THUMB_MAX_PX
    mode: Literal["preserve", "crop", "shrink"] = "crop"


@router.post("/projects/{project_name}/images/resize")
async def resize_image(
    project_name: str,
    req: ResizeImageRequest,
    user: str = Depends(auth.get_current_user),
):
    """Resize/crop an existing project image and save the result as a new image (no AI)."""
    require_owner(project_name, user)
    from pathlib import Path
    source_filename = Path(req.source_image).name
    src_path = safe_path(image_dir(project_name), source_filename)
    if not src_path.exists():
        raise HTTPException(status_code=404, detail=f"Source image not found: {source_filename}")

    stem = Path(source_filename).stem
    suffix = Path(source_filename).suffix or ".png"
    out_filename = f"resized_{req.width}x{req.height}_{stem}{suffix}"

    contents = src_path.read_bytes()
    img_dest = safe_path(image_dir(project_name), out_filename)
    img_dest.parent.mkdir(parents=True, exist_ok=True)
    make_thumbnail(contents, img_dest, req.width, req.height, req.mode)

    saved = img_dest.read_bytes()
    thumb_dest = safe_path(thumb_dir(project_name), out_filename)
    thumb_dest.parent.mkdir(parents=True, exist_ok=True)
    make_thumbnail(saved, thumb_dest, THUMB_MAX_PX, THUMB_MAX_PX, "preserve")

    return {"project": project_name, "filename": out_filename, "width": req.width, "height": req.height, "mode": req.mode}


@router.delete("/projects/{project_name}/images/{filename}")
async def delete_image(
    project_name: str,
    filename: str,
    user: str = Depends(auth.get_current_user),
):
    require_owner(project_name, user)
    img_path = safe_path(image_dir(project_name), filename)
    thumb_path = safe_path(thumb_dir(project_name), filename)
    if not img_path.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    img_path.unlink()
    if thumb_path.exists():
        thumb_path.unlink()
    return {"status": "ok"}
