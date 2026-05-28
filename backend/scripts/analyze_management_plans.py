"""Analyze European Commission management plans into strategy inputs.

The output is a compact local database that connects each management plan to:
- stated strategic objectives
- planned 2026 actions
- inferred needs
- HACS field signals

This script intentionally avoids LLM calls. It uses deterministic PDF text
extraction plus transparent keyword scoring so the first dataset is auditable.
"""

from __future__ import annotations

import hashlib
import json
import re
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import pdfplumber
import requests

ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "data"
CATALOG_FILE = DATA_DIR / "management_plans.json"
RULES_FILE = DATA_DIR / "hacs_field_assignment_rules.json"
OUTPUT_FILE = DATA_DIR / "management_plan_analysis.json"
TEXT_CACHE_DIR = DATA_DIR / "management_plan_text"

ACTION_VERBS = (
    "will",
    "aims",
    "expects",
    "continue",
    "implement",
    "provide",
    "establish",
    "develop",
    "launch",
    "review",
    "enhance",
    "strengthen",
    "support",
    "prepare",
    "adopt",
    "deliver",
    "promote",
    "modernise",
    "modernize",
    "streamline",
    "automate",
    "assess",
)

STOP_PHRASES = (
    "for details of individual outputs",
    "source of data",
    "contents",
    "annex",
    "management plan",
    "part 1.",
    "part 2.",
    "part 3.",
    "general objective",
    "specific objective",
    "related to spending programme",
    "output indicator target",
    "these will be used for planning and reporting",
    "relies on the support of",
    "contribute to these multiannual objectives",
    "it also describes how",
)

ACTION_START_RE = re.compile(
    r"^(provide|explore|establish|make|support|implement|develop|launch|review|enhance|strengthen|prepare|adopt|deliver|promote|modernise|modernize|streamline|automate|assess)\b",
    re.IGNORECASE,
)
ACTION_PATTERN_RE = re.compile(
    r"\b(will|aims to|expects to|is expected to|are expected to|plans to|intends to|foresees|shall)\b",
    re.IGNORECASE,
)
LOW_VALUE_ACTION_RE = re.compile(
    r"\b(risk at closure|risk at payment|staff survey|staff satisfaction|emissions from staff|"
    r"gender balance|public records of processing|professional travel|reasonable assurance)\b",
    re.IGNORECASE,
)

EC_PRIORITIES = [
    {
        "id": "P1",
        "title": "AI & digital leadership",
        "keywords": [
            "ai",
            "artificial intelligence",
            "digital",
            "data",
            "cloud",
            "cyber",
            "interoperability",
            "platform",
            "digital services",
        ],
    },
    {
        "id": "P2",
        "title": "Green Deal & clean energy",
        "keywords": [
            "climate",
            "green",
            "energy",
            "emissions",
            "environment",
            "sustainable",
            "decarbonisation",
            "decarbonization",
        ],
    },
    {
        "id": "P3",
        "title": "Competitiveness & single market",
        "keywords": [
            "competitiveness",
            "single market",
            "industry",
            "smes",
            "customs",
            "trade",
            "market",
            "simplification",
        ],
    },
    {
        "id": "P4",
        "title": "Strategic autonomy & security",
        "keywords": [
            "security",
            "resilience",
            "sovereignty",
            "defence",
            "defense",
            "migration",
            "fraud",
            "risk",
        ],
    },
    {
        "id": "P5",
        "title": "Social agenda & skills",
        "keywords": [
            "skills",
            "training",
            "employment",
            "education",
            "culture",
            "staff",
            "inclusion",
            "social",
        ],
    },
    {
        "id": "P6",
        "title": "Health, safety & resilience",
        "keywords": [
            "health",
            "food",
            "safety",
            "crisis",
            "preparedness",
            "emergency",
            "medical",
        ],
    },
    {
        "id": "P7",
        "title": "Europe in the world",
        "keywords": [
            "external",
            "international",
            "partnership",
            "enlargement",
            "neighbourhood",
            "global europe",
            "foreign",
        ],
    },
]

ACTION_THEME_RULES = [
    {
        "id": "digital_sovereignty",
        "title": "Digital sovereignty, platforms & infrastructure",
        "summary": "Modernise core digital infrastructure, shared platforms, interoperability and sovereign technology capabilities.",
        "keywords": [
            "digital",
            "sovereignty",
            "sovereign",
            "cloud",
            "platform",
            "interoperability",
            "infrastructure",
            "it modernisation",
            "it modernization",
            "wallet",
            "eidas",
            "cyber",
            "cybersecurity",
            "data space",
        ],
    },
    {
        "id": "ai_data_analytics",
        "title": "AI, data & analytics enablement",
        "summary": "Use AI, data, dashboards and analytics capabilities to improve policy delivery and evidence-based decisions.",
        "keywords": [
            "ai",
            "artificial intelligence",
            "data",
            "analytics",
            "dashboard",
            "data quality",
            "data catalogue",
            "data catalog",
            "monitoring",
            "reporting",
            "evidence",
            "model",
            "automation",
        ],
    },
    {
        "id": "regulation_compliance",
        "title": "Regulatory implementation & compliance",
        "summary": "Translate new rules into implementation, enforcement, simplification, compliance and market oversight actions.",
        "keywords": [
            "regulation",
            "regulatory",
            "compliance",
            "implementation",
            "enforcement",
            "simplification",
            "legal",
            "framework",
            "rules",
            "market surveillance",
            "reporting obligations",
            "audit",
            "control",
        ],
    },
    {
        "id": "programme_delivery",
        "title": "Programme delivery, funding & monitoring",
        "summary": "Deliver programmes, grants, milestones and funding instruments with stronger planning, monitoring and evaluation.",
        "keywords": [
            "programme",
            "program",
            "funding",
            "grant",
            "grants",
            "milestone",
            "implementation",
            "evaluation",
            "monitoring",
            "recovery",
            "facility",
            "budget",
            "call for proposals",
        ],
    },
    {
        "id": "security_resilience",
        "title": "Security, risk & resilience",
        "summary": "Strengthen risk management, preparedness, resilience and security capabilities across policy and operations.",
        "keywords": [
            "security",
            "resilience",
            "risk",
            "preparedness",
            "crisis",
            "fraud",
            "defence",
            "defense",
            "threat",
            "continuity",
            "safety",
        ],
    },
    {
        "id": "stakeholder_engagement",
        "title": "Stakeholder engagement & communication",
        "summary": "Coordinate stakeholders, consultations, communication campaigns and engagement with citizens or institutions.",
        "keywords": [
            "stakeholder",
            "communication",
            "campaign",
            "consultation",
            "dialogue",
            "citizen",
            "engagement",
            "outreach",
            "conference",
            "awareness",
        ],
    },
    {
        "id": "skills_operating_model",
        "title": "Skills, capacity & operating model",
        "summary": "Build internal capacity through skills, training, process redesign, operating model and change management actions.",
        "keywords": [
            "skills",
            "training",
            "staff",
            "capacity",
            "operating model",
            "process",
            "change management",
            "human resources",
            "talent",
            "competence",
        ],
    },
    {
        "id": "green_transition",
        "title": "Green transition & sustainability",
        "summary": "Advance climate, energy, environmental, circular economy and sustainability initiatives.",
        "keywords": [
            "climate",
            "green",
            "energy",
            "emissions",
            "environment",
            "sustainable",
            "sustainability",
            "decarbonisation",
            "decarbonization",
            "circular",
            "biodiversity",
        ],
    },
    {
        "id": "external_partnerships",
        "title": "International partnerships & external action",
        "summary": "Support international cooperation, enlargement, neighbourhood policy, external partnerships and global initiatives.",
        "keywords": [
            "external",
            "international",
            "partnership",
            "partnerships",
            "enlargement",
            "neighbourhood",
            "global",
            "third countries",
            "foreign",
            "trade partner",
        ],
    },
]


def normalize(value: str) -> str:
    value = value.lower()
    value = re.sub(r"[^a-z0-9]+", " ", value)
    return re.sub(r"\s+", " ", value).strip()


def sentence_split(text: str) -> list[str]:
    text = re.sub(r"\s+", " ", text)
    parts = re.split(r"(?<=[.!?])\s+(?=[A-Z0-9])", text)
    return [part.strip(" •\t\n") for part in parts if len(part.strip()) > 35]


def short_text(text: str, limit: int = 260) -> str:
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) <= limit:
        return text
    return text[: limit - 1].rstrip() + "…"


def looks_like_toc_or_heading(text: str) -> bool:
    lowered = text.lower().strip()
    if "...." in lowered or re.search(r"\.{5,}\s*\d+$", lowered):
        return True
    if lowered.startswith(("part ", "annex ", "general objective", "specific objective")):
        return True
    if lowered in {"output", "indicator", "target", "main outputs in 2026"}:
        return True
    return False


def clean_pdf_line(line: str) -> str:
    line = line.strip(" •\t")
    line = re.sub(r"\s+", " ", line)
    line = re.sub(r"^\(?\d+\)?\s+", "", line)
    return line.strip()


def is_low_value_action(text: str) -> bool:
    lowered = text.lower()
    if LOW_VALUE_ACTION_RE.search(text):
        return True
    if any(stop in lowered for stop in STOP_PHRASES):
        return True
    return False


def build_action_blocks(text: str) -> list[str]:
    blocks: list[str] = []
    current: list[str] = []

    def flush() -> None:
        nonlocal current
        if current:
            block = re.sub(r"\s+", " ", " ".join(current)).strip()
            if block:
                blocks.append(block)
            current = []

    for raw_line in text.splitlines():
        line = clean_pdf_line(raw_line)
        if not line or looks_like_toc_or_heading(line) or is_low_value_action(line):
            flush()
            continue

        starts_action = bool(ACTION_START_RE.search(line) or ACTION_PATTERN_RE.search(line))
        starts_new_sentence = bool(re.match(r"^(In 20\d{2}|The |DG |[A-Z][A-Za-z]+ will\b)", line))

        if current and (starts_action or starts_new_sentence):
            flush()

        if starts_action or current:
            current.append(line)
            if re.search(r"[.!?]$", line):
                flush()

    flush()
    return blocks


def action_score(candidate: str, field: int | None, priority: dict[str, str] | None) -> int:
    score = 0
    if ACTION_PATTERN_RE.search(candidate):
        score += 30
    if ACTION_START_RE.search(candidate):
        score += 20
    if "2026" in candidate:
        score += 12
    if field:
        score += 10
    if priority:
        score += 8
    if 120 <= len(candidate) <= 360:
        score += 10
    elif len(candidate) < 80:
        score -= 12
    if re.search(r"\b(and|of|the|to|for|with)$", candidate.strip(), re.IGNORECASE):
        score -= 30
    if candidate.count(".") >= 2:
        score += 4
    if is_low_value_action(candidate):
        score -= 25
    return score


def cache_key(url: str) -> str:
    return hashlib.sha1(url.encode("utf-8")).hexdigest()[:16]


def download_pdf(url: str) -> bytes:
    response = requests.get(url, timeout=90, headers={"User-Agent": "EU-HACS-Matrix/0.1"})
    response.raise_for_status()
    return response.content


def extract_pages(record: dict[str, Any]) -> list[dict[str, Any]]:
    if not record.get("pdf_url"):
        return []

    TEXT_CACHE_DIR.mkdir(exist_ok=True)
    cache_file = TEXT_CACHE_DIR / f"{record.get('entity_acronym') or cache_key(record['pdf_url'])}.json"
    if cache_file.exists():
        return json.loads(cache_file.read_text())

    pdf_bytes = download_pdf(record["pdf_url"])
    temp_pdf = TEXT_CACHE_DIR / f"{cache_key(record['pdf_url'])}.pdf"
    temp_pdf.write_bytes(pdf_bytes)
    pages: list[dict[str, Any]] = []
    try:
        with pdfplumber.open(str(temp_pdf)) as pdf:
            for index, page in enumerate(pdf.pages, start=1):
                text = page.extract_text() or ""
                pages.append({"page": index, "text": text})
    finally:
        temp_pdf.unlink(missing_ok=True)

    cache_file.write_text(json.dumps(pages, ensure_ascii=False))
    return pages


def load_field_keywords() -> dict[str, dict[str, Any]]:
    rules = json.loads(RULES_FILE.read_text())
    fields = {}
    for field_id, config in rules["fields"].items():
        keywords: list[str] = []
        for key, value in config.items():
            if key.endswith("_keywords"):
                keywords.extend(value)
        fields[field_id] = {
            "label": config["label"],
            "keywords": sorted(set(normalize(keyword) for keyword in keywords)),
        }
    return fields


def score_fields(text: str, fields: dict[str, dict[str, Any]]) -> dict[str, int]:
    normalized = normalize(text)
    scores = {}
    for field_id, config in fields.items():
        score = 0
        for keyword in config["keywords"]:
            if keyword and keyword in normalized:
                score += 1
        scores[field_id] = score
    return scores


def dominant_field(text: str, fields: dict[str, dict[str, Any]]) -> int | None:
    scores = score_fields(text, fields)
    ranked = sorted(scores.items(), key=lambda item: item[1], reverse=True)
    if not ranked or ranked[0][1] == 0:
        return None
    return int(ranked[0][0])


def match_priority(text: str) -> dict[str, str] | None:
    normalized = normalize(text)
    scores = []
    for priority in EC_PRIORITIES:
        score = sum(1 for keyword in priority["keywords"] if normalize(keyword) in normalized)
        scores.append((score, priority))
    scores.sort(key=lambda item: item[0], reverse=True)
    if scores[0][0] == 0:
        return None
    return {"id": scores[0][1]["id"], "title": scores[0][1]["title"]}


def match_action_theme(text: str) -> dict[str, Any]:
    normalized = normalize(text)
    scores = []
    for theme in ACTION_THEME_RULES:
        score = sum(1 for keyword in theme["keywords"] if normalize(keyword) in normalized)
        scores.append((score, theme))
    scores.sort(key=lambda item: item[0], reverse=True)
    if scores[0][0] == 0:
        return {
            "id": "general_delivery",
            "title": "General policy delivery & coordination",
            "summary": "Coordinate delivery of planned policy actions where the management plan does not point to a more specific theme.",
            "keywords": [],
        }
    return scores[0][1]


def most_common_non_empty(values: list[Any]) -> Any:
    values = [value for value in values if value]
    if not values:
        return None
    return Counter(values).most_common(1)[0][0]


def synthesize_action_themes(
    actions: list[dict[str, Any]],
    objectives: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    candidates = [action for action in actions if action.get("score", 0) >= 70]
    if len(candidates) < 3:
        candidates = actions[:8]

    buckets: dict[str, dict[str, Any]] = {}
    objective_context = " ".join(objective["title"] for objective in objectives[:4])

    for action in candidates:
        theme = match_action_theme(f"{action['title']} {action.get('evidence', '')} {objective_context}")
        bucket = buckets.setdefault(
            theme["id"],
            {
                "id": theme["id"],
                "title": theme["title"],
                "summary": theme["summary"],
                "actions": [],
            },
        )
        bucket["actions"].append(action)

    synthesized = []
    for bucket in buckets.values():
        bucket_actions = sorted(bucket["actions"], key=lambda item: (-item.get("score", 0), item.get("page", 999)))
        hacs_field = most_common_non_empty([action.get("hacs_field") for action in bucket_actions])
        priority_ids = [action.get("ec_priority", {}).get("id") for action in bucket_actions if action.get("ec_priority")]
        priority_id = most_common_non_empty(priority_ids)
        priority = next((item for item in EC_PRIORITIES if item["id"] == priority_id), None)
        pages = sorted({action["page"] for action in bucket_actions if action.get("page")})
        avg_score = round(sum(action.get("score", 0) for action in bucket_actions) / len(bucket_actions))

        synthesized.append(
            {
                "id": bucket["id"],
                "title": bucket["title"],
                "summary": bucket["summary"],
                "hacs_field": hacs_field,
                "ec_priority": {"id": priority["id"], "title": priority["title"]} if priority else None,
                "action_count": len(bucket_actions),
                "avg_score": avg_score,
                "pages": pages[:8],
                "evidence": [
                    {
                        "title": item["title"],
                        "page": item["page"],
                        "score": item["score"],
                    }
                    for item in bucket_actions[:3]
                ],
            }
        )

    return sorted(
        synthesized,
        key=lambda item: (-item["action_count"], -item["avg_score"], item["title"]),
    )[:5]


def extract_mission_context(full_text: str) -> str:
    intro = re.search(r"(?m)^PART 1\.\s*Introduction\s*$(?P<body>.*?)(?=^PART 2\.|\Z)", full_text, re.DOTALL | re.MULTILINE)
    body = intro.group("body") if intro else full_text[:4000]
    sentences = sentence_split(body)
    selected = []
    for sentence in sentences:
        lowered = sentence.lower()
        if any(term in lowered for term in ("mission", "is the", "responsible", "provides", "supports", "manages")):
            selected.append(sentence)
        if len(selected) >= 2:
            break
    return short_text(" ".join(selected) if selected else body, 520)


def extract_objectives(full_text: str, fields: dict[str, dict[str, Any]]) -> list[dict[str, Any]]:
    objectives = []
    pattern = re.compile(
        r"Specific Objective\s+(?P<code>[0-9.]+):\s*(?P<title>.*?)(?=(?:Related to|Main outputs|Output Indicator|Specific Objective|General objective|ANNEX|$))",
        re.IGNORECASE | re.DOTALL,
    )
    for match in pattern.finditer(full_text):
        title = short_text(match.group("title"), 220)
        if len(title) < 8 or looks_like_toc_or_heading(title):
            continue
        context_start = max(0, match.start() - 200)
        context_end = min(len(full_text), match.end() + 900)
        context = full_text[context_start:context_end]
        objectives.append(
            {
                "code": match.group("code"),
                "title": title,
                "hacs_field": dominant_field(context, fields),
                "ec_priority": match_priority(context),
                "evidence": short_text(context, 420),
            }
        )
    return dedupe_by_key(objectives, "title")[:12]


def extract_actions(pages: list[dict[str, Any]], fields: dict[str, dict[str, Any]]) -> list[dict[str, Any]]:
    actions = []
    for page in pages:
        if page["page"] <= 2:
            continue
        text = page["text"]
        candidates = build_action_blocks(text) + sentence_split(text)
        for candidate in candidates:
            lowered = candidate.lower()
            if looks_like_toc_or_heading(candidate):
                continue
            has_action_pattern = bool(ACTION_PATTERN_RE.search(candidate) or ACTION_START_RE.search(candidate))
            if "2026" not in lowered and not has_action_pattern:
                continue
            if not has_action_pattern and not lowered.startswith("in 2026"):
                continue
            if is_low_value_action(candidate):
                continue
            if len(candidate) > 620:
                continue
            field = dominant_field(candidate, fields)
            priority = match_priority(candidate)
            if not field and not priority:
                continue
            score = action_score(candidate, field, priority)
            if score < 20:
                continue
            actions.append(
                {
                    "title": short_text(candidate, 180),
                    "evidence": short_text(candidate, 420),
                    "page": page["page"],
                    "hacs_field": field,
                    "ec_priority": priority,
                    "score": score,
                }
            )
    return dedupe_by_key(sorted(actions, key=lambda item: (-item["score"], item["page"])), "title")[:18]


def infer_needs(actions: list[dict[str, Any]], objectives: list[dict[str, Any]], fields: dict[str, dict[str, Any]]) -> list[dict[str, Any]]:
    field_counts: Counter[int] = Counter()
    priority_counts: Counter[str] = Counter()
    for item in actions + objectives:
        if item.get("hacs_field"):
            field_counts[item["hacs_field"]] += 1
        priority = item.get("ec_priority")
        if priority:
            priority_counts[priority["id"]] += 1

    needs = []
    for field_id, count in field_counts.most_common(3):
        field = fields[str(field_id)]
        supporting = sorted(
            [item for item in actions if item.get("hacs_field") == field_id],
            key=lambda item: -item.get("score", 0),
        )[:3]
        needs.append(
            {
                "need": f"Need for {field['label'].lower()} support emerging from the 2026 management plan.",
                "hacs_field": field_id,
                "strength": "High" if count >= 5 else "Medium" if count >= 3 else "Low",
                "supporting_actions": [item["title"] for item in supporting],
            }
        )

    if not needs and priority_counts:
        top_priority = priority_counts.most_common(1)[0][0]
        priority = next((item for item in EC_PRIORITIES if item["id"] == top_priority), None)
        if priority:
            needs.append(
                {
                    "need": f"Need linked to {priority['title']} priorities in the 2026 management plan.",
                    "hacs_field": None,
                    "strength": "Low",
                    "supporting_actions": [],
                }
            )
    return needs


def dedupe_by_key(items: list[dict[str, Any]], key: str) -> list[dict[str, Any]]:
    seen: set[str] = set()
    output = []
    for item in items:
        normalized = normalize(str(item.get(key, "")))[:140]
        if not normalized or normalized in seen:
            continue
        seen.add(normalized)
        output.append(item)
    return output


def analyze_record(record: dict[str, Any], fields: dict[str, dict[str, Any]]) -> dict[str, Any]:
    pages = extract_pages(record)
    full_text = "\n".join(page["text"] for page in pages)
    objectives = extract_objectives(full_text, fields)
    actions = extract_actions(pages, fields)
    field_scores = score_fields(full_text, fields)
    top_fields = [
        {"field": int(field_id), "score": score}
        for field_id, score in sorted(field_scores.items(), key=lambda item: item[1], reverse=True)
        if score > 0
    ][:3]

    return {
        "entity_id": record["entity_id"],
        "entity_acronym": record["entity_acronym"],
        "department": record["department"],
        "title": record["title"],
        "source_url": record["source_url"],
        "pdf_url": record["pdf_url"],
        "publication_date": record["publication_date"],
        "pages_analyzed": len(pages),
        "mission_context": extract_mission_context(full_text),
        "objectives": objectives,
        "actions": actions,
        "action_themes": synthesize_action_themes(actions, objectives),
        "needs": infer_needs(actions, objectives, fields),
        "top_hacs_fields": top_fields,
    }


def main() -> int:
    catalog = json.loads(CATALOG_FILE.read_text())
    fields = load_field_keywords()
    records = [
        record for record in catalog["records"]
        if record.get("entity_id") and record.get("pdf_url")
    ]

    analyses = []
    for index, record in enumerate(records, start=1):
        print(f"[{index}/{len(records)}] {record['entity_acronym']} {record['title']}")
        analyses.append(analyze_record(record, fields))

    payload = {
        "source": "European Commission management plans PDF analysis",
        "source_catalog": CATALOG_FILE.name,
        "year": catalog["year"],
        "analyzed_at": datetime.now(timezone.utc).isoformat(),
        "records_analyzed": len(analyses),
        "records": analyses,
    }
    OUTPUT_FILE.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n")
    print(f"Wrote {len(analyses)} analyzed management plans to {OUTPUT_FILE}.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
