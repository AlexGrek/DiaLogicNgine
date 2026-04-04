from fastapi import FastAPI
from app.api.v1.router import router

app = FastAPI(title="DiaLogicNgine API")
app.include_router(router)
