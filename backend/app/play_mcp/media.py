"""Image loading, vision-friendly resizing, and Point-and-Click zone annotation."""

import os
from io import BytesIO
from pathlib import Path
from urllib.parse import unquote

from mcp.server.fastmcp import Image as McpImage
from PIL import Image, ImageDraw

from app import image_storage

MAX_VISION_PX = int(os.getenv("PLAY_MCP_IMAGE_MAX_PX", "1024"))
PAC_WIDTH = 960
PAC_HEIGHT = 540

ZONE_COLORS = [
    (255, 214, 10, 255),
    (56, 189, 248, 255),
    (74, 222, 128, 255),
    (251, 146, 60, 255),
    (244, 114, 182, 255),
    (167, 139, 250, 255),
]
DISABLED_COLOR = (160, 160, 170, 255)


def _static_roots() -> list[Path]:
    roots: list[Path] = []
    static_dir = os.getenv("STATIC_DIR", "").strip()
    if static_dir:
        p = Path(static_dir).resolve()
        if p.is_dir():
            roots.append(p)
    repo_public = (Path(__file__).resolve().parents[3] / "dialogic" / "public").resolve()
    if repo_public.is_dir():
        roots.append(repo_public)
    return roots


def _normalize_ref(project: str, image_ref: str) -> tuple[str, str] | None:
    """Classify an image reference as ('asset', rel_path) or ('project', filename)."""
    ref = (image_ref or "").strip()
    if not ref:
        return None
    if ref.startswith(("http://", "https://", "data:", "file:")):
        return None

    # Accept project-scoped API URLs if a game stored the full relative API path.
    api_prefix = "/api/v1/projects/"
    if ref.startswith(api_prefix):
        rest = ref[len(api_prefix) :]
        parts = rest.split("/", 2)
        if len(parts) == 3 and parts[1] in {"images", "image_thumbs"}:
            url_project = unquote(parts[0])
            filename = unquote(parts[2])
            if url_project == project and filename:
                return ("project", filename)
        return None

    clean = ref.lstrip("/")
    if clean.startswith("game_assets/"):
        return ("asset", clean)

    if "/" in ref or "\\" in ref or ref in {".", ".."} or "\x00" in ref:
        return None
    return ("project", ref)


def resolve_image_path(project: str, image_ref: str) -> Path | None:
    """Resolve an image reference to a verified local file path (no symlinks, no traversal)."""
    classified = _normalize_ref(project, image_ref)
    if classified is None:
        return None
    kind, target = classified

    if kind == "project":
        base = image_storage.image_dir(project)
        candidate = base / target
        if candidate.is_symlink():
            return None
        resolved = candidate.resolve()
        if not resolved.is_relative_to(base) or not resolved.is_file():
            return None
        return resolved

    for root in _static_roots():
        candidate = root / target
        if candidate.is_symlink():
            continue
        resolved = candidate.resolve()
        if resolved.is_relative_to(root) and resolved.is_file():
            return resolved
    return None


def _encode_mcp_image(img: Image.Image) -> McpImage:
    out = BytesIO()
    has_alpha = img.mode in ("RGBA", "LA", "PA") or (img.mode == "P" and "transparency" in img.info)
    if has_alpha:
        img.convert("RGBA").save(out, format="PNG", optimize=True)
        return McpImage(data=out.getvalue(), format="png")
    img.convert("RGB").save(out, format="JPEG", quality=88, optimize=True)
    return McpImage(data=out.getvalue(), format="jpeg")


def render_vision_image(project: str, image_ref: str | None, max_dim: int = MAX_VISION_PX) -> McpImage | None:
    """Load and resize a game image for vision-capable MCP agents."""
    if not image_ref:
        return None
    path = resolve_image_path(project, image_ref)
    if path is None:
        return None
    with Image.open(path) as img:
        img.load()
        if img.width > max_dim or img.height > max_dim:
            img.thumbnail((max_dim, max_dim), Image.LANCZOS)
        return _encode_mcp_image(img)


def _fit_cover(img: Image.Image, width: int, height: int) -> Image.Image:
    """Scale and center-crop to fill (width, height), matching CSS background-size: cover."""
    scale = max(width / img.width, height / img.height)
    new_w = max(1, int(round(img.width * scale)))
    new_h = max(1, int(round(img.height * scale)))
    resized = img.resize((new_w, new_h), Image.LANCZOS)
    left = (new_w - width) // 2
    top = (new_h - height) // 2
    return resized.crop((left, top, left + width, top + height))


def render_pac_annotated_image(
    project: str,
    background_ref: str | None,
    zones: list[dict],
) -> McpImage:
    """Composite a 16:9 Point-and-Click scene with zone sprites and numbered bounding boxes."""
    canvas = Image.new("RGBA", (PAC_WIDTH, PAC_HEIGHT), (42, 42, 44, 255))

    bg_path = resolve_image_path(project, background_ref) if background_ref else None
    if bg_path is not None:
        with Image.open(bg_path) as bg:
            bg.load()
            fitted = _fit_cover(bg.convert("RGBA"), PAC_WIDTH, PAC_HEIGHT)
            canvas.paste(fitted, (0, 0))

    overlay = Image.new("RGBA", (PAC_WIDTH, PAC_HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    for z in zones:
        idx = int(z.get("index", 0))
        bounds = z.get("bounds") or {}
        x1 = int(round((float(bounds.get("x", 0)) / 100.0) * PAC_WIDTH))
        y1 = int(round((float(bounds.get("y", 0)) / 100.0) * PAC_HEIGHT))
        w = max(8, int(round((float(bounds.get("width", 10)) / 100.0) * PAC_WIDTH)))
        h = max(8, int(round((float(bounds.get("height", 10)) / 100.0) * PAC_HEIGHT)))
        x2 = min(PAC_WIDTH - 1, x1 + w)
        y2 = min(PAC_HEIGHT - 1, y1 + h)
        x1 = max(0, min(x1, PAC_WIDTH - 2))
        y1 = max(0, min(y1, PAC_HEIGHT - 2))

        disabled = bool(z.get("disabled"))
        zone_img_ref = z.get("image_ref")
        zone_path = resolve_image_path(project, zone_img_ref) if zone_img_ref else None
        if zone_path is not None:
            try:
                with Image.open(zone_path) as sprite:
                    sprite.load()
                    sprite_rgba = sprite.convert("RGBA")
                    sprite_rgba.thumbnail((max(1, x2 - x1), max(1, y2 - y1)), Image.LANCZOS)
                    if disabled:
                        r, g, b, a = sprite_rgba.split()
                        a = a.point(lambda px: int(px * 0.35))
                        sprite_rgba = Image.merge("RGBA", (r, g, b, a))
                    px_x = x1 + ((x2 - x1) - sprite_rgba.width) // 2
                    px_y = y1 + ((y2 - y1) - sprite_rgba.height) // 2
                    canvas.alpha_composite(sprite_rgba, (px_x, px_y))
            except Exception:
                pass

        color = DISABLED_COLOR if disabled else ZONE_COLORS[idx % len(ZONE_COLORS)]
        fill_alpha = 28 if disabled else 45
        draw.rectangle([x1, y1, x2, y2], fill=(color[0], color[1], color[2], fill_alpha), outline=color, width=3)

        label_text = f"[{idx}] {z.get('name') or z.get('id') or ''}"
        if disabled:
            label_text += " (disabled)"
        bbox = draw.textbbox((0, 0), label_text)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
        pad = 4
        lx = max(2, min(x1, PAC_WIDTH - tw - pad * 2 - 2))
        ly = y1 - th - pad * 2 - 2 if y1 >= th + pad * 2 + 4 else min(y1 + 4, PAC_HEIGHT - th - pad * 2 - 2)
        draw.rectangle([lx, ly, lx + tw + pad * 2, ly + th + pad * 2], fill=(15, 18, 24, 215), outline=color, width=1)
        draw.text((lx + pad, ly + pad), label_text, fill=(255, 255, 255, 255))

    composited = Image.alpha_composite(canvas, overlay).convert("RGB")
    out = BytesIO()
    composited.save(out, format="PNG", optimize=True)
    return McpImage(data=out.getvalue(), format="png")
