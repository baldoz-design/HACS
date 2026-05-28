from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from sqlmodel import Session

from backend.db import get_session
from backend.models import (
    EntityIntelligenceOut,
    IntelligenceRefreshRequest,
    IntelligenceRefreshRunOut,
)
from backend.services.beacon_execution import (
    beacon_execution_status,
    sync_beacon_execution_public,
)
from backend.services.beacon_execution_discovery import (
    beacon_execution_discovery_status,
    sync_beacon_execution_discovery,
)
from backend.services.beacon_history import beacon_status, sync_beacon_history
from backend.services.intelligence import (
    get_latest_snapshot,
    list_latest_snapshots,
    refresh_snapshots,
    snapshot_to_out,
)
from backend.services.intelligence_batch import (
    create_refresh_run,
    latest_refresh_run,
    process_refresh_run,
    running_refresh_run,
)

router = APIRouter(prefix="/api/intelligence", tags=["intelligence"])


@router.post("/refresh", response_model=list[EntityIntelligenceOut])
def refresh_intelligence(
    req: IntelligenceRefreshRequest,
    session: Session = Depends(get_session),
):
    if not req.entity_ids:
        raise HTTPException(status_code=400, detail="entity_ids is required")
    snapshots = refresh_snapshots(
        session,
        req.entity_ids,
        max_results_per_entity=req.max_results_per_entity,
    )
    return [snapshot_to_out(snapshot) for snapshot in snapshots]


@router.post("/refresh/all", response_model=IntelligenceRefreshRunOut)
def refresh_all_intelligence(
    background_tasks: BackgroundTasks,
    max_results_per_entity: int = 6,
    session: Session = Depends(get_session),
):
    running = running_refresh_run(session)
    if running:
        return running

    run = create_refresh_run(
        session,
        max_results_per_entity=max_results_per_entity,
    )
    if run.id is None:
        raise HTTPException(status_code=500, detail="Refresh run was not persisted")
    background_tasks.add_task(process_refresh_run, run.id)
    return run


@router.get("/refresh/status", response_model=Optional[IntelligenceRefreshRunOut])
def get_refresh_status(session: Session = Depends(get_session)):
    return latest_refresh_run(session)


@router.get("", response_model=list[EntityIntelligenceOut])
def list_intelligence(
    entity_ids: Optional[list[int]] = Query(default=None),
    session: Session = Depends(get_session),
):
    snapshots = list_latest_snapshots(session, entity_ids=entity_ids)
    return [snapshot_to_out(snapshot) for snapshot in snapshots]


@router.get("/{entity_id}", response_model=EntityIntelligenceOut)
def get_intelligence(entity_id: int, session: Session = Depends(get_session)):
    snapshot = get_latest_snapshot(session, entity_id)
    if not snapshot:
        raise HTTPException(status_code=404, detail="Intelligence snapshot not found")
    return snapshot_to_out(snapshot)


@router.post("/historical/beacon/refresh")
def refresh_beacon_historical(session: Session = Depends(get_session)):
    return sync_beacon_history(session)


@router.get("/historical/beacon/status")
def get_beacon_historical_status(session: Session = Depends(get_session)):
    return beacon_status(session)


@router.post("/historical/beacon/execution/refresh")
def refresh_beacon_execution(session: Session = Depends(get_session)):
    return sync_beacon_execution_public(session)


@router.get("/historical/beacon/execution/status")
def get_beacon_execution_status(session: Session = Depends(get_session)):
    return beacon_execution_status(session)


@router.post("/historical/beacon/execution/discovery/refresh")
def refresh_beacon_execution_discovery(session: Session = Depends(get_session)):
    return sync_beacon_execution_discovery(session)


@router.get("/historical/beacon/execution/discovery/status")
def get_beacon_execution_discovery_status(session: Session = Depends(get_session)):
    return beacon_execution_discovery_status(session)
