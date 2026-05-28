"""Analyze verified non-DG strategy documents into product-ready signals.

This extends the management-plan extraction approach to non-DG entities whose
2026 strategy source is a Single Programming Document, Annual Work Programme,
Programming Document, or Work Programme and Budget.
"""

from __future__ import annotations

import json
import logging
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import analyze_management_plans as mp

ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "data"
CATALOG_FILE = DATA_DIR / "strategy_documents_candidates.json"
VALIDATION_FILE = DATA_DIR / "strategy_documents_validation.json"
OUTPUT_FILE = DATA_DIR / "strategy_document_analysis.json"
TEXT_CACHE_DIR = DATA_DIR / "strategy_document_text"
MAX_PAGES_ANALYZED = 80

logging.getLogger("pdfminer").setLevel(logging.ERROR)


def source_quality(record: dict[str, Any], validation: dict[str, Any] | None) -> dict[str, Any]:
    validation_status = validation.get("recommended_status") if validation else "unknown"
    return {
        "integration_status": record.get("integration_status"),
        "validation_status": validation_status,
        "confidence": record.get("confidence"),
        "source_ok": validation.get("source_ok") if validation else None,
        "pdf_ok": validation.get("pdf_ok") if validation else None,
        "pdf_official_domain": validation.get("pdf_official_domain") if validation else None,
        "notes": validation.get("validation_notes", []) if validation else [],
    }


def extract_pages(record: dict[str, Any]) -> list[dict[str, Any]]:
    if not record.get("pdf_url"):
        return []

    TEXT_CACHE_DIR.mkdir(exist_ok=True)
    cache_file = TEXT_CACHE_DIR / f"{record.get('acronym') or mp.cache_key(record['pdf_url'])}.json"
    if cache_file.exists():
        return json.loads(cache_file.read_text())

    pdf_bytes = mp.download_pdf(record["pdf_url"])
    temp_pdf = TEXT_CACHE_DIR / f"{mp.cache_key(record['pdf_url'])}.pdf"
    temp_pdf.write_bytes(pdf_bytes)
    pages: list[dict[str, Any]] = []
    try:
        import pdfplumber

        with pdfplumber.open(str(temp_pdf)) as pdf:
            for index, page in enumerate(pdf.pages[:MAX_PAGES_ANALYZED], start=1):
                text = page.extract_text() or ""
                pages.append({"page": index, "text": text})
    finally:
        temp_pdf.unlink(missing_ok=True)

    cache_file.write_text(json.dumps(pages, ensure_ascii=False))
    return pages


def extract_objectives(full_text: str, fields: dict[str, dict[str, Any]]) -> list[dict[str, Any]]:
    objectives = mp.extract_objectives(full_text, fields)
    if objectives:
        return objectives

    objective_markers = (
        "strategic objective",
        "specific objective",
        "main objective",
        "priority",
        "strategic priority",
        "work programme objective",
    )
    candidates = []
    for sentence in mp.sentence_split(full_text[:80_000]):
        lowered = sentence.lower()
        if not any(marker in lowered for marker in objective_markers):
            continue
        field = mp.dominant_field(sentence, fields)
        priority = mp.match_priority(sentence)
        if not field and not priority:
            continue
        candidates.append(
            {
                "code": "",
                "title": mp.short_text(sentence, 220),
                "hacs_field": field,
                "ec_priority": priority,
                "evidence": mp.short_text(sentence, 420),
            }
        )
    return mp.dedupe_by_key(candidates, "title")[:12]


def infer_needs(
    actions: list[dict[str, Any]],
    objectives: list[dict[str, Any]],
    fields: dict[str, dict[str, Any]],
) -> list[dict[str, Any]]:
    needs = mp.infer_needs(actions, objectives, fields)
    for need in needs:
        need["need"] = need["need"].replace("2026 management plan", "2026 strategy document")
    return needs


def analyze_record(
    record: dict[str, Any],
    validation_by_entity_id: dict[int, dict[str, Any]],
    fields: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    pages = extract_pages(record)
    full_text = "\n".join(page["text"] for page in pages)
    objectives = extract_objectives(full_text, fields)
    actions = mp.extract_actions(pages, fields)
    field_scores = mp.score_fields(full_text, fields)
    top_fields = [
        {"field": int(field_id), "score": score}
        for field_id, score in sorted(field_scores.items(), key=lambda item: item[1], reverse=True)
        if score > 0
    ][:3]

    return {
        "entity_id": record["entity_id"],
        "entity_acronym": record["acronym"],
        "entity_name": record["full_name"],
        "entity_type": record["entity_type"],
        "document_type": record["document_type"],
        "title": record["document_title"],
        "source_url": record["source_url"],
        "pdf_url": record["pdf_url"],
        "publication_date": record["publication_date"],
        "pages_analyzed": len(pages),
        "source_quality": source_quality(record, validation_by_entity_id.get(record["entity_id"])),
        "mission_context": mp.extract_mission_context(full_text),
        "objectives": objectives,
        "actions": actions,
        "action_themes": mp.synthesize_action_themes(actions, objectives),
        "needs": infer_needs(actions, objectives, fields),
        "top_hacs_fields": top_fields,
    }


def main() -> int:
    catalog = json.loads(CATALOG_FILE.read_text())
    validation = json.loads(VALIDATION_FILE.read_text()) if VALIDATION_FILE.exists() else {"records": []}
    validation_by_entity_id = {record["entity_id"]: record for record in validation["records"]}
    fields = mp.load_field_keywords()
    records = [
        record for record in catalog["records"]
        if record.get("integration_status") == "verified" and record.get("pdf_url")
    ]

    analyses = []
    for index, record in enumerate(records, start=1):
        print(f"[{index}/{len(records)}] {record['acronym']} {record['document_title']}")
        try:
            analyses.append(analyze_record(record, validation_by_entity_id, fields))
        except Exception as exc:
            analyses.append(
                {
                    "entity_id": record["entity_id"],
                    "entity_acronym": record["acronym"],
                    "entity_name": record["full_name"],
                    "entity_type": record["entity_type"],
                    "document_type": record["document_type"],
                    "title": record["document_title"],
                    "source_url": record["source_url"],
                    "pdf_url": record["pdf_url"],
                    "publication_date": record["publication_date"],
                    "pages_analyzed": 0,
                    "source_quality": source_quality(record, validation_by_entity_id.get(record["entity_id"])),
                    "mission_context": "",
                    "objectives": [],
                    "actions": [],
                    "action_themes": [],
                    "needs": [],
                    "top_hacs_fields": [],
                    "analysis_error": str(exc),
                }
            )

    payload = {
        "source": "Verified non-DG strategy documents PDF analysis",
        "source_catalog": CATALOG_FILE.name,
        "validation_catalog": VALIDATION_FILE.name,
        "year": catalog["year"],
        "analyzed_at": datetime.now(timezone.utc).isoformat(),
        "records_analyzed": len(analyses),
        "records": analyses,
    }
    OUTPUT_FILE.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n")
    print(f"Wrote {len(analyses)} analyzed strategy documents to {OUTPUT_FILE}.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
