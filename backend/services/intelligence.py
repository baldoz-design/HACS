import json
from collections import defaultdict
from pathlib import Path
from typing import Optional

from sqlmodel import Session, select

from backend.models import (
    Entity,
    EntityIntelligenceOut,
    EntityIntelligenceSnapshot,
    IntelligenceSignalOut,
    PastAllocation,
    ProviderService,
)
from backend.services.execution_evidence import is_supplier_specific_execution
from backend.services.ted_search import search_ted_intelligence_for_entity

DATA_DIR = Path(__file__).parent.parent.parent / "data"
ALIASES_FILE = DATA_DIR / "entity_aliases.json"

FIELD_LABELS: dict[int, str] = {
    1: "IT Strategy & Governance",
    2: "Project & Programme Mgmt",
    3: "Organisational Transformation",
    4: "Digital Strategy, Governance, AI & Data",
    5: "Audit, Risk & Compliance",
}

TOPIC_RULES: list[dict] = [
    {
        "topic": "Digital platforms, systems and managed services",
        "hacs_field": 4,
        "keywords": [
            "digital",
            "platform",
            "system",
            "application",
            "managed services",
            "information system",
            "software",
            "portal",
            "website",
        ],
    },
    {
        "topic": "Data, AI, analytics and business intelligence",
        "hacs_field": 4,
        "keywords": [
            "data",
            "analytics",
            "business intelligence",
            "artificial intelligence",
            " ai ",
            "machine learning",
            "reporting",
            "dashboard",
        ],
    },
    {
        "topic": "Cybersecurity, IT governance and architecture",
        "hacs_field": 1,
        "keywords": [
            "cyber",
            "security",
            "governance",
            "architecture",
            "technology strategy",
            "ict strategy",
            "it strategy",
            "cloud",
        ],
    },
    {
        "topic": "Programme, project and PMO support",
        "hacs_field": 2,
        "keywords": [
            "programme",
            "program",
            "project management",
            "pmo",
            "portfolio",
            "implementation support",
            "coordination",
            "delivery",
        ],
    },
    {
        "topic": "Organisational change, learning and operating model",
        "hacs_field": 3,
        "keywords": [
            "change management",
            "transformation",
            "organisational",
            "organizational",
            "operating model",
            "learning",
            "training",
            "skills",
            "staff development",
        ],
    },
    {
        "topic": "Audit, risk, compliance and assurance",
        "hacs_field": 5,
        "keywords": [
            "audit",
            "risk",
            "compliance",
            "assurance",
            "control",
            "regulatory",
            "assessment",
            "evaluation",
        ],
    },
    {
        "topic": "Business continuity and operational resilience",
        "hacs_field": 1,
        "keywords": [
            "business continuity",
            "resilience",
            "disaster recovery",
            "continuity plan",
            "incident",
            "crisis",
        ],
    },
    {
        "topic": "Communication, events and stakeholder engagement",
        "hacs_field": None,
        "keywords": [
            "communication",
            "campaign",
            "event",
            "conference",
            "stakeholder",
            "media",
            "publication",
            "translation",
        ],
    },
    {
        "topic": "Administrative, facility and operational services",
        "hacs_field": None,
        "keywords": [
            "cleaning",
            "catering",
            "facility",
            "printing",
            "logistics",
            "travel",
            "security services",
            "maintenance",
        ],
    },
]


def _looks_like_entity_list(text: str) -> bool:
    normalized = " ".join(text.split()).strip()
    if not normalized:
        return False
    european_mentions = normalized.count("European ")
    punctuation_count = sum(normalized.count(mark) for mark in ".;:")
    return european_mentions >= 4 and punctuation_count <= 2


def _clean_signal(signal: dict) -> dict:
    cleaned = dict(signal)
    summary = str(cleaned.get("summary") or "").strip()
    client_name = str(cleaned.get("client_name") or "").strip()

    if _looks_like_entity_list(summary):
        cleaned["summary"] = ""

    if _looks_like_entity_list(client_name) or len(client_name) > 140:
        cleaned["client_name"] = None

    return cleaned


def _load_alias_dictionary() -> dict[str, list[str]]:
    if not ALIASES_FILE.exists():
        return {}
    with open(ALIASES_FILE) as f:
        raw = json.load(f)
    return {
        str(key): [str(item).strip() for item in value if str(item).strip()]
        for key, value in raw.items()
        if isinstance(value, list)
    }


def _parse_fields(raw: str) -> list[int]:
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return []


def _field_guess_from_text(text: str) -> Optional[int]:
    lowered = text.lower()
    keyword_map: dict[int, list[str]] = {
        1: ["it ", "governance", "architecture", "cybersecurity", "technology"],
        2: ["programme", "program", "project", "pmo", "portfolio"],
        3: ["transformation", "change", "operating model", "adoption"],
        4: ["digital", "ai", "data", "analytics", "business intelligence"],
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


def _topic_profile(notices: list[dict], mode: str) -> dict:
    topic_rows: dict[str, dict] = {}
    unmatched_examples: list[str] = []

    for notice in notices:
        title = str(notice.get("title") or "").strip()
        summary = str(notice.get("summary") or "").strip()
        text = f" {title} {summary} ".lower()
        best_rule: Optional[dict] = None
        best_score = 0

        for rule in TOPIC_RULES:
            score = sum(1 for keyword in rule["keywords"] if keyword in text)
            if score > best_score:
                best_score = score
                best_rule = rule

        if best_rule is None:
            if title and len(unmatched_examples) < 3:
                unmatched_examples.append(title)
            continue

        row = topic_rows.setdefault(
            best_rule["topic"],
            {
                "topic": best_rule["topic"],
                "count": 0,
                "share": 0.0,
                "hacs_field": best_rule["hacs_field"],
                "examples": [],
            },
        )
        row["count"] += 1
        if title and len(row["examples"]) < 3:
            row["examples"].append(title)

    total = len(notices)
    topics = sorted(topic_rows.values(), key=lambda item: item["count"], reverse=True)
    for topic in topics:
        topic["share"] = round(topic["count"] / total, 2) if total else 0.0

    if total and not topics:
        topics.append(
            {
                "topic": "Unclassified TED demand",
                "count": total,
                "share": 1.0,
                "hacs_field": None,
                "examples": unmatched_examples,
            }
        )

    dominant = topics[0]["topic"] if topics else None
    return {
        "mode": mode,
        "total_analyzed": total,
        "dominant_topic": dominant,
        "topics": topics[:6],
    }


def get_entity_aliases(entity: Entity) -> list[str]:
    aliases = _load_alias_dictionary().get(entity.acronym, [])
    return aliases


def _historical_signals(session: Session, entity: Entity) -> list[IntelligenceSignalOut]:
    allocations = session.exec(
        select(PastAllocation)
        .where(
            PastAllocation.entity_id == entity.id,
            PastAllocation.source.in_(["beacon_direct", "beacon_execution_public"]),
        )
        .order_by(PastAllocation.contract_start.desc())  # type: ignore[arg-type]
    ).all()

    signals: list[IntelligenceSignalOut] = []
    eligible_allocations = [
        allocation
        for allocation in allocations
        if allocation.source != "beacon_execution_public"
        or is_supplier_specific_execution(allocation)
    ]
    for allocation in eligible_allocations[:5]:
        field_guess = allocation.hacs_field or _field_guess_from_text(
            f"{allocation.contract_title} {allocation.field_of_expertise or ''}"
        )
        summary_parts = [allocation.client_name]
        if allocation.role:
            summary_parts.append(allocation.role)
        if allocation.field_of_expertise:
            summary_parts.append(allocation.field_of_expertise)
        signals.append(
            IntelligenceSignalOut(
                source=(
                    "historical_execution"
                    if allocation.source == "beacon_execution_public"
                    else "historical_award"
                ),
                title=allocation.contract_title,
                summary=" | ".join(part for part in summary_parts if part),
                date=allocation.contract_start.isoformat() if allocation.contract_start else None,
                url=allocation.source_url,
                field_guess=field_guess,
                contract_value_eur=allocation.contract_value_eur,
                relevance_score=0.75 if field_guess is not None else 0.55,
                client_name=allocation.client_name,
            )
        )
    return signals


def _ted_signals(
    session: Session,
    entity: Entity,
    max_results: int,
) -> tuple[list[IntelligenceSignalOut], dict]:
    aliases = get_entity_aliases(entity)
    intelligence = search_ted_intelligence_for_entity(
        session,
        entity,
        aliases,
        display_limit=max_results,
    )
    signals: list[IntelligenceSignalOut] = []
    for notice in intelligence["notices"]:
        signals.append(
            IntelligenceSignalOut(
                source="ted",
                title=notice["title"],
                summary=notice.get("summary") or notice.get("client_name") or "",
                date=notice.get("publication_date"),
                url=notice.get("url"),
                field_guess=notice.get("field_guess"),
                contract_value_eur=notice.get("contract_value_eur"),
                estimated_value_eur=notice.get("estimated_value_eur"),
                award_value_eur=notice.get("award_value_eur"),
                cpv_codes=notice.get("cpv_codes", []),
                relevance_score=0.9 if notice.get("field_guess") is not None else 0.65,
                client_name=notice.get("client_name"),
            )
        )
    topic_profile = _topic_profile(
        intelligence.get("analysis_notices", []),
        intelligence["mode"],
    )
    return signals, {
        "mode": intelligence["mode"],
        "recent": intelligence["recent_count"],
        "historical": intelligence["historical_count"],
        "displayed": len(signals),
        "total_examined": intelligence["total_examined"],
        "cpv_filtered": intelligence.get("cpv_filtered_count", 0),
        "cpv_prefixes": intelligence.get("cpv_prefixes", []),
    }, topic_profile


def _rank_fields(signals: list[IntelligenceSignalOut], entity: Entity) -> tuple[Optional[int], Optional[int]]:
    field_scores: dict[int, float] = defaultdict(float)
    if entity.top_hacs_field is not None:
        field_scores[entity.top_hacs_field] += 0.8
    for signal in signals:
        if signal.field_guess is not None:
            field_scores[signal.field_guess] += signal.relevance_score
    if not field_scores:
        return entity.top_hacs_field, None
    ranked = sorted(field_scores.items(), key=lambda item: item[1], reverse=True)
    primary = ranked[0][0]
    secondary = ranked[1][0] if len(ranked) > 1 else None
    return primary, secondary


def _provider_match(session: Session, primary_field: Optional[int]) -> str:
    if primary_field is None:
        return "Unclear"

    services = session.exec(select(ProviderService)).all()
    provider_scores: dict[str, list[int]] = {"dst": [], "bcg": []}
    for service in services:
        if primary_field in _parse_fields(service.hacs_fields):
            provider_scores[service.provider].append(service.delivery_strength)

    dst_avg = (
        sum(provider_scores["dst"]) / len(provider_scores["dst"])
        if provider_scores["dst"] else 0.0
    )
    bcg_avg = (
        sum(provider_scores["bcg"]) / len(provider_scores["bcg"])
        if provider_scores["bcg"] else 0.0
    )

    if dst_avg and bcg_avg and abs(dst_avg - bcg_avg) <= 0.75:
        return "Combined"
    if dst_avg >= bcg_avg:
        return "Dst"
    if bcg_avg > 0:
        return "BCG"
    return "Unclear"


def _confidence(signals: list[IntelligenceSignalOut], primary_field: Optional[int]) -> str:
    ted_count = sum(1 for signal in signals if signal.source == "ted")
    historical_count = sum(
        1
        for signal in signals
        if signal.source in {"historical_award", "historical_execution"}
    )
    total = len(signals)
    if primary_field is not None and ted_count >= 3 and total >= 3:
        return "High"
    if primary_field is not None and (ted_count >= 1 or historical_count >= 1):
        return "Medium"
    return "Low"


def _recommended_action(confidence: str, provider_match: str, primary_field: Optional[int]) -> str:
    if confidence in {"High", "Medium"} and primary_field is not None and provider_match != "Unclear":
        return "Send to Proposal Lab"
    if confidence == "Medium":
        return "Explore further"
    if confidence == "Low" and primary_field is not None:
        return "Monitor"
    return "Discard"


def _need_statement(
    primary_field: Optional[int],
    confidence: str,
    ted_count: int,
    historical_count: int,
) -> str:
    if primary_field is None:
        return "No clear HACS need detected yet. More intelligence is required."

    field_label = FIELD_LABELS.get(primary_field, f"Field {primary_field}")
    if ted_count and historical_count:
        evidence = "TED procurement signals and historical execution evidence"
    elif ted_count:
        evidence = "TED procurement signals"
    elif historical_count:
        evidence = "historical execution evidence"
    else:
        evidence = "limited available evidence"

    lead = "Likely demand" if confidence != "Low" else "Emerging need"
    return f"{lead} in {field_label} based on {evidence}."


def _summary(
    signals: list[IntelligenceSignalOut],
    aliases: list[str],
    ted_counts: Optional[dict] = None,
    ted_topics: Optional[dict] = None,
) -> dict:
    source_counts: dict[str, int] = defaultdict(int)
    field_counts: dict[str, int] = defaultdict(int)
    for signal in signals:
        source_counts[signal.source] += 1
        if signal.field_guess is not None:
            field_counts[str(signal.field_guess)] += 1
    summary = {
        "signal_count": len(signals),
        "source_counts": dict(source_counts),
        "field_counts": dict(field_counts),
        "aliases_used": aliases,
    }
    if ted_counts is not None:
        summary["ted_counts"] = ted_counts
    if ted_topics is not None:
        summary["ted_topics"] = ted_topics
    return summary


def build_snapshot(
    session: Session,
    entity: Entity,
    max_results: int = 8,
) -> EntityIntelligenceSnapshot:
    aliases = get_entity_aliases(entity)
    ted_signals, ted_counts, ted_topics = _ted_signals(
        session,
        entity,
        max_results=max_results,
    )
    historical_signals = _historical_signals(session, entity)
    signals = ted_signals + historical_signals

    primary_field, secondary_field = _rank_fields(signals, entity)
    provider_match = _provider_match(session, primary_field)
    confidence = _confidence(signals, primary_field)
    recommendation = _recommended_action(confidence, provider_match, primary_field)
    need_statement = _need_statement(
        primary_field,
        confidence,
        ted_count=len(ted_signals),
        historical_count=len(historical_signals),
    )
    summary = _summary(signals, aliases, ted_counts=ted_counts, ted_topics=ted_topics)

    snapshot = EntityIntelligenceSnapshot(
        entity_id=entity.id,
        need_statement=need_statement,
        primary_field=primary_field,
        secondary_field=secondary_field,
        confidence=confidence,
        provider_match=provider_match,
        recommended_action=recommendation,
        signals_json=json.dumps([signal.model_dump() for signal in signals]),
        summary_json=json.dumps(summary),
    )
    session.add(snapshot)
    session.commit()
    session.refresh(snapshot)
    return snapshot


def snapshot_to_out(snapshot: EntityIntelligenceSnapshot) -> EntityIntelligenceOut:
    raw_signals = json.loads(snapshot.signals_json)
    cleaned_signals = [_clean_signal(signal) for signal in raw_signals]
    return EntityIntelligenceOut(
        id=snapshot.id,
        entity_id=snapshot.entity_id,
        need_statement=snapshot.need_statement,
        primary_field=snapshot.primary_field,
        secondary_field=snapshot.secondary_field,
        confidence=snapshot.confidence,
        provider_match=snapshot.provider_match,
        recommended_action=snapshot.recommended_action,
        signals=[IntelligenceSignalOut(**signal) for signal in cleaned_signals],
        summary=json.loads(snapshot.summary_json),
        created_at=snapshot.created_at,
    )


def get_latest_snapshot(
    session: Session,
    entity_id: int,
) -> Optional[EntityIntelligenceSnapshot]:
    return session.exec(
        select(EntityIntelligenceSnapshot)
        .where(EntityIntelligenceSnapshot.entity_id == entity_id)
        .order_by(EntityIntelligenceSnapshot.created_at.desc())  # type: ignore[arg-type]
    ).first()


def list_latest_snapshots(
    session: Session,
    entity_ids: Optional[list[int]] = None,
) -> list[EntityIntelligenceSnapshot]:
    statement = select(EntityIntelligenceSnapshot).order_by(
        EntityIntelligenceSnapshot.entity_id,
        EntityIntelligenceSnapshot.created_at.desc(),  # type: ignore[arg-type]
    )
    if entity_ids:
        statement = statement.where(EntityIntelligenceSnapshot.entity_id.in_(entity_ids))

    snapshots = session.exec(statement).all()
    latest_by_entity: dict[int, EntityIntelligenceSnapshot] = {}
    for snapshot in snapshots:
        latest_by_entity.setdefault(snapshot.entity_id, snapshot)
    return list(latest_by_entity.values())


def refresh_snapshots(
    session: Session,
    entity_ids: list[int],
    max_results_per_entity: int = 8,
) -> list[EntityIntelligenceSnapshot]:
    entities = session.exec(
        select(Entity).where(Entity.id.in_(entity_ids)).order_by(Entity.id)
    ).all()
    return [
        build_snapshot(session, entity, max_results=max_results_per_entity)
        for entity in entities
    ]
