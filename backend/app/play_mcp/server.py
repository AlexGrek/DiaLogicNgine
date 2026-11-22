"""Streamable HTTP Player MCP server mounted at /play-mcp."""

import json
from contextvars import ContextVar
from typing import Annotated, Literal
from urllib.parse import urlsplit

from fastapi import FastAPI
from mcp.server.fastmcp import FastMCP, Image
from mcp.server.transport_security import TransportSecuritySettings
from mcp.types import ImageContent, TextContent
from pydantic import Field
from starlette.datastructures import Headers
from starlette.responses import JSONResponse
from starlette.routing import Route

from app.game_mcp import authorization as auth

from . import catalog, media, store
from .pool import pool

principal = ContextVar[str]("play_mcp_owner")
security = TransportSecuritySettings(
    allowed_hosts=[urlsplit(auth.ORIGIN).netloc], allowed_origins=[auth.ORIGIN]
)
mcp = FastMCP(
    "DiaLogicNgine Player",
    instructions=(
        "Browse available games (list_available_games), games you have saves for (list_saved_games), "
        "and recently played sessions (list_recently_played). Start a new playthrough with start_game "
        "or continue an existing one with resume_session using its session_code. Read the returned scene "
        "text, image, HUD, and action variants, then advance the game with act. Every turn is automatically "
        "saved; use save_checkpoint/load_checkpoint for named save slots and inspect for inventory, facts, "
        "people, places, and quests."
    ),
    streamable_http_path="/play-mcp",
    stateless_http=True,
    json_response=True,
    transport_security=security,
    max_request_body_size=4 * 1024 * 1024,
)

Offset = Annotated[int, Field(ge=0)]
Limit = Annotated[int, Field(ge=1, le=50)]
Page = Annotated[int, Field(ge=1)]


def _turn_content(
    session_code: str,
    project: str,
    turn: dict,
    *,
    include_image: bool,
    title: str = "",
) -> list[TextContent | ImageContent]:
    avail = turn.get("available_images") or {}
    scene = turn.get("scene") or {}
    actions = turn.get("actions") or {}
    widget = turn.get("widget")

    # Strip internal image_ref fields from zones in the public JSON payload while
    # keeping layout bounds and labels intact.
    public_zones = [
        {
            "index": z["index"],
            "id": z["id"],
            "name": z["name"],
            "disabled": z["disabled"],
            "disabled_reason": z["disabled_reason"],
            "bounds": z["bounds"],
        }
        for z in (actions.get("zones") or [])
    ]

    public_scene = {
        "text": scene.get("text", ""),
        "page_index": scene.get("page_index", 0),
        "page_count": scene.get("page_count", 1),
        "speaker": scene.get("speaker"),
        "location": scene.get("location"),
        "pac": scene.get("pac"),
        "has_background": bool(avail.get("scene")),
        "background_changed": bool(scene.get("background_changed")),
        "error": scene.get("error"),
    }

    public_actions = {
        **actions,
        "zones": public_zones,
    }

    payload = {
        "session_code": session_code,
        "project": project,
        **({"title": title} if title else {}),
        "game_name": turn.get("game_name", ""),
        "game_version": turn.get("game_version", ""),
        "step": turn.get("step", 0),
        "situation": turn.get("situation"),
        "widget": widget,
        "position_summary": turn.get("position_summary", ""),
        "scene": public_scene,
        "actions": public_actions,
        "hud": turn.get("hud", []),
        "new_notifications": turn.get("new_notifications", []),
        "counts": turn.get("counts", {}),
        "viewable_images": {
            "scene": bool(avail.get("scene")),
            "avatar": bool(avail.get("avatar")),
            "pac_annotated": widget == "pac",
            "items": sorted((avail.get("items") or {}).keys()),
            "routes": sorted((avail.get("routes") or {}).keys()),
        },
    }

    blocks: list[TextContent | ImageContent] = [
        TextContent(type="text", text=json.dumps(payload, ensure_ascii=False))
    ]

    if include_image:
        img: Image | None = None
        if widget == "pac":
            img = media.render_pac_annotated_image(
                project, avail.get("scene"), actions.get("zones") or []
            )
        elif avail.get("scene"):
            img = media.render_vision_image(project, avail.get("scene"))
        if img is not None:
            blocks.append(img.to_image_content())

    return blocks


async def _ensure_session_worker(owner: str, session: dict):
    project = session["project"]
    session_code = session["session_code"]

    def load_game() -> dict:
        game, _ = catalog.load_playable_game(project, owner)
        return game

    def load_state() -> dict:
        return json.loads(session["state_json"])

    return await pool.ensure_worker(owner, session_code, project, load_game, load_state)


# ── Discovery & Library ──────────────────────────────────────────────────────


@mcp.tool()
def list_available_games(
    search: str = "",
    page: Page = 1,
    limit: Limit = 20,
) -> dict:
    """List all games available to play (published games plus your own unpublished games), with your save counts."""
    owner = principal.get()
    save_stats = store.get_game_save_stats(owner)
    return catalog.list_available_games(
        owner, search=search, page=page, page_size=limit, save_stats=save_stats
    )


@mcp.tool()
def list_saved_games() -> dict:
    """List all distinct games you currently have saved sessions for."""
    owner = principal.get()
    rows = store.list_saved_games(owner)
    games = []
    for row in rows:
        summary = catalog.game_summary(row["project"], owner)
        games.append({**row, **summary})
    return {"games": games, "total": len(games)}


@mcp.tool()
def list_recently_played(limit: Limit = 10) -> dict:
    """List your most recently played game sessions, newest first."""
    owner = principal.get()
    rows = store.list_recently_played(owner, limit=limit)
    recent = []
    for row in rows:
        summary = catalog.game_summary(row["project"], owner)
        recent.append(
            {
                **row,
                "display_name": summary["display_name"],
                "playable": summary["playable"],
                "worker_active": pool.is_active(owner, row["session_code"]),
            }
        )
    return {"sessions": recent, "total": len(recent)}


# ── Session Lifecycle & Save/Load ────────────────────────────────────────────


@mcp.tool(structured_output=False)
async def start_game(
    project: str,
    title: str = "",
    include_image: bool = True,
) -> list[TextContent | ImageContent]:
    """Start a new isolated game session, save its initial state, and return the session_code with the opening scene."""
    owner = principal.get()
    game, _ = catalog.load_playable_game(project, owner)
    worker, result = await pool.spawn_new(project, game)
    try:
        record = store.create_session(owner, project, title, result["state"], result["turn"])
    except Exception:
        await worker.close(force=True)
        raise
    await pool.register(owner, record["session_code"], worker)
    return _turn_content(
        record["session_code"],
        project,
        result["turn"],
        include_image=include_image,
        title=record["title"],
    )


@mcp.tool()
def list_sessions(
    project: str = "",
    offset: Offset = 0,
    limit: Limit = 20,
) -> dict:
    """List your saved play sessions (optionally filtered to one game), newest first."""
    owner = principal.get()
    result = store.list_sessions(owner, project=project, offset=offset, limit=limit)
    enriched = []
    for row in result["sessions"]:
        summary = catalog.game_summary(row["project"], owner)
        enriched.append(
            {
                **row,
                "display_name": summary["display_name"],
                "playable": summary["playable"],
                "worker_active": pool.is_active(owner, row["session_code"]),
            }
        )
    return {"sessions": enriched, "total": result["total"]}


@mcp.tool(structured_output=False)
async def resume_session(
    session_code: str,
    include_image: bool = True,
) -> list[TextContent | ImageContent]:
    """Resume a saved game session by session_code, restoring its isolated JS worker if needed."""
    owner = principal.get()
    async with pool.session_lock(owner, session_code):
        session = store.require_session(owner, session_code)
        worker, init_result = await _ensure_session_worker(owner, session)
        try:
            result = init_result if init_result is not None else await worker.call("render")
        except Exception:
            await pool.drop_if_dead(owner, session_code, worker)
            raise
        store.touch_session(owner, session_code)
    return _turn_content(
        session_code,
        session["project"],
        result["turn"],
        include_image=include_image,
        title=session["title"],
    )


@mcp.tool()
async def delete_session(session_code: str) -> dict:
    """Terminate the isolated JS worker (if running) and permanently delete the saved session and its checkpoints."""
    owner = principal.get()
    store.require_session(owner, session_code)
    await pool.close_session(owner, session_code)
    deleted = store.delete_session(owner, session_code)
    if not deleted:
        raise ValueError("Play session not found")
    return {"status": "ok", "session_code": session_code}


@mcp.tool()
def save_checkpoint(session_code: str, name: str) -> dict:
    """Create or overwrite a named manual save checkpoint for this session's current state."""
    owner = principal.get()
    return store.save_checkpoint(owner, session_code, name)


@mcp.tool()
def list_checkpoints(session_code: str) -> dict:
    """List named manual save checkpoints for this session (plus whether a 1-step previous autosave is available)."""
    owner = principal.get()
    return store.list_checkpoints(owner, session_code)


@mcp.tool(structured_output=False)
async def load_checkpoint(
    session_code: str,
    name: str = "",
    use_previous_autosave: bool = False,
    include_image: bool = True,
) -> list[TextContent | ImageContent]:
    """Restore a named manual checkpoint (or the 1-step previous autosave) into the session."""
    owner = principal.get()
    if not use_previous_autosave and not name.strip():
        raise ValueError("Specify a checkpoint 'name' or set use_previous_autosave=True")

    async with pool.session_lock(owner, session_code):
        session = store.require_session(owner, session_code)
        target_state = (
            store.get_previous_autosave_state(owner, session_code)
            if use_previous_autosave
            else store.get_checkpoint_state(owner, session_code, name)
        )
        worker, _ = await _ensure_session_worker(owner, session)
        try:
            result = await worker.call("load_state", state=target_state)
        except Exception:
            await pool.drop_if_dead(owner, session_code, worker)
            raise
        store.update_session_turn(
            owner,
            session_code,
            result["state"],
            result["turn"],
            shift_prev=not use_previous_autosave,
        )
    return _turn_content(
        session_code,
        session["project"],
        result["turn"],
        include_image=include_image,
        title=session["title"],
    )


@mcp.tool()
def delete_checkpoint(session_code: str, name: str) -> dict:
    """Delete a named manual save checkpoint without deleting the session."""
    owner = principal.get()
    if not store.delete_checkpoint(owner, session_code, name):
        raise ValueError(f"Checkpoint '{name}' not found")
    return {"status": "ok", "session_code": session_code, "name": name.strip()}


# ── Gameplay Loop & Inspection ───────────────────────────────────────────────


@mcp.tool(structured_output=False)
async def get_state(
    session_code: str,
    include_image: bool = True,
) -> list[TextContent | ImageContent]:
    """Read the current scene, text, HUD, action variants, and optional image without advancing the game."""
    owner = principal.get()
    async with pool.session_lock(owner, session_code):
        session = store.require_session(owner, session_code)
        worker, init_result = await _ensure_session_worker(owner, session)
        try:
            result = init_result if init_result is not None else await worker.call("render")
        except Exception:
            await pool.drop_if_dead(owner, session_code, worker)
            raise
    return _turn_content(
        session_code,
        session["project"],
        result["turn"],
        include_image=include_image,
        title=session["title"],
    )


@mcp.tool(structured_output=False)
async def act(
    session_code: str,
    action: Literal["choose_link", "continue", "travel", "click_zone", "discuss", "use_item"],
    index: Annotated[int, Field(ge=0)] | None = None,
    target_id: str | None = None,
    topic_type: Literal["char", "fact", "item", "loc"] | None = None,
    include_image: bool = True,
) -> list[TextContent | ImageContent]:
    """Perform one gameplay action in the session's isolated JS process, persist the new state, and return the next scene.

    - choose_link: select a dialog/location/character link by index
    - continue: advance multi-page text or follow an auto-continue link
    - travel: travel a location route by index or target_id (location uid)
    - click_zone: interact with a point-and-click scene zone by target_id (zone id) or index
    - discuss: discuss a topic with the current character using topic_type ('char'|'fact'|'item'|'loc') and target_id
    - use_item: use a carried inventory item in the current dialog window by target_id (item uid)
    """
    owner = principal.get()
    async with pool.session_lock(owner, session_code):
        session = store.require_session(owner, session_code)
        worker, _ = await _ensure_session_worker(owner, session)
        action_payload = {
            "action": action,
            "index": index,
            "target_id": target_id,
            "topic_type": topic_type,
        }
        try:
            result = await worker.call("act", payload=action_payload)
        except Exception:
            await pool.drop_if_dead(owner, session_code, worker)
            raise
        store.update_session_turn(owner, session_code, result["state"], result["turn"])
    return _turn_content(
        session_code,
        session["project"],
        result["turn"],
        include_image=include_image,
        title=session["title"],
    )


@mcp.tool()
async def inspect(
    session_code: str,
    section: Literal["inventory", "facts", "people", "places", "objectives", "history", "summary"] = "summary",
) -> dict:
    """Inspect the player's inventory, known facts, people, places, quest journal, or recent history."""
    owner = principal.get()
    async with pool.session_lock(owner, session_code):
        session = store.require_session(owner, session_code)
        worker, _ = await _ensure_session_worker(owner, session)
        try:
            return await worker.call("inspect", section=section)
        except Exception:
            await pool.drop_if_dead(owner, session_code, worker)
            raise


@mcp.tool()
async def view_image(
    session_code: str,
    target: Literal["scene", "avatar", "item", "route", "pac_annotated"] = "scene",
    target_id: str = "",
) -> Image:
    """Fetch a game image from the current session context as native MCP image content."""
    owner = principal.get()
    async with pool.session_lock(owner, session_code):
        session = store.require_session(owner, session_code)
        project = session["project"]
        worker, init_result = await _ensure_session_worker(owner, session)
        try:
            result = init_result if init_result is not None else await worker.call("render")
        except Exception:
            await pool.drop_if_dead(owner, session_code, worker)
            raise

    turn = result["turn"]
    avail = turn.get("available_images") or {}
    actions = turn.get("actions") or {}

    if target == "pac_annotated":
        if turn.get("widget") != "pac":
            raise ValueError("Current screen is not a point-and-click scene")
        return media.render_pac_annotated_image(project, avail.get("scene"), actions.get("zones") or [])

    if target == "scene":
        ref = avail.get("scene")
    elif target == "avatar":
        ref = avail.get("avatar")
    elif target == "item":
        ref = (avail.get("items") or {}).get(target_id)
    elif target == "route":
        ref = (avail.get("routes") or {}).get(target_id)
    else:
        raise ValueError(f"Unknown image target '{target}'")

    if not ref:
        raise ValueError(f"No image available for target='{target}'" + (f", target_id='{target_id}'" if target_id else ""))
    img = media.render_vision_image(project, ref)
    if img is None:
        raise ValueError("Image asset could not be loaded")
    return img


# ── Authenticated ASGI mount ─────────────────────────────────────────────────


class ProtectedPlayMCP:
    def __init__(self):
        self.app = mcp.streamable_http_app()

    async def __call__(self, scope, receive, send):
        headers = Headers(scope=scope)
        scheme, _, token = headers.get("authorization", "").partition(" ")
        credential = headers.get("x-api-key") or (token if scheme.lower() == "bearer" else "")
        user = auth.bearer_owner(credential, resource=auth.play_resource()) if credential else None
        if not user:
            response = JSONResponse(
                {"error": "unauthorized"},
                401,
                headers={
                    "WWW-Authenticate": (
                        f'Bearer realm="DiaLogicNgine", scope="mcp", '
                        f'resource_metadata="{auth.ORIGIN}/.well-known/oauth-protected-resource/play-mcp"'
                    )
                },
            )
            return await response(scope, receive, send)
        ctx = principal.set(user)
        try:
            await self.app(scope, receive, send)
        finally:
            principal.reset(ctx)


def install(app: FastAPI):
    app.router.routes.append(Route("/play-mcp", ProtectedPlayMCP()))
