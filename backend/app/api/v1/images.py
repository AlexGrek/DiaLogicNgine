import mimetypes

from fastapi import APIRouter, HTTPException, UploadFile
from fastapi.responses import FileResponse

from app.image_storage import (
    ALLOWED_MIME_PREFIXES,
    ensure_thumbnail,
    image_dir,
    make_thumbnail,
    safe_path,
    thumb_dir,
)

router = APIRouter(tags=["images"])


@router.put("/projects/{project_name}/images/{filename}")
async def upload_image(project_name: str, filename: str, file: UploadFile):
    mime = file.content_type or mimetypes.guess_type(filename)[0] or ""
    if not any(mime.startswith(p) for p in ALLOWED_MIME_PREFIXES):
        raise HTTPException(status_code=415, detail=f"Unsupported media type: {mime}")

    contents = await file.read()

    dest = safe_path(image_dir(project_name), filename)
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(contents)

    thumb_dest = safe_path(thumb_dir(project_name), filename)
    thumb_dest.parent.mkdir(parents=True, exist_ok=True)
    make_thumbnail(contents, thumb_dest)

    return {"project": project_name, "file": filename, "size": len(contents)}


@router.get("/projects/{project_name}/images")
async def list_images(project_name: str):
    base = image_dir(project_name)
    if not base.exists():
        return {"images": []}
    return {"images": [f.name for f in sorted(base.iterdir()) if f.is_file()]}


@router.get("/projects/{project_name}/images/{filename}")
async def serve_image(project_name: str, filename: str):
    path = safe_path(image_dir(project_name), filename)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(path)


@router.get("/projects/{project_name}/image_thumbs/{filename}")
async def serve_thumbnail(project_name: str, filename: str):
    path = ensure_thumbnail(project_name, filename)
    return FileResponse(path)


@router.delete("/projects/{project_name}/images/{filename}")
async def delete_image(project_name: str, filename: str):
    img_path = safe_path(image_dir(project_name), filename)
    thumb_path = safe_path(thumb_dir(project_name), filename)
    if not img_path.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    img_path.unlink()
    if thumb_path.exists():
        thumb_path.unlink()
    return {"status": "ok"}
