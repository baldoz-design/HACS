import json
import logging
import time
import urllib.error
import urllib.request
from datetime import datetime, timedelta
from typing import Optional

from sqlmodel import Session, select

from backend.models import Entity, ImportRawCache

logger = logging.getLogger(__name__)

TED_API = "https://api.ted.europa.eu/v3/notices/search"
CACHE_TTL_HOURS = 24
TIMEOUT_SECONDS = 15
MAX_RETRIES = 3
RETRY_DELAY_SECONDS = 1.5

TED_FIELDS = [
    "publication-number",
    "publication-date",
    "notice-title",
    "BT-21-Procedure",
    "description-glo",
    "buyer-name",
    "organisation-name-buyer",
    "main-classification-lot",
    "main-classification-proc",
    "additional-classification-lot",
    "additional-classification-proc",
    "estimated-value-lot",
    "estimated-value-proc",
    "framework-maximum-value-lot",
    "framework-maximum-value-glo",
    "tender-value",
    "tender-value-lowest",
    "tender-value-highest",
]

HACS_CPV_ROOTS = ["72000000", "73000000", "79000000"]
HACS_CPV_PREFIXES = tuple(root[:2] for root in HACS_CPV_ROOTS)
CPV_QUERY_FIELDS = [
    "main-classification-lot",
    "main-classification-proc",
    "additional-classification-lot",
    "additional-classification-proc",
]
CPV_PAYLOAD_FIELDS = CPV_QUERY_FIELDS + [
    "BT-262-Lot",
    "BT-262-Procedure",
    "BT-263-Lot",
    "BT-263-Procedure",
]

FIELD_KEYWORDS: dict[int, list[str]] = {
    1: [
        "it strategy",
        "governance",
        "architecture",
        "cybersecurity",
        "technology",
        "informatics",
    ],
    2: [
        "programme",
        "program",
        "project management",
        "pmo",
        "portfolio",
        "delivery",
    ],
    3: [
        "transformation",
        "change management",
        "operating model",
        "organisation",
        "organizational",
        "adoption",
    ],
    4: [
        "digital",
        "ai",
        "artificial intelligence",
        "data",
        "analytics",
        "business intelligence",
        "information systems",
    ],
    5: [
        "audit",
        "risk",
        "compliance",
        "control",
        "assurance",
        "regulatory",
    ],
}


def _guess_field(text: str) -> Optional[int]:
    lower = text.lower()
    scores: dict[int, int] = {}
    for field_id, keywords in FIELD_KEYWORDS.items():
        score = sum(1 for keyword in keywords if keyword in lower)
        if score:
            scores[field_id] = score
    if not scores:
        return None
    return max(scores.items(), key=lambda item: item[1])[0]


def _get_cache(session: Session, key: str) -> Optional[dict]:
    row = session.exec(
        select(ImportRawCache).where(ImportRawCache.cache_key == key)
    ).first()
    if not row:
        return None
    age = datetime.utcnow() - row.created_at
    if age > timedelta(hours=CACHE_TTL_HOURS):
        session.delete(row)
        session.commit()
        return None
    return json.loads(row.response_json)


def _set_cache(session: Session, key: str, data: dict) -> None:
    existing = session.exec(
        select(ImportRawCache).where(ImportRawCache.cache_key == key)
    ).first()
    payload = json.dumps(data)
    if existing:
        existing.response_json = payload
        existing.created_at = datetime.utcnow()
        session.add(existing)
    else:
        session.add(ImportRawCache(cache_key=key, response_json=payload))
    session.commit()


def _safe_float(value: object) -> Optional[float]:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _stringify(value: object) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value
    if isinstance(value, list):
        parts = [_stringify(item) for item in value]
        return " ".join(part for part in parts if part).strip()
    if isinstance(value, dict):
        for key in ("eng", "en", "value", "text"):
            inner = value.get(key)
            if inner:
                return _stringify(inner)
        parts = [_stringify(item) for item in value.values()]
        return " ".join(part for part in parts if part).strip()
    return str(value)


def _flatten_values(value: object) -> list[object]:
    if value is None:
        return []
    if isinstance(value, list):
        values: list[object] = []
        for item in value:
            values.extend(_flatten_values(item))
        return values
    if isinstance(value, dict):
        values: list[object] = []
        for item in value.values():
            values.extend(_flatten_values(item))
        return values
    return [value]


def _numeric_values(value: object) -> list[float]:
    numbers: list[float] = []
    for item in _flatten_values(value):
        number = _safe_float(item)
        if number is not None:
            numbers.append(number)
    return numbers


def _first_number(*values: object) -> Optional[float]:
    for value in values:
        numbers = _numeric_values(value)
        positive_numbers = [number for number in numbers if number > 0]
        if positive_numbers:
            return positive_numbers[0]
    return None


def _string_values(*values: object) -> list[str]:
    strings: list[str] = []
    for value in values:
        for item in _flatten_values(value):
            text = _stringify(item).strip()
            if text:
                strings.append(text)
    return strings


def _sanitize_summary(description: str, buyer: str, title: str) -> str:
    cleaned = " ".join(description.split()).strip()
    if not cleaned:
        return ""

    european_mentions = cleaned.count("European ")
    punctuation_count = sum(cleaned.count(mark) for mark in ".;:")
    looks_like_buyer_list = (
        european_mentions >= 4 and punctuation_count <= 2
    ) or cleaned.startswith(buyer)

    if looks_like_buyer_list:
        return ""

    if cleaned.casefold() == title.casefold():
        return ""

    if len(cleaned) > 280:
        snippet = cleaned[:277].rsplit(" ", 1)[0].strip()
        return f"{snippet}..."
    return cleaned


def _ted_post(session: Session, payload: dict) -> dict:
    cache_key = f"ted:v3:{json.dumps(payload, sort_keys=True)}"
    cached = _get_cache(session, cache_key)
    if cached is not None:
        return cached

    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        TED_API,
        data=body,
        headers={
            "Accept": "application/json",
            "Content-Type": "application/json",
            "User-Agent": "EU-HACS-Matrix/1.0",
        },
        method="POST",
    )

    last_error: Optional[Exception] = None
    for attempt in range(MAX_RETRIES):
        try:
            with urllib.request.urlopen(req, timeout=TIMEOUT_SECONDS) as resp:
                raw = json.loads(resp.read())
            _set_cache(session, cache_key, raw)
            return raw
        except urllib.error.HTTPError as exc:
            last_error = exc
            if exc.code == 429 and attempt < MAX_RETRIES - 1:
                time.sleep(RETRY_DELAY_SECONDS * (attempt + 1))
                continue
            logger.error("TED API HTTP error %s for payload %s", exc.code, payload)
            break
        except Exception as exc:  # pragma: no cover - safety net for network edge cases
            last_error = exc
            logger.error("TED API request failed for payload %s: %s", payload, exc)
            break

    if last_error:
        raise last_error
    return {}


def _normalize_notice(raw: dict) -> dict:
    title = _stringify(raw.get("BT-21-Procedure") or raw.get("notice-title") or raw.get("title"))
    description = _stringify(raw.get("description-glo") or raw.get("description"))
    buyer = _stringify(raw.get("organisation-name-buyer") or raw.get("buyer-name") or raw.get("buyer"))
    publication_number = _stringify(
        raw.get("publication-number")
        or raw.get("notice-id")
        or raw.get("publicationNumber")
        or raw.get("noticeId")
    )
    publication_date = _stringify(
        raw.get("publication-date") or raw.get("publicationDate")
    )
    summary = _sanitize_summary(description, buyer, title)
    field_guess = _guess_field(f"{title} {description}")
    cpv_codes = _string_values(*(raw.get(field) for field in CPV_PAYLOAD_FIELDS))
    estimated_value_eur = _first_number(
        raw.get("estimated-value-lot"),
        raw.get("estimated-value-proc"),
        raw.get("framework-maximum-value-lot"),
        raw.get("framework-maximum-value-glo"),
    )
    award_value_eur = _first_number(
        raw.get("tender-value"),
        raw.get("tender-value-lowest"),
        raw.get("tender-value-highest"),
    )

    return {
        "notice_id": publication_number,
        "title": title or "Untitled TED notice",
        "entity_name": "",
        "client_name": buyer,
        "contract_value_eur": award_value_eur or estimated_value_eur,
        "estimated_value_eur": estimated_value_eur,
        "award_value_eur": award_value_eur,
        "cpv_codes": cpv_codes,
        "publication_date": publication_date or None,
        "field_guess": field_guess,
        "summary": summary,
        "url": (
            f"https://ted.europa.eu/en/notice/-/detail/{publication_number}"
            if publication_number
            else None
        ),
    }


def _extract_notice_rows(raw: dict) -> list[dict]:
    candidates = raw.get("results") or raw.get("notices") or raw.get("items") or []
    if isinstance(candidates, dict):
        candidates = candidates.get("results") or candidates.get("notices") or []
    return [item for item in candidates if isinstance(item, dict)]


def _notice_year(notice: dict) -> Optional[int]:
    publication_date = str(notice.get("publication_date") or "")
    if len(publication_date) < 4:
        return None
    try:
        return int(publication_date[:4])
    except ValueError:
        return None


def _is_hacs_cpv_notice(notice: dict) -> bool:
    return any(
        code.startswith(HACS_CPV_PREFIXES)
        for code in _string_values(notice.get("cpv_codes"))
    )


def _build_search_payload(query: str, max_results: int, page: int = 1) -> dict:
    return {
        "query": query,
        "limit": min(max_results, 50),
        "page": page,
        "fields": TED_FIELDS,
    }


def _fetch_all_notices_for_query(
    session: Session,
    query: str,
    *,
    page_size: int = 50,
    max_pages: int = 20,
) -> list[dict]:
    notices: list[dict] = []
    for page in range(1, max_pages + 1):
        raw = _ted_post(session, _build_search_payload(query, page_size, page=page))
        rows = _extract_notice_rows(raw)
        if not rows:
            break
        notices.extend(_normalize_notice(item) for item in rows)
        total = int(raw.get("totalNoticeCount") or 0)
        if total and len(notices) >= total:
            break
        if len(rows) < page_size:
            break
        time.sleep(0.2)
    return notices


def search_ted(session: Session, query: str, max_results: int = 20) -> list[dict]:
    """Free-text TED search used by the import screen."""
    raw = _ted_post(session, _build_search_payload(query, max_results))
    notices = [_normalize_notice(item) for item in _extract_notice_rows(raw)]
    return notices[:max_results]


def build_buyer_queries(entity: Entity, aliases: list[str]) -> list[str]:
    names: list[str] = []
    seen: set[str] = set()
    for candidate in aliases + [entity.name]:
        normalized = candidate.strip()
        if not normalized:
            continue
        key = normalized.casefold()
        if key in seen:
            continue
        seen.add(key)
        names.append(normalized)
    cpv_filter = " OR ".join(
        f"{field}={root}"
        for field in CPV_QUERY_FIELDS
        for root in HACS_CPV_ROOTS
    )
    return [f'organisation-name-buyer="{name}" AND ({cpv_filter})' for name in names]


def search_ted_for_entity(
    session: Session,
    entity: Entity,
    aliases: list[str],
    max_results: int = 8,
) -> list[dict]:
    intelligence = search_ted_intelligence_for_entity(
        session,
        entity,
        aliases,
        display_limit=max_results,
    )
    return intelligence["notices"]


def search_ted_intelligence_for_entity(
    session: Session,
    entity: Entity,
    aliases: list[str],
    display_limit: int = 8,
) -> dict:
    notices_by_id: dict[str, dict] = {}
    for query in build_buyer_queries(entity, aliases):
        try:
            notices = _fetch_all_notices_for_query(session, query)
        except Exception:
            continue
        for notice in notices:
            notice["entity_name"] = entity.name
            if notice["notice_id"]:
                notices_by_id.setdefault(notice["notice_id"], notice)
        time.sleep(0.2)

    all_notices = list(notices_by_id.values())
    cpv_notices = [notice for notice in all_notices if _is_hacs_cpv_notice(notice)]
    recent_notices = [
        notice for notice in cpv_notices if (_notice_year(notice) or 0) >= 2025
    ]
    historical_notices = [
        notice
        for notice in cpv_notices
        if (_notice_year(notice) or 0) < 2025
    ]

    mode = "cpv_filtered"
    selected_notices = cpv_notices
    historical_count = len(historical_notices)

    selected_notices.sort(key=lambda item: item.get("publication_date") or "", reverse=True)
    return {
        "notices": selected_notices[:display_limit],
        "analysis_notices": selected_notices,
        "mode": mode,
        "recent_count": len(recent_notices),
        "historical_count": historical_count,
        "total_examined": len(all_notices),
        "cpv_filtered_count": len(cpv_notices),
        "cpv_prefixes": list(HACS_CPV_PREFIXES),
    }
