from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from backend.db import get_session
from backend.models import PastAllocation, Entity, PastAllocationOut

router = APIRouter(prefix="/api/allocations", tags=["allocations"])


@router.get("", response_model=list[PastAllocationOut])
def list_allocations(session: Session = Depends(get_session)):
    rows = session.exec(select(PastAllocation)).all()
    entities = {e.id: e for e in session.exec(select(Entity)).all()}

    result = []
    for r in rows:
        ent = entities.get(r.entity_id) if r.entity_id else None
        result.append(PastAllocationOut(
            id=r.id,
            entity_id=r.entity_id,
            entity_name_raw=r.entity_name_raw,
            entity_acronym=ent.acronym if ent else None,
            client_name=r.client_name,
            contract_title=r.contract_title,
            supplier_name=r.supplier_name,
            contract_start=r.contract_start,
            contract_end=r.contract_end,
            contract_value_eur=r.contract_value_eur,
            invoiced_by_entity_eur=r.invoiced_by_entity_eur,
            role=r.role,
            hacs_field=r.hacs_field,
            field_of_expertise=r.field_of_expertise,
            framework_reference=r.framework_reference,
            lot_reference=r.lot_reference,
            source_url=r.source_url,
            confidence_of_match=r.confidence_of_match,
            source=r.source,
        ))
    return result
