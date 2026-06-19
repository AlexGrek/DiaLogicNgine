from fastapi import APIRouter
from app.api.v1 import health, images, offloadmq, projects, settings, llm, prompts, auth_routes

router = APIRouter(prefix="/api/v1")
router.include_router(health.router)
router.include_router(auth_routes.router)
router.include_router(projects.router)
router.include_router(images.router)
router.include_router(offloadmq.router)
router.include_router(settings.router)
router.include_router(llm.router)
router.include_router(prompts.router)
