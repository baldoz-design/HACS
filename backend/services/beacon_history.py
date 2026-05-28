import logging
import urllib.request
import xml.etree.ElementTree as ET
from datetime import date
from typing import Optional

from sqlmodel import Session, select

from backend.models import ImportLog, PastAllocation
from backend.services.entity_matcher import match_entity
from backend.services.ted_search import search_ted

BEACON_REFERENCE = "DIGIT/2020/OP/0005"
BEACON_SOURCE = "beacon_direct"
TED_NOTICE_XML_URL = "https://ted.europa.eu/en/notice/{notice_id}/xml"

logger = logging.getLogger(__name__)

BEACON_QUERIES = [
    'FT~"DIGIT/2020/OP/0005"',
    'FT~"Benchmarking, Advisory and Consultancy Services in Information and Communication Technology"',
]


def _parse_date(raw: Optional[str]) -> Optional[date]:
    if not raw:
        return None
    normalized = raw.strip().replace("Z", "")
    try:
        return date.fromisoformat(normalized[:10])
    except ValueError:
        return None


def _guess_lot(text: str) -> Optional[str]:
    lowered = text.lower()
    if "lot 2" in lowered:
        return "Lot 2"
    if "lot 1" in lowered:
        return "Lot 1"
    return None


def _normalize_lot_reference(raw: Optional[str]) -> Optional[str]:
    if not raw:
        return None
    cleaned = raw.strip()
    if cleaned.isdigit():
        return f"Lot {cleaned}"
    lowered = cleaned.lower()
    if lowered.startswith("lot "):
        return f"Lot {cleaned.split(' ', 1)[1]}"
    return cleaned


def _safe_float(value: Optional[str]) -> Optional[float]:
    if value is None:
        return None
    try:
        return float(str(value).replace(",", "").strip())
    except ValueError:
        return None


def _guess_field(text: str) -> Optional[int]:
    lowered = text.lower()
    keyword_map: dict[int, list[str]] = {
        1: ["it strategy", "governance", "architecture", "cybersecurity", "technology"],
        2: ["benchmarking", "evaluation", "monitoring", "programme", "project management"],
        3: ["transformation", "change management", "operating model", "advisory"],
        4: ["digital", "ai", "data", "analytics", "information communication technology"],
        5: ["audit", "risk", "compliance", "control", "regulatory"],
    }
    scores: dict[int, int] = {}
    for field_id, keywords in keyword_map.items():
        score = sum(1 for keyword in keywords if keyword in lowered)
        if score:
            scores[field_id] = score
    if not scores:
        return None
    return max(scores.items(), key=lambda item: item[1])[0]


def _local_name(tag: str) -> str:
    if "}" in tag:
        return tag.rsplit("}", 1)[-1]
    return tag


def _iter_text(element: ET.Element) -> str:
    return " ".join(part.strip() for part in element.itertext() if part.strip()).strip()


def _first_text(root: ET.Element, tag_name: str) -> Optional[str]:
    for element in root.iter():
        if _local_name(element.tag) == tag_name:
            text = _iter_text(element)
            if text:
                return text
    return None


def _first_text_in_parent(root: ET.Element, parent_tag: str, child_tag: str) -> Optional[str]:
    for parent in root.iter():
        if _local_name(parent.tag) != parent_tag:
            continue
        for child in parent.iter():
            if _local_name(child.tag) != child_tag:
                continue
            text = _iter_text(child)
            if text:
                return text
    return None


def _all_texts(root: ET.Element, tag_name: str) -> list[str]:
    results: list[str] = []
    for element in root.iter():
        if _local_name(element.tag) == tag_name:
            text = _iter_text(element)
            if text:
                results.append(text)
    return results


def _fetch_notice_xml(notice_id: str) -> str:
    url = TED_NOTICE_XML_URL.format(notice_id=notice_id)
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "EU-HACS-Matrix/1.0"},
        method="GET",
    )
    with urllib.request.urlopen(req, timeout=20) as response:
        return response.read().decode("utf-8", errors="replace")


def _parse_notice_title(root: ET.Element, fallback_title: str) -> str:
    for element in root.iter():
        if _local_name(element.tag) == "ML_TI_DOC" and element.attrib.get("LG") == "EN":
            text = _iter_text(element)
            if text:
                if text.startswith("Belgium Brussels "):
                    return text.replace("Belgium Brussels ", "", 1).strip()
                return text
    for tag_name in ("TITLE", "ML_TI_DOC", "OBJECT_CONTRACT"):
        text = _first_text(root, tag_name)
        if text:
            if text.startswith("Belgium Brussels "):
                return text.replace("Belgium Brussels ", "", 1).strip()
            return text
    return fallback_title


def _parse_notice_buyer(root: ET.Element, fallback_buyer: str) -> str:
    for parent_tag in ("ADDRESS_CONTRACTING_BODY", "CONTRACTING_BODY"):
        text = _first_text_in_parent(root, parent_tag, "OFFICIALNAME")
        if text:
            return text
    for tag_name in ("OFFICIALNAME", "ORGANISATION", "NAME"):
        text = _first_text(root, tag_name)
        if text:
            return text
    return fallback_buyer


def _parse_notice_date(root: ET.Element, fallback_date: Optional[str]) -> Optional[str]:
    for tag_name in ("DT_DATE_FOR_SUBMISSION", "DATE_PUBLICATION_NOTICE", "DATE_DISPATCH_NOTICE"):
        text = _first_text(root, tag_name)
        if text and len(text) >= 10:
            return text[:10]
    return fallback_date


def _dedupe_preserve_order(values: list[str]) -> list[str]:
    seen: set[str] = set()
    output: list[str] = []
    for value in values:
        normalized = value.casefold()
        if normalized in seen:
            continue
        seen.add(normalized)
        output.append(value)
    return output


def _parse_award_entries(notice: dict, xml_text: str) -> list[dict]:
    root = ET.fromstring(xml_text)
    title = _parse_notice_title(root, str(notice.get("title") or "").strip())
    buyer = _parse_notice_buyer(root, str(notice.get("client_name") or "").strip())
    publication_date = _parse_notice_date(root, notice.get("publication_date"))
    procedure_ref = _first_text(root, "NO_DOC_OJS") or BEACON_REFERENCE
    fallback_lot = _guess_lot(title)
    fallback_field = _guess_field(title)
    fallback_value = notice.get("contract_value_eur")
    notice_url = str(notice.get("url") or "").strip() or TED_NOTICE_XML_URL.format(
        notice_id=notice["notice_id"]
    ).replace("/xml", "/detail")

    awards: list[dict] = []
    for award in root.iter():
        if _local_name(award.tag) != "AWARD_CONTRACT":
            continue

        suppliers = _dedupe_preserve_order(_all_texts(award, "OFFICIALNAME"))
        lot = _normalize_lot_reference(_first_text(award, "LOT_NO") or fallback_lot)
        contract_number = _first_text(award, "CONTRACT_NO")
        raw_value = _first_text(award, "VAL_TOTAL") or _first_text(award, "VALUES")
        value = _safe_float(raw_value) or fallback_value
        contract_date = _first_text(award, "DATE_CONCLUSION_CONTRACT") or publication_date

        if not suppliers and value is None and not lot:
            continue

        awards.append(
            {
                "title": title,
                "client_name": buyer,
                "publication_date": contract_date,
                "contract_value_eur": value,
                "summary": contract_number,
                "field_guess": fallback_field,
                "lot_reference": lot,
                "supplier_name": ", ".join(suppliers) if suppliers else None,
                "framework_reference": procedure_ref,
                "url": notice_url,
            }
        )

    if awards:
        return awards

    return []


def _is_relevant_beacon_text(*parts: object) -> bool:
    text = " ".join(str(part or "") for part in parts).lower()
    return any(
        needle in text
        for needle in [
            "digit/2020/op/0005",
            "beacon",
            "benchmarking, advisory and consultancy services",
            "information and communication technology",
        ]
    )


def _is_relevant_beacon_notice(notice: dict) -> bool:
    return _is_relevant_beacon_text(
        notice.get("title"),
        notice.get("summary"),
        notice.get("client_name"),
        notice.get("framework_reference"),
    )


def _upsert_notice(session: Session, notice: dict) -> bool:
    title = str(notice.get("title") or "").strip()
    client_name = str(notice.get("client_name") or "").strip()
    supplier_name = str(notice.get("supplier_name") or "").strip() or None
    lot_reference = _normalize_lot_reference(str(notice.get("lot_reference") or "").strip() or None)
    url = notice.get("url")
    existing = session.exec(
        select(PastAllocation).where(
            PastAllocation.source == BEACON_SOURCE,
            PastAllocation.contract_title == title,
            PastAllocation.client_name == client_name,
            PastAllocation.supplier_name == supplier_name,
            PastAllocation.lot_reference == lot_reference,
        )
    ).first()

    entity_id = match_entity(session, client_name) if client_name else None
    payload = {
        "entity_id": entity_id,
        "entity_name_raw": client_name or title,
        "client_name": client_name,
        "contract_title": title,
        "supplier_name": supplier_name,
        "contract_start": _parse_date(notice.get("publication_date")),
        "contract_end": None,
        "contract_value_eur": notice.get("contract_value_eur"),
        "invoiced_by_entity_eur": None,
        "role": "historical framework award",
        "hacs_field": notice.get("field_guess") or _guess_field(f"{title} {notice.get('summary') or ''}"),
        "field_of_expertise": notice.get("summary") or None,
        "framework_reference": notice.get("framework_reference") or BEACON_REFERENCE,
        "lot_reference": lot_reference or _guess_lot(f"{title} {notice.get('summary') or ''}"),
        "source_url": url,
        "confidence_of_match": 0.98 if supplier_name and notice.get("contract_value_eur") else 0.9,
        "source": BEACON_SOURCE,
    }

    if existing:
        for key, value in payload.items():
            setattr(existing, key, value)
        session.add(existing)
        return False

    session.add(PastAllocation(**payload))
    return True


def sync_beacon_history(session: Session, max_results_per_query: int = 12) -> dict:
    existing_rows = session.exec(
        select(PastAllocation).where(PastAllocation.source == BEACON_SOURCE)
    ).all()
    for row in existing_rows:
        session.delete(row)
    if existing_rows:
        session.commit()

    imported = 0
    deduped: set[str] = set()
    notices_found = 0
    award_rows_found = 0

    for query in BEACON_QUERIES:
        try:
            notices = search_ted(session, query, max_results=max_results_per_query)
        except Exception as exc:
            session.add(ImportLog(
                source=BEACON_SOURCE,
                status="partial",
                message=f"BEACON sync skipped query {query}: {exc}",
                records_imported=imported,
            ))
            session.commit()
            continue

        for notice in notices:
            notice_id = str(notice.get("notice_id") or "").strip()
            if not notice_id:
                continue

            key = notice_id or str(notice.get("url") or notice.get("title"))
            if key in deduped:
                continue
            deduped.add(key)
            notices_found += 1

            try:
                xml_text = _fetch_notice_xml(notice_id)
                award_entries = _parse_award_entries(notice, xml_text)
            except Exception as exc:
                logger.warning("Failed to enrich BEACON notice %s: %s", notice_id, exc)
                award_entries = []

            if not award_entries:
                continue

            award_entries = [
                award_entry
                for award_entry in award_entries
                if _is_relevant_beacon_notice(award_entry)
            ]
            if not award_entries:
                continue

            award_rows_found += len(award_entries)
            for award_entry in award_entries:
                if _upsert_notice(session, award_entry):
                    imported += 1

    session.add(ImportLog(
        source=BEACON_SOURCE,
        status="ok",
        message=f"Synced {notices_found} BEACON notices and {award_rows_found} award rows",
        records_imported=imported,
    ))
    session.commit()

    matched_entities = session.exec(
        select(PastAllocation).where(
            PastAllocation.source == BEACON_SOURCE,
            PastAllocation.entity_id.is_not(None),
        )
    ).all()

    return {
        "records_imported": imported,
        "notices_found": notices_found,
        "award_rows_found": award_rows_found,
        "matched_entities": len(matched_entities),
    }


def beacon_status(session: Session) -> dict:
    records = session.exec(
        select(PastAllocation).where(PastAllocation.source == BEACON_SOURCE)
    ).all()
    latest_log = session.exec(
        select(ImportLog)
        .where(ImportLog.source == BEACON_SOURCE)
        .order_by(ImportLog.created_at.desc())  # type: ignore[arg-type]
    ).first()
    return {
        "records": len(records),
        "last_synced": latest_log.created_at if latest_log else None,
        "framework_reference": BEACON_REFERENCE,
    }
