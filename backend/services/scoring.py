import json
from typing import List, Optional

from backend.models import Entity, ProviderService, TeamMix, Explanation


def _parse_fields(svc: ProviderService) -> List[int]:
    return json.loads(svc.hacs_fields)


def compute_fit_scores(
    hacs_field: int,
    dst_services: List[ProviderService],
    bcg_services: List[ProviderService],
) -> tuple[float, float, float]:
    dst_field = [s for s in dst_services if hacs_field in _parse_fields(s)]
    bcg_field = [s for s in bcg_services if hacs_field in _parse_fields(s)]

    dst_fit = (
        sum(s.delivery_strength for s in dst_field) / len(dst_field)
        if dst_field else 0.0
    )
    bcg_fit = (
        sum(s.delivery_strength for s in bcg_field) / len(bcg_field)
        if bcg_field else 0.0
    )
    synergy = 0.5 if (dst_fit > 0 and bcg_fit > 0) else 0.0
    combined_fit = min(5.0, (dst_fit + bcg_fit) / 2 + synergy)

    return round(dst_fit, 2), round(bcg_fit, 2), round(combined_fit, 2)


def compute_technical_score(
    entity: Entity,
    hacs_field: int,
    provider_mix: str,
    dst_services: List[ProviderService],
    bcg_services: List[ProviderService],
    team_mix: TeamMix,
) -> tuple[float, dict]:
    dst_field = [s for s in dst_services if hacs_field in _parse_fields(s)]
    bcg_field = [s for s in bcg_services if hacs_field in _parse_fields(s)]

    dst_avg = sum(s.delivery_strength for s in dst_field) / len(dst_field) if dst_field else 0.0
    bcg_avg = sum(s.delivery_strength for s in bcg_field) / len(bcg_field) if bcg_field else 0.0

    # Field coverage: 0–35 pts
    if provider_mix == "dst":
        coverage = min(35.0, dst_avg * 5.5 + bcg_avg * 1.5)
    elif provider_mix == "bcg":
        coverage = min(35.0, bcg_avg * 5.5 + dst_avg * 1.5)
    else:  # combined
        coverage = min(35.0, (dst_avg + bcg_avg) * 3.5)

    # Relationship bonus: 0–15 pts
    rel_map = {
        "both": 15,
        "bcg_contact": 12 if provider_mix in ("bcg", "combined") else 6,
        "dst_contact": 12 if provider_mix in ("dst", "combined") else 6,
        "none": 0,
    }
    rel_bonus = rel_map.get(entity.relationship_signal, 0)

    # Team mix: 0–10 pts (5 if no days entered)
    total_days = (
        team_mix.senior_dst + team_mix.senior_bcg +
        team_mix.expert_dst + team_mix.expert_bcg +
        team_mix.junior_dst + team_mix.junior_bcg
    )
    if total_days > 0:
        senior = team_mix.senior_dst + team_mix.senior_bcg
        team_bonus = min(10.0, (senior / total_days) * 20)
    else:
        team_bonus = 5.0

    # Service breadth: 0–10 pts
    total_services = len(dst_services) + len(bcg_services)
    breadth = min(10.0, total_services * 1.5)

    raw = coverage + rel_bonus + team_bonus + breadth
    score = round(min(70.0, raw), 1)

    breakdown = {
        "coverage": round(coverage, 1),
        "rel_bonus": rel_bonus,
        "team_bonus": round(team_bonus, 1),
        "breadth": round(breadth, 1),
    }
    return score, breakdown


def compute_financial_score(price_posture: str) -> float:
    posture_map = {"competitive": 0.90, "balanced": 0.70, "premium": 0.50}
    ratio = posture_map.get(price_posture, 0.70)
    return round(ratio * 30, 1)


def bid_recommendation(total_score: float) -> str:
    if total_score >= 70:
        return "Bid recommended"
    elif total_score >= 50:
        return "Monitor"
    return "No-bid recommended"


def lead_provider(provider_mix: str) -> str:
    labels = {"dst": "Dst", "bcg": "BCG", "combined": "Dst + BCG"}
    return labels.get(provider_mix, provider_mix.upper())


def build_explanation(
    entity: Entity,
    hacs_field: int,
    provider_mix: str,
    dst_services: List[ProviderService],
    bcg_services: List[ProviderService],
    team_mix: TeamMix,
    breakdown: dict,
) -> Explanation:
    dst_field = [s for s in dst_services if hacs_field in _parse_fields(s)]
    bcg_field = [s for s in bcg_services if hacs_field in _parse_fields(s)]

    factors = [
        ("Field service coverage", breakdown["coverage"]),
        ("Relationship signal", breakdown["rel_bonus"]),
        ("Team seniority", breakdown["team_bonus"]),
        ("Service breadth", breakdown["breadth"]),
    ]
    top_factor = max(factors, key=lambda x: x[1])[0]

    total_days = (
        team_mix.senior_dst + team_mix.senior_bcg +
        team_mix.expert_dst + team_mix.expert_bcg +
        team_mix.junior_dst + team_mix.junior_bcg
    )

    components = [
        f"Field coverage: {breakdown['coverage']}/35 pts — {'strong' if breakdown['coverage'] > 20 else 'weak'} service alignment to field {hacs_field}",
        f"Relationship: {breakdown['rel_bonus']}/15 pts — contact signal is '{entity.relationship_signal}'",
        f"Team mix: {breakdown['team_bonus']}/10 pts — {'days specified' if total_days > 0 else 'using default (no days entered)'}",
        f"Service breadth: {breakdown['breadth']}/10 pts — {len(dst_services) + len(bcg_services)} service(s) selected",
    ]

    risks = []
    if not dst_field:
        risks.append("No Dst services selected cover this HACS field")
    if not bcg_field:
        risks.append("No BCG services selected cover this HACS field")
    if entity.relationship_signal == "none":
        risks.append("No confirmed contact at this entity — cold outreach required")
    if provider_mix == "combined" and (not dst_field or not bcg_field):
        risks.append("Combined mix selected but only one provider covers this field")

    missing = []
    if total_days == 0:
        missing.append("Specify team profile days to sharpen the team mix score")
    if len(dst_services) + len(bcg_services) < 2:
        missing.append("Select at least 2 services to build a credible offer package")
    if entity.top_hacs_field is None:
        missing.append("Entity HACS field not confirmed — validate with client contact")

    return Explanation(
        top_factor=top_factor,
        components=components,
        risks=risks[:3],
        missing_proof_points=missing[:3],
    )
