import json
from datetime import date
from pathlib import Path
from typing import Optional

from sqlmodel import Session, select

from backend.models import ImportLog, PastAllocation
from backend.services.entity_matcher import match_entity
from backend.services.execution_evidence import (
    is_framework_aggregate_supplier,
    is_supplier_specific_execution,
)

DATA_DIR = Path(__file__).parent.parent.parent / "data"
EXECUTION_FILE = DATA_DIR / "beacon_execution_public.json"
EXECUTION_SOURCE = "beacon_execution_public"
FRAMEWORK_REFERENCE = "DIGIT/2020/OP/0005"


def _parse_date(raw: Optional[str]) -> Optional[date]:
    if not raw:
        return None
    try:
        return date.fromisoformat(raw[:10])
    except ValueError:
        return None


def _load_rows() -> list[dict]:
    if not EXECUTION_FILE.exists():
        return []
    return json.loads(EXECUTION_FILE.read_text())


def _delete_existing(session: Session) -> None:
    rows = session.exec(
        select(PastAllocation).where(PastAllocation.source == EXECUTION_SOURCE)
    ).all()
    for row in rows:
        session.delete(row)
    if rows:
        session.commit()


def sync_beacon_execution_public(session: Session) -> dict:
    rows = _load_rows()
    _delete_existing(session)

    imported = 0
    matched_entities = 0
    supplier_specific_records = 0
    framework_aggregate_records = 0

    for row in rows:
        client_name = str(row.get("client_name") or "").strip()
        entity_id = match_entity(session, client_name) if client_name else None
        if entity_id is not None:
            matched_entities += 1

        supplier_name = str(row.get("supplier_name") or "").strip() or None
        allocation = PastAllocation(
            entity_id=entity_id,
            entity_name_raw=client_name or str(row.get("entity_acronym") or ""),
            client_name=client_name,
            contract_title=str(row.get("contract_title") or "").strip(),
            supplier_name=supplier_name,
            contract_start=_parse_date(row.get("contract_start")),
            contract_end=_parse_date(row.get("contract_end")),
            contract_value_eur=row.get("contract_value_eur"),
            invoiced_by_entity_eur=None,
            role=str(row.get("role") or "").strip() or None,
            hacs_field=row.get("hacs_field"),
            field_of_expertise=str(row.get("field_of_expertise") or "").strip() or None,
            framework_reference=str(row.get("framework_reference") or FRAMEWORK_REFERENCE),
            lot_reference=str(row.get("lot_reference") or "").strip() or None,
            source_url=str(row.get("source_url") or "").strip() or None,
            confidence_of_match=row.get("confidence_of_match") or 0.95,
            source=EXECUTION_SOURCE,
        )
        if is_supplier_specific_execution(allocation):
            supplier_specific_records += 1
        elif is_framework_aggregate_supplier(supplier_name):
            framework_aggregate_records += 1
        session.add(allocation)
        imported += 1

    session.add(
        ImportLog(
            source=EXECUTION_SOURCE,
            status="ok",
            message=f"Synced {imported} BEACON execution records from curated public sources",
            records_imported=imported,
        )
    )
    session.commit()

    return {
        "records_imported": imported,
        "matched_entities": matched_entities,
        "supplier_specific_records": supplier_specific_records,
        "framework_aggregate_records": framework_aggregate_records,
        "framework_reference": FRAMEWORK_REFERENCE,
        "sources_file": str(EXECUTION_FILE),
    }


def beacon_execution_status(session: Session) -> dict:
    records = session.exec(
        select(PastAllocation).where(PastAllocation.source == EXECUTION_SOURCE)
    ).all()
    latest_log = session.exec(
        select(ImportLog)
        .where(ImportLog.source == EXECUTION_SOURCE)
        .order_by(ImportLog.created_at.desc())  # type: ignore[arg-type]
    ).first()
    return {
        "records": len(records),
        "supplier_specific_records": sum(1 for record in records if is_supplier_specific_execution(record)),
        "framework_aggregate_records": sum(
            1 for record in records if is_framework_aggregate_supplier(record.supplier_name)
        ),
        "last_synced": latest_log.created_at if latest_log else None,
        "framework_reference": FRAMEWORK_REFERENCE,
        "sources_file": str(EXECUTION_FILE),
    }
