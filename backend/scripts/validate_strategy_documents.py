"""Validate non-DG strategy document candidates.

The candidate catalog is intentionally conservative: some rows are already
verified, while others only point to a generic publication page. This script
checks source/PDF reachability, tries to resolve missing PDF links from official
pages, and writes an auditable validation report for the future strategy page.
"""

from __future__ import annotations

import html
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urljoin, urlparse

import requests

ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "data"
INPUT_FILE = DATA_DIR / "strategy_documents_candidates.json"
OUTPUT_FILE = DATA_DIR / "strategy_documents_validation.json"

HEADERS = {"User-Agent": "EU-HACS-Matrix/0.1"}
TIMEOUT = 25

PDF_LINK_RE = re.compile(r'href=["\'](?P<href>[^"\']+(?:\.pdf|/document/download/)[^"\']*)["\']', re.IGNORECASE)
TITLE_RE = re.compile(r"<title[^>]*>(?P<title>.*?)</title>", re.IGNORECASE | re.DOTALL)


def normalize_text(value: str) -> str:
    value = html.unescape(value).lower()
    value = re.sub(r"[^a-z0-9]+", " ", value)
    return re.sub(r"\s+", " ", value).strip()


def host(value: str) -> str:
    return urlparse(value).hostname or ""


def is_official_candidate_pdf(source_url: str, pdf_url: str) -> bool:
    source_host = host(source_url).replace("www.", "")
    pdf_host = host(pdf_url).replace("www.", "")
    if not source_host or not pdf_host:
        return False
    if pdf_host == source_host or pdf_host.endswith(f".{source_host}"):
        return True
    if source_host.endswith("europa.eu") and pdf_host.endswith("europa.eu"):
        return True
    return False


def request_url(url: str) -> dict[str, Any]:
    if not url:
        return {
            "ok": False,
            "status_code": None,
            "content_type": "",
            "final_url": "",
            "error": "missing_url",
        }
    try:
        response = requests.get(url, timeout=TIMEOUT, headers=HEADERS, allow_redirects=True)
        return {
            "ok": 200 <= response.status_code < 400,
            "status_code": response.status_code,
            "content_type": response.headers.get("content-type", ""),
            "final_url": response.url,
            "error": "",
            "body": response.text if "text/html" in response.headers.get("content-type", "") else "",
        }
    except requests.RequestException as exc:
        return {
            "ok": False,
            "status_code": None,
            "content_type": "",
            "final_url": "",
            "error": str(exc),
        }


def page_title(body: str) -> str:
    match = TITLE_RE.search(body)
    if not match:
        return ""
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<.*?>", " ", match.group("title")))).strip()


def candidate_pdf_score(record: dict[str, Any], url: str, link_text: str = "") -> int:
    normalized = normalize_text(" ".join([
        url,
        link_text,
        record.get("acronym", ""),
        record.get("document_title", ""),
        record.get("document_type", ""),
        record.get("year_or_period", ""),
    ]))
    score = 0
    for token in [record.get("acronym", ""), record.get("full_name", "")]:
        normalized_token = normalize_text(token)
        if normalized_token and normalized_token in normalized:
            score += 4
    for token in ("2026", "2028", "single programming", "programming document", "work programme", "work program", "annual work"):
        if token in normalized:
            score += 2
    if "draft" in normalized:
        score -= 3
    if "2025" in normalized and "2026" not in normalized:
        score -= 2
    return score


def resolve_pdf_from_source(record: dict[str, Any], source_result: dict[str, Any]) -> dict[str, Any] | None:
    body = source_result.get("body") or ""
    source_url = source_result.get("final_url") or record.get("source_url", "")
    if not body or not source_url:
        return None

    matches = []
    for match in PDF_LINK_RE.finditer(body):
        href = html.unescape(match.group("href"))
        pdf_url = urljoin(source_url, href)
        context = body[max(0, match.start() - 160): match.end() + 160]
        link_text = re.sub(r"<.*?>", " ", context)
        matches.append(
            {
                "url": pdf_url,
                "score": candidate_pdf_score(record, pdf_url, link_text),
            }
        )
    matches = sorted(matches, key=lambda item: item["score"], reverse=True)
    return matches[0] if matches and matches[0]["score"] > 0 else None


def recommended_status(
    record: dict[str, Any],
    source_result: dict[str, Any],
    pdf_result: dict[str, Any],
    resolved_pdf: dict[str, Any] | None,
) -> str:
    if record.get("integration_status") == "exclude_or_special_case":
        return "exclude_or_special_case"

    source_ok = source_result["ok"]
    pdf_url = record.get("pdf_url") or (resolved_pdf or {}).get("url", "")
    pdf_ok = pdf_result["ok"] if record.get("pdf_url") else bool(resolved_pdf)
    official_pdf = is_official_candidate_pdf(record.get("source_url", ""), pdf_url)
    source_host = host(record.get("source_url", ""))
    has_official_source = bool(record.get("source_url")) and (
        "europa.eu" in source_host
        or source_host.endswith(".eu")
        or source_host in {"www.eib.org", "eib.org"}
    )

    if source_ok and pdf_ok and official_pdf and record.get("confidence") == "High":
        return "verified"
    if source_ok and (pdf_ok or resolved_pdf):
        return "candidate"
    if source_ok:
        return "candidate"
    if has_official_source and record.get("integration_status") in {"candidate", "verified"}:
        return "candidate"
    return "needs_manual_review"


def validate_record(record: dict[str, Any]) -> dict[str, Any]:
    source_result = request_url(record.get("source_url", ""))
    pdf_result = request_url(record.get("pdf_url", "")) if record.get("pdf_url") else {
        "ok": False,
        "status_code": None,
        "content_type": "",
        "final_url": "",
        "error": "missing_pdf_url",
    }
    resolved_pdf = resolve_pdf_from_source(record, source_result) if not record.get("pdf_url") else None

    pdf_url = record.get("pdf_url") or (resolved_pdf or {}).get("url", "")
    status = recommended_status(record, source_result, pdf_result, resolved_pdf)

    return {
        "entity_id": record["entity_id"],
        "acronym": record["acronym"],
        "full_name": record["full_name"],
        "document_type": record["document_type"],
        "document_title": record["document_title"],
        "confidence": record["confidence"],
        "previous_status": record["integration_status"],
        "recommended_status": status,
        "source_url": record.get("source_url", ""),
        "source_ok": source_result["ok"],
        "source_status_code": source_result["status_code"],
        "source_final_url": source_result["final_url"],
        "source_page_title": page_title(source_result.get("body", "")),
        "pdf_url": pdf_url,
        "pdf_ok": pdf_result["ok"] if record.get("pdf_url") else bool(resolved_pdf),
        "pdf_status_code": pdf_result["status_code"],
        "pdf_content_type": pdf_result["content_type"],
        "pdf_official_domain": is_official_candidate_pdf(record.get("source_url", ""), pdf_url),
        "resolved_pdf_url": (resolved_pdf or {}).get("url", ""),
        "resolved_pdf_score": (resolved_pdf or {}).get("score"),
        "validation_notes": [
            note for note in [
                "" if source_result["ok"] else f"source_error={source_result['error'] or source_result['status_code']}",
                "" if record.get("pdf_url") else "pdf_url_missing",
                "" if not resolved_pdf else "resolved_pdf_candidate_from_source",
                "" if is_official_candidate_pdf(record.get("source_url", ""), pdf_url) or not pdf_url else "pdf_domain_differs_from_source",
            ]
            if note
        ],
    }


def main() -> int:
    catalog = json.loads(INPUT_FILE.read_text())
    results = []
    for index, record in enumerate(catalog["records"], start=1):
        print(f"[{index}/{len(catalog['records'])}] {record['acronym']} {record['document_type']}")
        results.append(validate_record(record))

    status_counts: dict[str, int] = {}
    for result in results:
        status_counts[result["recommended_status"]] = status_counts.get(result["recommended_status"], 0) + 1

    payload = {
        "source": INPUT_FILE.name,
        "validated_at": datetime.now(timezone.utc).isoformat(),
        "records_validated": len(results),
        "recommended_status_counts": status_counts,
        "records": results,
    }
    OUTPUT_FILE.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n")
    print(f"Wrote validation report to {OUTPUT_FILE}")
    print(json.dumps(status_counts, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
