from contextlib import asynccontextmanager
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.db import init_db
from backend.seed import run_seed
from backend.routers import (
    allocations,
    entities,
    hacs_assignments,
    import_routes,
    intelligence,
    outreach,
    scenarios,
    services,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    run_seed()
    yield


app = FastAPI(title="HACS Intelligence API", lifespan=lifespan)

default_cors_origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "https://hacs-api.onrender.com",
]
extra_cors_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=[*default_cors_origins, *extra_cors_origins],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(entities.router)
app.include_router(hacs_assignments.router)
app.include_router(services.router)
app.include_router(scenarios.router)
app.include_router(import_routes.router)
app.include_router(allocations.router)
app.include_router(intelligence.router)
app.include_router(outreach.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
