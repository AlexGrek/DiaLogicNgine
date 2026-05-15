"""Settings API: read/write OffloadMQ runtime configuration."""
from pathlib import Path

from dotenv import set_key
from fastapi import APIRouter
from pydantic import BaseModel

from app.api.v1 import offloadmq as mq_module

router = APIRouter(prefix="/settings", tags=["settings"])

ENV_FILE = Path(__file__).parent.parent.parent.parent / ".env"


def _masked(key: str) -> str:
    if not key:
        return ""
    if len(key) <= 8:
        return "*" * len(key)
    return key[:4] + "…" + key[-4:]


@router.get("/offloadmq")
def get_offloadmq():
    return {
        "url": mq_module.OFFLOADMQ_URL,
        "api_key_masked": _masked(mq_module.OFFLOADMQ_API_KEY),
        "configured": bool(mq_module.OFFLOADMQ_URL and mq_module.OFFLOADMQ_API_KEY),
    }


class OffloadMqConfig(BaseModel):
    url: str = ""
    api_key: str = ""


@router.post("/offloadmq")
def set_offloadmq(cfg: OffloadMqConfig):
    ENV_FILE.touch(exist_ok=True)
    if cfg.url:
        mq_module.OFFLOADMQ_URL = cfg.url.rstrip("/")
        set_key(str(ENV_FILE), "OFFLOADMQ_URL", mq_module.OFFLOADMQ_URL)
    if cfg.api_key:
        mq_module.OFFLOADMQ_API_KEY = cfg.api_key
        set_key(str(ENV_FILE), "OFFLOADMQ_API_KEY", cfg.api_key)
    return {"status": "ok"}
