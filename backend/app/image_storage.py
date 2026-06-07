import io
from pathlib import Path

from fastapi import HTTPException
from PIL import Image

STORAGE_ROOT = Path(__file__).parent.parent / "storage"
THUMB_MAX_PX = 256
ALLOWED_MIME_PREFIXES = ("image/",)


def image_dir(project_name: str) -> Path:
    return (STORAGE_ROOT / "projects" / project_name / "images").resolve()


def thumb_dir(project_name: str) -> Path:
    return (STORAGE_ROOT / "projects" / project_name / "image_thumbs").resolve()


def safe_path(base: Path, filename: str) -> Path:
    target = (base / filename).resolve()
    if not target.is_relative_to(base):
        raise HTTPException(status_code=400, detail="Invalid file path")
    return target


def make_thumbnail(contents: bytes, dest: Path) -> None:
    with Image.open(io.BytesIO(contents)) as img:
        img = img.convert("RGBA") if img.mode in ("P", "RGBA") else img.convert("RGB")
        img.thumbnail((THUMB_MAX_PX, THUMB_MAX_PX), Image.LANCZOS)
        fmt = Image.registered_extensions().get(dest.suffix.lower(), "PNG")
        save_fmt = fmt if fmt in ("JPEG", "PNG", "WEBP", "BMP", "GIF", "TIFF") else "PNG"
        if save_fmt == "JPEG" and img.mode == "RGBA":
            img = img.convert("RGB")
        img.save(dest, format=save_fmt)


def ensure_thumbnail(project_name: str, filename: str) -> Path:
    """Return thumbnail path, generating from the main image when missing."""
    thumb_path = safe_path(thumb_dir(project_name), filename)
    if thumb_path.exists():
        return thumb_path

    img_path = safe_path(image_dir(project_name), filename)
    if not img_path.exists():
        raise HTTPException(status_code=404, detail="Image not found")

    thumb_path.parent.mkdir(parents=True, exist_ok=True)
    make_thumbnail(img_path.read_bytes(), thumb_path)
    return thumb_path


def save_image(contents: bytes, filename: str, project_name: str) -> None:
    img_dir = image_dir(project_name)
    thumb_dir_path = thumb_dir(project_name)
    img_dir.mkdir(parents=True, exist_ok=True)
    thumb_dir_path.mkdir(parents=True, exist_ok=True)

    dest = img_dir / filename
    dest.write_bytes(contents)

    thumb_dest = thumb_dir_path / filename
    make_thumbnail(contents, thumb_dest)
