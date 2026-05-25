from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from db import init_db
from seed import run_seed
from routers import entities, services, scenarios, import_routes, allocations, outreach


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    run_seed()
    yield


app = FastAPI(title="HACS Intelligence API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(entities.router)
app.include_router(services.router)
app.include_router(scenarios.router)
app.include_router(import_routes.router)
app.include_router(allocations.router)
app.include_router(outreach.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
