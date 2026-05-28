import csv
import io
import json
from datetime import datetime, date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlmodel import Session, select

from backend.db import get_session
from backend.models import (
    PastAllocation, ImportLog, ImportLogOut, Annex71StatusOut,
    TedSearchRequest, TedNotice, TedConfirmRequest,
)
from backend.services import annex71 as annex71_svc
from backend.services.ted_search import search_ted
from backend.services.entity_matcher import match_entity

router = APIRouter(prefix="/api/import", tags=["import"])


@router.get("/annex71/status", response_model=Annex71StatusOut)
def annex71_status(session: Session = Depends(get_session)):
    data = annex71_svc.get_status(session)
    return Annex71StatusOut(**data)


@router.post("/annex71/reimport")
def reimport_annex71(session: Session = Depends(get_session)):
    # Delete existing annex71 records and reimport
    existing = session.exec(
        select(PastAllocation).where(PastAllocation.source == "annex71")
    ).all()
    for rec in existing:
        session.delete(rec)
    session.commit()
    count = annex71_svc.parse_annex71(session)
    return {"records_imported": count}


@router.post("/ted/search")
def ted_search(req: TedSearchRequest, session: Session = Depends(get_session)):
    notices = search_ted(session, req.query, req.max_results)
    return {"notices": [TedNotice(**n) for n in notices]}


@router.post("/ted/confirm")
def ted_confirm(req: TedConfirmRequest, session: Session = Depends(get_session)):
    # Mark cached notices as imported (simplified: just log them)
    if not req.notice_ids:
        return {"records_imported": 0}
    session.add(ImportLog(
        source="ted",
        status="ok",
        message=f"Confirmed {len(req.notice_ids)} TED notices",
        records_imported=len(req.notice_ids),
    ))
    session.commit()
    return {"records_imported": len(req.notice_ids)}


@router.post("/csv/allocations")
async def import_csv(file: UploadFile = File(...), session: Session = Depends(get_session)):
    """Accept CSV with required columns entity_name, client_name, contract_title and optional historical-award fields."""
    content = await file.read()
    text = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))

    count = 0
    errors = []
    for i, row in enumerate(reader):
        entity_raw = (row.get("entity_name") or "").strip()
        client = (row.get("client_name") or "").strip()
        title = (row.get("contract_title") or "").strip()
        if not entity_raw or not title:
            errors.append(f"Row {i+2}: missing entity_name or contract_title")
            continue

        entity_id = match_entity(session, entity_raw)
        hacs_field = _parse_int(row.get("hacs_field"))

        session.add(PastAllocation(
            entity_id=entity_id,
            entity_name_raw=entity_raw,
            client_name=client,
            contract_title=title,
            supplier_name=_clean_optional(row.get("supplier_name")),
            contract_start=_parse_date(row.get("contract_start")),
            contract_end=_parse_date(row.get("contract_end")),
            contract_value_eur=_parse_float(row.get("contract_value_eur")),
            invoiced_by_entity_eur=_parse_float(row.get("invoiced_by_entity_eur")),
            role=row.get("role"),
            hacs_field=hacs_field,
            field_of_expertise=_clean_optional(row.get("field_of_expertise")),
            framework_reference=_clean_optional(row.get("framework_reference")),
            lot_reference=_clean_optional(row.get("lot_reference")),
            source_url=_clean_optional(row.get("source_url")),
            confidence_of_match=_parse_float(row.get("confidence_of_match")),
            source="csv",
        ))
        count += 1

    session.add(ImportLog(
        source="csv",
        status="ok" if not errors else "partial",
        message=f"Imported {count} rows; {len(errors)} errors",
        records_imported=count,
    ))
    session.commit()
    return {"records_imported": count, "errors": errors}


@router.get("/log", response_model=list[ImportLogOut])
def import_log(session: Session = Depends(get_session)):
    logs = session.exec(
        select(ImportLog).order_by(ImportLog.created_at.desc())  # type: ignore[arg-type]
    ).all()
    return [ImportLogOut(
        id=l.id,
        source=l.source,
        status=l.status,
        message=l.message,
        records_imported=l.records_imported,
        created_at=l.created_at,
    ) for l in logs]


def _parse_int(v) -> Optional[int]:
    if v is None:
        return None
    try:
        return int(v)
    except (TypeError, ValueError):
        return None


def _parse_float(v) -> Optional[float]:
    if v is None:
        return None
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def _parse_date(v) -> Optional[date]:
    if v is None:
        return None
    if isinstance(v, date):
        return v
    text = str(v).strip()
    if not text:
        return None
    try:
        return date.fromisoformat(text)
    except ValueError:
        return None


def _clean_optional(v) -> Optional[str]:
    if v is None:
        return None
    text = str(v).strip()
    return text or None
