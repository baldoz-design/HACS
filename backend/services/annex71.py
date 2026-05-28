from datetime import datetime, date
from pathlib import Path
from typing import List, Optional
import logging

from sqlmodel import Session, select

from backend.models import PastAllocation, ImportLog
from backend.services.entity_matcher import match_entity

logger = logging.getLogger(__name__)

ANNEX_PATH = Path(__file__).parent.parent.parent / "data" / "input" / "1.7.1_Annex_7.1_Contract_list_template_v2_V3_DST.xlsx"

FIELD_KEYWORDS: dict[int, list[str]] = {
    1: ["legal", "regulatory"],
    2: ["evaluation", "monitoring", "benchmarking"],
    3: ["strategic", "foresight", "market analysis"],
    4: ["digital", "ai", "data", "governance"],
    5: ["implementation", "innovation"],
}


def _guess_field(raw: Optional[str]) -> Optional[int]:
    if not raw:
        return None
    lower = raw.lower()
    for field_id, keywords in FIELD_KEYWORDS.items():
        if any(kw in lower for kw in keywords):
            return field_id
    return None


def _to_date(val) -> Optional[date]:
    if val is None:
        return None
    if isinstance(val, datetime):
        return val.date()
    if isinstance(val, date):
        return val
    return None


def _to_float(val) -> Optional[float]:
    if val is None:
        return None
    try:
        return float(val)
    except (TypeError, ValueError):
        return None


def parse_annex71(session: Session) -> int:
    """Parse the Annex 7.1 Excel file and store PastAllocation records. Returns count imported."""
    if not ANNEX_PATH.exists():
        logger.warning("Annex 7.1 file not found at %s", ANNEX_PATH)
        session.add(ImportLog(
            source="annex71",
            status="error",
            message=f"File not found: {ANNEX_PATH}",
            records_imported=0,
        ))
        session.commit()
        return 0

    try:
        import openpyxl
    except ImportError:
        logger.error("openpyxl not installed")
        session.add(ImportLog(
            source="annex71",
            status="error",
            message="openpyxl not installed",
            records_imported=0,
        ))
        session.commit()
        return 0

    try:
        wb = openpyxl.load_workbook(ANNEX_PATH, read_only=True, data_only=True)
        ws = wb["Contract List"]
    except Exception as e:
        logger.error("Failed to open Annex 7.1: %s", e)
        session.add(ImportLog(
            source="annex71",
            status="error",
            message=str(e),
            records_imported=0,
        ))
        session.commit()
        return 0

    count = 0
    for row in ws.iter_rows(min_row=6, values_only=True):
        contract_title = row[0]
        entity_name_raw = row[1]
        client_name = row[2]
        contract_start = _to_date(row[7])
        contract_end = _to_date(row[8])
        role = row[9]
        contract_value = _to_float(row[10])
        invoiced_by_entity = _to_float(row[12])
        field_raw = row[14]

        if not entity_name_raw or not contract_title:
            continue
        if str(contract_title).startswith("(example do not delete)"):
            continue
        if str(contract_title).startswith("Please insert"):
            continue

        entity_id = match_entity(session, str(entity_name_raw))
        hacs_field = _guess_field(str(field_raw) if field_raw else None)

        session.add(PastAllocation(
            entity_id=entity_id,
            entity_name_raw=str(entity_name_raw),
            client_name=str(client_name) if client_name else "",
            contract_title=str(contract_title),
            supplier_name=None,
            contract_start=contract_start,
            contract_end=contract_end,
            contract_value_eur=contract_value,
            invoiced_by_entity_eur=invoiced_by_entity,
            role=str(role) if role else None,
            hacs_field=hacs_field,
            field_of_expertise=str(field_raw) if field_raw else None,
            framework_reference=None,
            lot_reference=None,
            source_url=None,
            confidence_of_match=1.0 if entity_id is not None else None,
            source="annex71",
        ))
        count += 1

    session.add(ImportLog(
        source="annex71",
        status="ok" if count > 0 else "partial",
        message=f"Imported {count} records from Annex 7.1",
        records_imported=count,
    ))
    session.commit()
    logger.info("Annex 7.1: imported %d records", count)
    return count


def get_status(session: Session) -> dict:
    log = session.exec(
        select(ImportLog)
        .where(ImportLog.source == "annex71")
        .order_by(ImportLog.created_at.desc())  # type: ignore[arg-type]
    ).first()

    records = session.exec(
        select(PastAllocation).where(PastAllocation.source == "annex71")
    ).all()

    return {
        "file_found": ANNEX_PATH.exists(),
        "file_path": str(ANNEX_PATH),
        "records": len(records),
        "last_imported": log.created_at if log else None,
    }
