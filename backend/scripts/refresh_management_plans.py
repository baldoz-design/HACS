"""Refresh the local European Commission management plans catalog.

The Commission publishes management plans as public Drupal publication pages.
This script crawls the official index, keeps 2026 management plans, resolves the
PDF link for each publication, and maps records to local entities when possible.
"""

from __future__ import annotations

import html
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urljoin

import requests

ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "data"
ENTITY_FILE = DATA_DIR / "entities.json"
OUTPUT_FILE = DATA_DIR / "management_plans.json"

BASE_URL = "https://commission.europa.eu"
INDEX_URL = f"{BASE_URL}/strategy-and-policy/strategy-documents/management-plans_en"
TARGET_YEAR = 2026

PUBLICATION_RE = re.compile(
    r'<li class="ecl-content-block__primary-meta-item">Management plan</li>'
    r".*?<time datetime=\"(?P<datetime>[^\"]+)\">(?P<date>.*?)</time>"
    r"(?P<meta>.*?)"
    r'<div class="ecl-content-block__title"><a\s+href="(?P<href>[^"]+)".*?>(?P<title>.*?)</a></div>'
    r".*?"
    r'<div class="ecl-content-block__description"><p>(?P<description>.*?)</p></div>',
    re.DOTALL,
)
META_ITEM_RE = re.compile(r'<li class="ecl-content-block__primary-meta-item">(?P<value>.*?)</li>', re.DOTALL)
PDF_RE = re.compile(r'(?P<href>/document/download/[^"\s<>]+?\.pdf)')

ENTITY_ALIASES: dict[str, str] = {
    "agriculture and rural development": "DG_AGRI",
    "budget": "DG_BUDG",
    "climate action": "DG_CLIMA",
    "communications networks content and technology": "DG_CONNECT",
    "communication": "DG_COMM",
    "competition": "DG_COMP",
    "defence industry and space": "DG_DEFIS",
    "digital services": "DG_DIGIT",
    "informatics": "DG_DIGIT",
    "education and culture": "DG_EAC",
    "education youth sport and culture": "DG_EAC",
    "economic and financial affairs": "DG_ECFIN",
    "employment social affairs and inclusion": "DG_EMPL",
    "energy": "DG_ENER",
    "environment": "DG_ENV",
    "financial stability financial services and capital markets union": "DG_FISMA",
    "financial stability, financial services and capital markets union": "DG_FISMA",
    "health and food safety": "DG_SANTE",
    "human resources and security": "DG_HR",
    "internal market industry entrepreneurship and smes": "DG_GROW",
    "interpretation": "DG_SCIC",
    "justice and consumers": "DG_JUST",
    "maritime affairs and fisheries": "DG_MARE",
    "migration and home affairs": "DG_HOME",
    "mobility and transport": "DG_MOVE",
    "regional and urban policy": "DG_REGIO",
    "research and innovation": "DG_RTD",
    "taxation and customs union": "DG_TAXUD",
    "trade": "DG_TRADE",
    "translation": "DG_DGT",
    "european anti-fraud office": "OLAF",
    "european anti fraud office olaf": "OLAF",
    "european personnel selection office": "EPSO_EC",
    "eurostat": "DG_ESTAT",
    "internal audit service": "IAS",
    "joint research centre": "DG_JRC",
    "legal service": "SJ",
    "office infrastructure and logistics brussels": "OIB",
    "office infrastructure and logistics in brussels": "OIB",
    "office for infrastructure brussels": "OIB",
    "office for infrastructure and logistics in brussels": "OIB",
    "office infrastructure and logistics luxembourg": "OIL",
    "office infrastructure and logistics in luxembourg": "OIL",
    "office for infrastructure luxembourg": "OIL",
    "office for infrastructure and logistics in luxembourg": "OIL",
    "office administration and payment individual entitlements": "PMO",
    "office for administration and payment": "PMO",
    "publications office": "OP",
    "secretariat-general": "SG",
    "secretariat general": "SG",
    "service for foreign policy instruments": "SFPI",
    "structural reform support": "DG_REFORM",
    "reform and investment task force": "DG_REFORM",
    "international partnerships": "DG_INTPA",
    "neighbourhood and enlargement": "DG_NEAR",
    "enlargement and eastern neighbourhood": "DG_NEAR",
    "european civil protection and humanitarian aid operations": "DG_ECHO",
}


def clean_html(value: str) -> str:
    text = re.sub(r"<.*?>", " ", value)
    return re.sub(r"\s+", " ", html.unescape(text)).strip()


def normalize(value: str) -> str:
    value = clean_html(value).lower()
    value = value.replace("&", " and ")
    value = re.sub(r"[^a-z0-9]+", " ", value)
    return re.sub(r"\s+", " ", value).strip()


def fetch(url: str) -> str:
    response = requests.get(url, timeout=30, headers={"User-Agent": "EU-HACS-Matrix/0.1"})
    response.raise_for_status()
    return response.text


def load_entities() -> dict[str, dict[str, Any]]:
    entities = json.loads(ENTITY_FILE.read_text())
    return {entity["acronym"]: entity for entity in entities}


def map_entity(department: str, title: str, entities_by_acronym: dict[str, dict[str, Any]]) -> dict[str, Any]:
    candidates = [department, title.replace("Management plan 2026", "")]
    for candidate in candidates:
        normalized = normalize(candidate)
        if normalized in ENTITY_ALIASES:
            acronym = ENTITY_ALIASES[normalized]
            entity = entities_by_acronym.get(acronym)
            if entity:
                return {"entity_id": entity["id"], "entity_acronym": acronym}

        for alias, acronym in ENTITY_ALIASES.items():
            normalized_alias = normalize(alias)
            if normalized_alias and normalized_alias in normalized:
                entity = entities_by_acronym.get(acronym)
                if entity:
                    return {"entity_id": entity["id"], "entity_acronym": acronym}

    return {"entity_id": None, "entity_acronym": None}


def parse_index_page(page: int) -> list[dict[str, str]]:
    url = INDEX_URL if page == 0 else f"{INDEX_URL}?page={page}"
    body = fetch(url)
    records = []
    for match in PUBLICATION_RE.finditer(body):
        title = clean_html(match.group("title"))
        if f"Management plan {TARGET_YEAR}" not in title:
            continue

        meta_values = [clean_html(item.group("value")) for item in META_ITEM_RE.finditer(match.group("meta"))]
        department = meta_values[-1] if meta_values else ""
        records.append(
            {
                "title": title,
                "publication_date": clean_html(match.group("date")),
                "publication_datetime": match.group("datetime"),
                "department": department,
                "description": clean_html(match.group("description")),
                "source_url": urljoin(BASE_URL, match.group("href")),
            }
        )
    return records


def resolve_pdf_url(source_url: str) -> str | None:
    body = fetch(source_url)
    match = PDF_RE.search(body)
    if not match:
        return None
    return urljoin(BASE_URL, html.unescape(match.group("href")))


def main() -> int:
    entities_by_acronym = load_entities()
    seen: set[str] = set()
    records: list[dict[str, Any]] = []

    # Page 50 is the current last page, but 2026 records are at the beginning.
    # Stop after a few empty pages once newer-year records are exhausted.
    empty_pages = 0
    for page in range(0, 51):
        page_records = parse_index_page(page)
        if not page_records:
            empty_pages += 1
            if page > 3 and empty_pages >= 3:
                break
            continue
        empty_pages = 0

        for record in page_records:
            if record["source_url"] in seen:
                continue
            seen.add(record["source_url"])
            mapping = map_entity(record["department"], record["title"], entities_by_acronym)
            record.update(mapping)
            record["pdf_url"] = resolve_pdf_url(record["source_url"])
            records.append(record)

    payload = {
        "source": "European Commission management plans index",
        "source_url": INDEX_URL,
        "year": TARGET_YEAR,
        "refreshed_at": datetime.now(timezone.utc).isoformat(),
        "records": sorted(records, key=lambda item: (item["entity_acronym"] or "ZZZ", item["title"])),
    }
    OUTPUT_FILE.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n")
    mapped = sum(1 for item in records if item["entity_id"] is not None)
    print(f"Wrote {len(records)} management plans to {OUTPUT_FILE} ({mapped} mapped to local entities).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
