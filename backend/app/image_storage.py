import io
from pathlib import Path
from typing import Literal

from fastapi import HTTPException
from PIL import Image

STORAGE_ROOT = Path(__file__).parent.parent / "storage"
THUMB_MAX_PX = 256
ALLOWED_MIME_PREFIXES = ("image/",)

ThumbMode = Literal["preserve", "crop", "shrink"]


def image_dir(project_name: str) -> Path:
    return (STORAGE_ROOT / "projects" / project_name / "images").resolve()


def thumb_dir(project_name: str) -> Path:
    return (STORAGE_ROOT / "projects" / project_name / "image_thumbs").resolve()


def safe_path(base: Path, filename: str) -> Path:
    target = (base / filename).resolve()
    if not target.is_relative_to(base):
        raise HTTPException(status_code=400, detail="Invalid file path")
    return target


def _resize_image(img: Image.Image, width: int, height: int, mode: ThumbMode) -> Image.Image:
    src_w, src_h = img.size

    if mode == "preserve":
        # Fit within box, keep aspect ratio, never upscale.
        scale = min(width / src_w, height / src_h, 1.0)
        new_w = max(1, int(src_w * scale))
        new_h = max(1, int(src_h * scale))
        return img.resize((new_w, new_h), Image.LANCZOS)

    if mode == "shrink":
        # Like preserve but produces exactly (width, height) by fitting and padding with transparency.
        scale = min(width / src_w, height / src_h, 1.0)
        fit_w = max(1, int(src_w * scale))
        fit_h = max(1, int(src_h * scale))
        resized = img.resize((fit_w, fit_h), Image.LANCZOS)
        canvas = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        offset = ((width - fit_w) // 2, (height - fit_h) // 2)
        canvas.paste(resized, offset)
        return canvas

    # mode == "crop": scale so the image fills the box, then center-crop.
    scale = max(width / src_w, height / src_h)
    fit_w = max(1, int(src_w * scale))
    fit_h = max(1, int(src_h * scale))
    resized = img.resize((fit_w, fit_h), Image.LANCZOS)
    left = (fit_w - width) // 2
    top = (fit_h - height) // 2
    return resized.crop((left, top, left + width, top + height))


def make_thumbnail(
    contents: bytes,
    dest: Path,
    width: int = THUMB_MAX_PX,
    height: int = THUMB_MAX_PX,
    mode: ThumbMode = "preserve",
) -> None:
    with Image.open(io.BytesIO(contents)) as img:
        img = img.convert("RGBA") if img.mode in ("P", "RGBA", "LA") else img.convert("RGB")
        result = _resize_image(img, width, height, mode)
        fmt = Image.registered_extensions().get(dest.suffix.lower(), "PNG")
        save_fmt = fmt if fmt in ("JPEG", "PNG", "WEBP", "BMP", "GIF", "TIFF") else "PNG"
        if save_fmt == "JPEG" and result.mode == "RGBA":
            result = result.convert("RGB")
        result.save(dest, format=save_fmt)


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
