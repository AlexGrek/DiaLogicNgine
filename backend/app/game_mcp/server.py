"""Streamable HTTP MCP tools and their authenticated ASGI entry point."""

import base64
from contextvars import ContextVar
from io import BytesIO
from pathlib import Path
from typing import Annotated, Literal
from urllib.parse import quote, urlsplit

from fastapi import FastAPI, UploadFile
from mcp.server.fastmcp import FastMCP, Image
from mcp.server.transport_security import TransportSecuritySettings
from PIL import Image as PillowImage
from pydantic import Field
from starlette.datastructures import Headers
from starlette.responses import JSONResponse
from starlette.routing import Route

from app import image_storage
from app.api.v1 import images, projects

from . import authorization as auth
from . import editor
from .help import help_entry

principal = ContextVar[str]("mcp_project_owner")
security = TransportSecuritySettings(
    allowed_hosts=[urlsplit(auth.ORIGIN).netloc], allowed_origins=[auth.ORIGIN]
)
mcp = FastMCP(
    "DiaLogicNgine Editor",
    instructions="List your projects (or create_project a new empty one) and editor planes. Browse a field, read a narrow JSON Pointer, then patch using the returned revision. Ask editor_help for individual schema, link or script topics.",
    stateless_http=True,
    json_response=True,
    transport_security=security,
    max_request_body_size=12 * 1024 * 1024,
)
Offset = Annotated[int, Field(ge=0)]
Limit = Annotated[int, Field(ge=1, le=50)]


@mcp.tool()
async def list_projects(page: Annotated[int, Field(ge=1)] = 1) -> dict:
    """List names of saved games owned by this account, ten per page."""
    result = await projects.list_projects(page, principal.get())
    return {"projects": [p["name"] for p in result["projects"]], "total": result["total"], "page": page}


@mcp.tool()
def create_project(
    project: Annotated[str, Field(min_length=1, max_length=64)], title: str = "", description: str = ""
) -> dict:
    """Create a new empty game owned by this account. Fails if the name is taken. Then patch dialogs, locs, chars, startupDialog etc. to fill it."""
    return editor.create_game(project, principal.get(), title, description)


@mcp.tool()
def editor_planes() -> dict:
    """Discover editor sections and the fields available to browse, read and patch."""
    return {**editor.PLANES, "resources": ["Use list_images, preview_image, upload_image and delete_image."]}


@mcp.tool()
def browse_field(
    project: str, plane: str, field: str, path: str = "", offset: Offset = 0, limit: Limit = 20
) -> dict:
    """List immediate children with field-relative JSON Pointers, labels and a field revision."""
    _, value = editor.portion(project, principal.get(), plane, field)
    return {**editor.browse(value, path, offset, limit), "revision": editor.revision(value)}


@mcp.tool()
def read_fragment(
    project: str, plane: str, field: str, path: str = "", text_offset: Offset | None = None
) -> dict:
    """Read one field or nested JSON Pointer, up to 12 KB. Browse large containers. For long strings, pass text_offset to read up to 1500 characters."""
    _, value = editor.portion(project, principal.get(), plane, field)
    fragment = editor.resolve(value, path)
    if text_offset is not None:
        if not isinstance(fragment, str):
            raise ValueError("text_offset requires a string")
        return {
            "value": fragment[text_offset : text_offset + 1500],
            "length": len(fragment),
            "revision": editor.revision(value),
        }
    if len(editor.encoded(fragment)) > editor.MAX_FRAGMENT:
        raise ValueError("Fragment exceeds 12 KB. Use browse_field and read a child path.")
    return {"value": fragment, "revision": editor.revision(value)}


@mcp.tool()
def patch_field(project: str, plane: str, field: str, revision: str, operations: list[dict]) -> dict:
    """Apply an atomic RFC 6902 batch. Both path and from are relative to the field root, including after a nested read."""
    return editor.patch(project, principal.get(), plane, field, revision, operations)


@mcp.tool()
def editor_help(group: Literal["link", "script", "schema"], topic: str = "") -> dict:
    """Omit topic for names, then request one link type, script field, runtime API or schema definition."""
    return {"result": help_entry(group, topic)}


def asset(project, filename):
    directory = editor.owned_game(project, principal.get()).parent
    editor.component(filename)
    for subdir in ("images", "image_thumbs"):
        path = directory / subdir / filename
        if path.resolve() != path:
            raise ValueError("Invalid image path")


@mcp.tool()
async def list_images(project: str, offset: Offset = 0, limit: Limit = 20) -> dict:
    """List project image filenames. Preview individual thumbnails on demand."""
    directory = editor.owned_game(project, principal.get()).parent / "images"
    if directory.is_symlink():
        raise ValueError("Invalid image directory")
    names = (await images.list_images(project, principal.get()))["images"]
    return {"images": names[offset : offset + limit], "total": len(names)}


@mcp.tool()
def preview_image(project: str, filename: str) -> Image:
    """Return a thumbnail as native MCP image content."""
    asset(project, filename)
    path = image_storage.ensure_thumbnail(project, filename)
    with PillowImage.open(path) as img:
        img.thumbnail((256, 256))
        output = BytesIO()
        img.convert("RGBA").save(output, "PNG")
    return Image(data=output.getvalue(), format="png")


@mcp.tool()
async def upload_image(project: str, filename: str, data_base64: str) -> dict:
    """Upload or replace a PNG, JPEG, WebP or GIF (8 MiB). Patch image fields with the returned reference."""
    asset(project, filename)
    if len(data_base64) > 4 * ((8 * 1024 * 1024 + 2) // 3):
        raise ValueError("Maximum image size is 8 MiB")
    data = base64.b64decode(data_base64, validate=True)
    if len(data) > 8 * 1024 * 1024:
        raise ValueError("Maximum image size is 8 MiB")
    formats = {".png": "PNG", ".jpg": "JPEG", ".jpeg": "JPEG", ".webp": "WEBP", ".gif": "GIF"}
    with PillowImage.open(BytesIO(data)) as img:
        if formats.get(Path(filename).suffix.lower()) != img.format or img.width * img.height > 32_000_000:
            raise ValueError("Image format must match filename and fit within 32 megapixels")
        mime = PillowImage.MIME[img.format]
        img.load()
    file = UploadFile(BytesIO(data), filename=filename, headers=Headers({"content-type": mime}))
    result = await images.upload_image(project, filename, file, principal.get())
    return {
        **result,
        "reference": filename,
        "url": f"/api/v1/projects/{quote(project, safe='')}/images/{quote(filename, safe='')}",
    }


@mcp.tool()
async def delete_image(project: str, filename: str) -> dict:
    """Remove one uploaded image and its thumbnail. Existing game references require a separate patch."""
    asset(project, filename)
    return await images.delete_image(project, filename, principal.get())


class ProtectedMCP:
    def __init__(self):
        self.app = mcp.streamable_http_app()

    async def __call__(self, scope, receive, send):
        headers = Headers(scope=scope)
        scheme, _, token = headers.get("authorization", "").partition(" ")
        credential = headers.get("x-api-key") or (token if scheme.lower() == "bearer" else "")
        user = auth.bearer_owner(credential) if credential else None
        if not user:
            response = JSONResponse(
                {"error": "unauthorized"},
                401,
                headers={
                    "WWW-Authenticate": f'Bearer realm="DiaLogicNgine", scope="mcp", resource_metadata="{auth.ORIGIN}/.well-known/oauth-protected-resource/mcp"'
                },
            )
            return await response(scope, receive, send)
        ctx = principal.set(user)
        try:
            await self.app(scope, receive, send)
        finally:
            principal.reset(ctx)


def install(app: FastAPI):
    app.add_middleware(auth.OAuthHTTPMiddleware)
    app.include_router(auth.router)
    app.router.routes.append(Route("/mcp", ProtectedMCP()))
