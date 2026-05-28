from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session

from backend.db import get_session
from backend.models import HacsAssignmentGenerateRequest, HacsAssignmentOut
from backend.services.hacs_assignment import (
    assignment_to_out,
    generate_assignments,
    latest_assignment,
    list_latest_assignments,
)

router = APIRouter(prefix="/api/hacs-assignments", tags=["hacs-assignments"])


@router.get("", response_model=list[HacsAssignmentOut])
def list_hacs_assignments(
    entity_ids: Optional[list[int]] = Query(default=None),
    session: Session = Depends(get_session),
):
    assignments = list_latest_assignments(session, entity_ids=entity_ids)
    return [assignment_to_out(assignment) for assignment in assignments]


@router.get("/{entity_id}", response_model=HacsAssignmentOut)
def get_hacs_assignment(entity_id: int, session: Session = Depends(get_session)):
    assignment = latest_assignment(session, entity_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="HACS assignment not found")
    return assignment_to_out(assignment)


@router.post("/generate", response_model=list[HacsAssignmentOut])
def generate_hacs_assignments(
    req: HacsAssignmentGenerateRequest,
    session: Session = Depends(get_session),
):
    assignments = generate_assignments(
        session,
        entity_ids=req.entity_ids,
        apply_to_entities=req.apply_to_entities,
    )
    return [assignment_to_out(assignment) for assignment in assignments]
