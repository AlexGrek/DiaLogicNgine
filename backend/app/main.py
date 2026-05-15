import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from app.api.v1.router import router

app = FastAPI(title="DiaLogicNgine API")
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
