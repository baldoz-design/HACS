from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from db import get_session
from models import Entity

router = APIRouter(prefix="/api/entities", tags=["entities"])


@router.get("", response_model=List[Entity])
def list_entities(session: Session = Depends(get_session)):
    return session.exec(select(Entity).order_by(Entity.id)).all()


@router.get("/{entity_id}", response_model=Entity)
def get_entity(entity_id: int, session: Session = Depends(get_session)):
    entity = session.get(Entity, entity_id)
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")
    return entity
