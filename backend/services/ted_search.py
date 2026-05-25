import json
import logging
from datetime import datetime, timedelta
from typing import Optional

import urllib.request
import urllib.parse

from sqlmodel import Session, select

from models import ImportRawCache

logger = logging.getLogger(__name__)

TED_API = "https://api.ted.europa.eu/v3/notices/search"
CACHE_TTL_HOURS = 24
TIMEOUT_SECONDS = 8

FIELD_KEYWORDS: dict[int, list[str]] = {
    1: ["legal", "regulatory"],
    2: ["evaluation", "monitoring", "benchmarking"],
    3: ["strategic", "foresight"],
    4: ["digital", "ai", "data", "governance"],
    5: ["implementation", "innovation"],
}


def _guess_field(text: str) -> Optional[int]:
    lower = text.lower()
    for field_id, keywords in FIELD_KEYWORDS.items():
        if any(kw in lower for kw in keywords):
            return field_id
    return None


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
    if existing:
        existing.response_json = json.dumps(data)
        existing.created_at = datetime.utcnow()
        session.add(existing)
    else:
        session.add(ImportRawCache(cache_key=key, response_json=json.dumps(data)))
    session.commit()


def search_ted(session: Session, query: str, max_results: int = 20) -> list[dict]:
    """Search TED API v3 for notices. Returns list of notice dicts."""
    cache_key = f"ted:{query}:{max_results}"
    cached = _get_cache(session, cache_key)
    if cached is not None:
        return cached.get("notices", [])

    params = urllib.parse.urlencode({
        "q": query,
        "pageSize": min(max_results, 100),
        "page": 1,
        "fields": "notice-id,title,contracting-authority-name,value-amount,publication-date",
    })
    url = f"{TED_API}?{params}"

    try:
        req = urllib.request.Request(
            url,
            headers={"Accept": "application/json", "User-Agent": "HACS-Intelligence/1.0"},
        )
        with urllib.request.urlopen(req, timeout=TIMEOUT_SECONDS) as resp:
            raw = json.loads(resp.read())
    except Exception as e:
        logger.error("TED API error: %s", e)
        return []

    notices_raw = raw.get("notices", raw.get("results", []))
    notices = []
    for n in notices_raw[:max_results]:
        title = n.get("title", {})
        title_text = (
            title.get("eng", "") or title.get("en", "")
            if isinstance(title, dict)
            else str(title or "")
        )
        notices.append({
            "notice_id": str(n.get("notice-id", n.get("noticeId", ""))),
            "title": title_text,
            "entity_name": "",
            "client_name": str(n.get("contracting-authority-name", "") or ""),
            "contract_value_eur": _safe_float(n.get("value-amount")),
            "publication_date": str(n.get("publication-date", "") or ""),
            "field_guess": _guess_field(title_text),
        })

    _set_cache(session, cache_key, {"notices": notices})
    return notices


def _safe_float(val) -> Optional[float]:
    if val is None:
        return None
    try:
        return float(val)
    except (TypeError, ValueError):
        return None
