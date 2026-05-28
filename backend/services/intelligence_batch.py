from datetime import datetime, timedelta
from typing import Optional

from sqlmodel import Session, select

from backend.db import engine
from backend.models import Entity, IntelligenceRefreshRun
from backend.services.intelligence import build_snapshot


def _run_to_dict(run: IntelligenceRefreshRun) -> dict:
    return {
        "id": run.id,
        "status": run.status,
        "scope": run.scope,
        "total_entities": run.total_entities,
        "processed_entities": run.processed_entities,
        "succeeded_entities": run.succeeded_entities,
        "failed_entities": run.failed_entities,
        "max_results_per_entity": run.max_results_per_entity,
        "error_message": run.error_message,
        "started_at": run.started_at,
        "updated_at": run.updated_at,
        "completed_at": run.completed_at,
    }


def latest_refresh_run(session: Session) -> Optional[IntelligenceRefreshRun]:
    return session.exec(
        select(IntelligenceRefreshRun).order_by(IntelligenceRefreshRun.started_at.desc())  # type: ignore[arg-type]
    ).first()


def running_refresh_run(session: Session) -> Optional[IntelligenceRefreshRun]:
    run = session.exec(
        select(IntelligenceRefreshRun)
        .where(IntelligenceRefreshRun.status == "running")
        .order_by(IntelligenceRefreshRun.started_at.desc())  # type: ignore[arg-type]
    ).first()
    if run is None:
        return None

    if run.updated_at and datetime.utcnow() - run.updated_at > timedelta(hours=2):
        run.status = "failed"
        run.error_message = "Refresh run marked stale after no progress for more than 2 hours."
        run.completed_at = datetime.utcnow()
        run.updated_at = run.completed_at
        session.add(run)
        session.commit()
        return None

    return run


def create_refresh_run(
    session: Session,
    *,
    max_results_per_entity: int,
    scope: str = "all_entities",
) -> IntelligenceRefreshRun:
    entities = session.exec(select(Entity).order_by(Entity.id)).all()
    run = IntelligenceRefreshRun(
        status="running",
        scope=scope,
        total_entities=len(entities),
        max_results_per_entity=max_results_per_entity,
    )
    session.add(run)
    session.commit()
    session.refresh(run)
    return run


def process_refresh_run(run_id: int) -> None:
    with Session(engine) as session:
        run = session.get(IntelligenceRefreshRun, run_id)
        if run is None:
            return

        entities = session.exec(select(Entity).order_by(Entity.id)).all()
        run.total_entities = len(entities)
        run.updated_at = datetime.utcnow()
        session.add(run)
        session.commit()

        for entity in entities:
            try:
                build_snapshot(
                    session,
                    entity,
                    max_results=run.max_results_per_entity,
                )
                run.succeeded_entities += 1
            except Exception as exc:  # noqa: BLE001 - keep the batch alive and persist failures.
                run.failed_entities += 1
                run.error_message = str(exc)[:500]
            finally:
                run.processed_entities += 1
                run.updated_at = datetime.utcnow()
                session.add(run)
                session.commit()

        run.status = "completed" if run.failed_entities == 0 else "completed_with_errors"
        run.completed_at = datetime.utcnow()
        run.updated_at = run.completed_at
        session.add(run)
        session.commit()
