import io
import mimetypes
from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile
from fastapi.responses import FileResponse
from PIL import Image

STORAGE_ROOT = Path(__file__).parent.parent.parent.parent / "storage"
ALLOWED_MIME_PREFIXES = ("image/",)
THUMB_MAX_PX = 256

router = APIRouter(tags=["images"])


def _image_dir(project_name: str) -> Path:
    return (STORAGE_ROOT / "projects" / project_name / "images").resolve()


def _thumb_dir(project_name: str) -> Path:
    return (STORAGE_ROOT / "projects" / project_name / "image_thumbs").resolve()


def _safe_path(base: Path, filename: str) -> Path:
    target = (base / filename).resolve()
    if not target.is_relative_to(base):
        raise HTTPException(status_code=400, detail="Invalid file path")
    return target


def _make_thumbnail(contents: bytes, dest: Path) -> None:
    with Image.open(io.BytesIO(contents)) as img:
        img = img.convert("RGBA") if img.mode in ("P", "RGBA") else img.convert("RGB")
        img.thumbnail((THUMB_MAX_PX, THUMB_MAX_PX), Image.LANCZOS)
        # Save as same format; fall back to PNG for formats PIL can't write back
        fmt = Image.registered_extensions().get(dest.suffix.lower(), "PNG")
        save_fmt = fmt if fmt in ("JPEG", "PNG", "WEBP", "BMP", "GIF", "TIFF") else "PNG"
        if save_fmt == "JPEG" and img.mode == "RGBA":
            img = img.convert("RGB")
        img.save(dest, format=save_fmt)


@router.put("/projects/{project_name}/images/{filename}")
async def upload_image(project_name: str, filename: str, file: UploadFile):
    mime = file.content_type or mimetypes.guess_type(filename)[0] or ""
    if not any(mime.startswith(p) for p in ALLOWED_MIME_PREFIXES):
        raise HTTPException(status_code=415, detail=f"Unsupported media type: {mime}")

    contents = await file.read()

    dest = _safe_path(_image_dir(project_name), filename)
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(contents)

    thumb_dest = _safe_path(_thumb_dir(project_name), filename)
    thumb_dest.parent.mkdir(parents=True, exist_ok=True)
    _make_thumbnail(contents, thumb_dest)

    return {"project": project_name, "file": filename, "size": len(contents)}


@router.get("/projects/{project_name}/images")
async def list_images(project_name: str):
    base = _image_dir(project_name)
    if not base.exists():
        return {"images": []}
    return {"images": [f.name for f in sorted(base.iterdir()) if f.is_file()]}


@router.get("/projects/{project_name}/images/{filename}")
async def serve_image(project_name: str, filename: str):
    path = _safe_path(_image_dir(project_name), filename)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(path)


@router.get("/projects/{project_name}/image_thumbs/{filename}")
async def serve_thumbnail(project_name: str, filename: str):
    path = _safe_path(_thumb_dir(project_name), filename)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Thumbnail not found")
    return FileResponse(path)
