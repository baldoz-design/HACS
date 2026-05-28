import json
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Optional

from sqlmodel import Session, select

from backend.models import (
    Entity,
    EntityHacsAssignment,
    EntityIntelligenceSnapshot,
    HacsAssignmentOut,
)

DATA_DIR = Path(__file__).parent.parent.parent / "data"
RULES_FILE = DATA_DIR / "hacs_field_assignment_rules.json"


def _load_rules() -> dict:
    return json.loads(RULES_FILE.read_text())


def _normalize(text: str) -> str:
    return " ".join(text.lower().replace("/", " ").replace("-", " ").split())


def _matched_keywords(text: str, keywords: list[str]) -> list[str]:
    normalized = _normalize(text)
    return [keyword for keyword in keywords if _normalize(keyword) in normalized]


def _component_score(
    text: str,
    keywords: list[str],
    max_points: float,
) -> tuple[float, list[str]]:
    matches = _matched_keywords(text, keywords)
    if not keywords:
        return 0.0, []
    # A few strong matches should be enough; requiring every keyword would punish focused entities.
    denominator = min(3, len(keywords))
    score = min(max_points, (len(matches) / denominator) * max_points)
    return round(score, 2), matches


def _latest_snapshot(session: Session, entity_id: int) -> Optional[EntityIntelligenceSnapshot]:
    return session.exec(
        select(EntityIntelligenceSnapshot)
        .where(EntityIntelligenceSnapshot.entity_id == entity_id)
        .order_by(EntityIntelligenceSnapshot.created_at.desc())  # type: ignore[arg-type]
    ).first()


def _snapshot_signal_text(snapshot: Optional[EntityIntelligenceSnapshot]) -> tuple[str, str, str]:
    if snapshot is None:
        return "", "", ""

    try:
        signals = json.loads(snapshot.signals_json)
    except json.JSONDecodeError:
        return "", "", ""

    procurement_parts: list[str] = []
    execution_parts: list[str] = []
    semantic_parts: list[str] = [snapshot.need_statement]

    for signal in signals:
        text = " ".join(
            str(signal.get(key) or "")
            for key in ["title", "summary", "client_name"]
        )
        semantic_parts.append(text)
        if signal.get("source") == "historical_execution":
            execution_parts.append(text)
        else:
            procurement_parts.append(text)

    return (
        " ".join(procurement_parts),
        " ".join(execution_parts),
        " ".join(semantic_parts),
    )


def _confidence(primary_score: float, secondary_score: float) -> str:
    gap = primary_score - secondary_score
    if primary_score >= 70 and gap >= 15:
        return "High"
    if primary_score >= 35:
        return "Medium"
    return "Low"


def _rationale(
    primary_field: Optional[int],
    field_scores: dict[str, dict],
    rules: dict,
) -> str:
    if primary_field is None:
        return "No HACS field can be assigned with enough evidence yet."

    field_key = str(primary_field)
    label = rules["fields"][field_key]["label"]
    scores = field_scores[field_key]
    strongest = sorted(
        [
            ("mission fit", scores["mission_fit"]),
            ("procurement fit", scores["procurement_fit"]),
            ("execution evidence", scores["execution_fit"]),
            ("semantic fit", scores["semantic_fit"]),
        ],
        key=lambda item: item[1],
        reverse=True,
    )[:2]
    reasons = ", ".join(name for name, value in strongest if value > 0)
    if not reasons:
        reasons = "limited available evidence"
    return f"Suggested {label} based primarily on {reasons}."


def _assignment_to_out(assignment: EntityHacsAssignment) -> HacsAssignmentOut:
    return HacsAssignmentOut(
        id=assignment.id,
        entity_id=assignment.entity_id,
        primary_field=assignment.primary_field,
        secondary_field=assignment.secondary_field,
        confidence=assignment.confidence,
        status=assignment.status,
        rationale=assignment.rationale,
        field_scores=json.loads(assignment.field_scores_json),
        evidence=json.loads(assignment.evidence_json),
        model_version=assignment.model_version,
        locked_by_user=assignment.locked_by_user,
        created_at=assignment.created_at,
        updated_at=assignment.updated_at,
    )


def latest_assignment(session: Session, entity_id: int) -> Optional[EntityHacsAssignment]:
    return session.exec(
        select(EntityHacsAssignment)
        .where(EntityHacsAssignment.entity_id == entity_id)
        .order_by(EntityHacsAssignment.updated_at.desc())  # type: ignore[arg-type]
    ).first()


def list_latest_assignments(
    session: Session,
    entity_ids: Optional[list[int]] = None,
) -> list[EntityHacsAssignment]:
    statement = select(EntityHacsAssignment).order_by(
        EntityHacsAssignment.entity_id,
        EntityHacsAssignment.updated_at.desc(),  # type: ignore[arg-type]
    )
    if entity_ids:
        statement = statement.where(EntityHacsAssignment.entity_id.in_(entity_ids))
    assignments = session.exec(statement).all()
    latest_by_entity: dict[int, EntityHacsAssignment] = {}
    for assignment in assignments:
        latest_by_entity.setdefault(assignment.entity_id, assignment)
    return list(latest_by_entity.values())


def generate_assignment(
    session: Session,
    entity: Entity,
    *,
    apply_to_entity: bool = False,
) -> EntityHacsAssignment:
    existing = latest_assignment(session, entity.id)
    if existing and existing.locked_by_user:
        return existing

    rules = _load_rules()
    weights = rules["weights"]
    snapshot = _latest_snapshot(session, entity.id)
    procurement_text, execution_text, semantic_text = _snapshot_signal_text(snapshot)
    mission_text = " ".join(
        part
        for part in [
            entity.acronym,
            entity.name,
            entity.cluster,
            entity.notes or "",
            "European Commission Directorate-General" if entity.is_ec_dg else "",
        ]
        if part
    )

    field_scores: dict[str, dict] = {}
    evidence: dict[str, dict[str, list[str]]] = defaultdict(dict)

    for field_key, field_rules in rules["fields"].items():
        mission_keywords = field_rules["mission_keywords"] + field_rules["entity_type_keywords"]
        mission_score, mission_matches = _component_score(
            mission_text,
            mission_keywords,
            weights["mission_fit"],
        )
        procurement_score, procurement_matches = _component_score(
            procurement_text,
            field_rules["procurement_keywords"],
            weights["procurement_fit"],
        )
        execution_score, execution_matches = _component_score(
            execution_text,
            field_rules["execution_keywords"],
            weights["execution_fit"],
        )
        semantic_score, semantic_matches = _component_score(
            f"{mission_text} {semantic_text}",
            field_rules["semantic_keywords"],
            weights["semantic_fit"],
        )
        total = round(
            mission_score + procurement_score + execution_score + semantic_score,
            2,
        )
        field_scores[field_key] = {
            "total": total,
            "mission_fit": mission_score,
            "procurement_fit": procurement_score,
            "execution_fit": execution_score,
            "semantic_fit": semantic_score,
        }
        evidence[field_key] = {
            "mission_matches": mission_matches,
            "procurement_matches": procurement_matches,
            "execution_matches": execution_matches,
            "semantic_matches": semantic_matches,
        }

    ranked = sorted(
        ((int(field), score["total"]) for field, score in field_scores.items()),
        key=lambda item: item[1],
        reverse=True,
    )
    primary_field = ranked[0][0] if ranked and ranked[0][1] > 0 else None
    secondary_field = None
    if len(ranked) > 1 and primary_field is not None:
        if ranked[1][1] >= 45 or ranked[0][1] - ranked[1][1] <= 15:
            secondary_field = ranked[1][0]

    primary_score = ranked[0][1] if ranked else 0
    secondary_score = ranked[1][1] if len(ranked) > 1 else 0
    confidence = _confidence(primary_score, secondary_score)
    rationale = _rationale(primary_field, field_scores, rules)

    assignment = EntityHacsAssignment(
        entity_id=entity.id,
        primary_field=primary_field,
        secondary_field=secondary_field,
        confidence=confidence,
        status="suggested",
        rationale=rationale,
        field_scores_json=json.dumps(field_scores),
        evidence_json=json.dumps(evidence),
        model_version=rules["version"],
        locked_by_user=False,
        updated_at=datetime.utcnow(),
    )
    session.add(assignment)

    if apply_to_entity and primary_field is not None:
        entity.top_hacs_field = primary_field
        session.add(entity)

    session.commit()
    session.refresh(assignment)
    return assignment


def generate_assignments(
    session: Session,
    entity_ids: Optional[list[int]] = None,
    *,
    apply_to_entities: bool = False,
) -> list[EntityHacsAssignment]:
    statement = select(Entity).order_by(Entity.id)
    if entity_ids:
        statement = statement.where(Entity.id.in_(entity_ids))
    entities = session.exec(statement).all()
    return [
        generate_assignment(
            session,
            entity,
            apply_to_entity=apply_to_entities,
        )
        for entity in entities
    ]


def assignment_to_out(assignment: EntityHacsAssignment) -> HacsAssignmentOut:
    return _assignment_to_out(assignment)
