from contextlib import AsyncExitStack, asynccontextmanager
import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from app import auth
from app.api.v1.router import router

from app.game_mcp import server as game_mcp
from app.play_mcp import server as play_mcp


def _prepare_session_manager(app_instance: FastAPI, mcp_module, route_path: str):
    """Recreate FastMCP's single-use session manager if the ASGI lifespan restarts in-process."""
    mgr = getattr(mcp_module.mcp, "_session_manager", None)
    if mgr is not None and getattr(mgr, "_has_started", False):
        mcp_module.mcp._session_manager = None
        for route in app_instance.router.routes:
            if getattr(route, "path", None) == route_path and hasattr(route, "endpoint"):
                route.endpoint.app = mcp_module.mcp.streamable_http_app()
                break
    return mcp_module.mcp.session_manager


@asynccontextmanager
async def lifespan(app_instance):
    async with AsyncExitStack() as stack:
        await stack.enter_async_context(_prepare_session_manager(app_instance, game_mcp, "/mcp").run())
        await stack.enter_async_context(_prepare_session_manager(app_instance, play_mcp, "/play-mcp").run())
        try:
            yield
        finally:
            await play_mcp.pool.shutdown()


app = FastAPI(title="DiaLogicNgine API", lifespan=lifespan)
game_mcp.install(app)
play_mcp.install(app)

# Create the root user (password 000000) and assign all pre-existing projects to
# it. Idempotent — safe to run on every startup.
auth.ensure_root_and_migrate()

app.include_router(router)

_static_dir = os.getenv("STATIC_DIR", "")
if _static_dir and Path(_static_dir).is_dir():
    _static = Path(_static_dir)

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        target = (_static / full_path).resolve()
        if str(target).startswith(str(_static)) and target.is_file():
            return FileResponse(str(target))
        return FileResponse(str(_static / "index.html"))
