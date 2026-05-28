import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from backend.db import get_session
from backend.models import (
    Entity, ProviderService, Scenario,
    ComputeRequest, ComputeResult, SaveScenarioRequest, ScenarioOut,
)
from backend.services.scoring import (
    compute_fit_scores,
    compute_technical_score,
    compute_financial_score,
    bid_recommendation,
    lead_provider,
    build_explanation,
)

router = APIRouter(prefix="/api/scenarios", tags=["scenarios"])


def _resolve(request: ComputeRequest, session: Session):
    entity = session.get(Entity, request.entity_id)
    if not entity:
        raise HTTPException(status_code=404, detail=f"Entity {request.entity_id} not found")

    all_services = session.exec(
        select(ProviderService).where(
            ProviderService.id.in_(request.dst_service_ids + request.bcg_service_ids)
        )
    ).all()

    svc_map = {s.id: s for s in all_services}
    dst_services = [svc_map[i] for i in request.dst_service_ids if i in svc_map]
    bcg_services = [svc_map[i] for i in request.bcg_service_ids if i in svc_map]

    return entity, dst_services, bcg_services


@router.post("/compute", response_model=ComputeResult)
def compute_scenario(request: ComputeRequest, session: Session = Depends(get_session)):
    entity, dst_svcs, bcg_svcs = _resolve(request, session)

    dst_fit, bcg_fit, combined_fit = compute_fit_scores(
        request.hacs_field, dst_svcs, bcg_svcs
    )
    technical, breakdown = compute_technical_score(
        entity, request.hacs_field, request.provider_mix,
        dst_svcs, bcg_svcs, request.team_mix,
    )
    financial = compute_financial_score(request.price_posture)
    total = round(technical + financial, 1)
    recommendation = bid_recommendation(total)
    provider = lead_provider(request.provider_mix)
    explanation = build_explanation(
        entity, request.hacs_field, request.provider_mix,
        dst_svcs, bcg_svcs, request.team_mix, breakdown,
    )

    return ComputeResult(
        dst_fit=dst_fit,
        bcg_fit=bcg_fit,
        combined_fit=combined_fit,
        technical_score=technical,
        financial_score=financial,
        total_score=total,
        bid_recommendation=recommendation,
        lead_provider=provider,
        explanation=explanation,
    )


@router.post("", response_model=ScenarioOut)
def save_scenario(request: SaveScenarioRequest, session: Session = Depends(get_session)):
    entity, dst_svcs, bcg_svcs = _resolve(request, session)

    _, breakdown = compute_technical_score(
        entity, request.hacs_field, request.provider_mix,
        dst_svcs, bcg_svcs, request.team_mix,
    )
    technical, breakdown = compute_technical_score(
        entity, request.hacs_field, request.provider_mix,
        dst_svcs, bcg_svcs, request.team_mix,
    )
    financial = compute_financial_score(request.price_posture)
    total = round(technical + financial, 1)

    scenario = Scenario(
        entity_id=request.entity_id,
        hacs_field=request.hacs_field,
        provider_mix=request.provider_mix,
        dst_service_ids=json.dumps(request.dst_service_ids),
        bcg_service_ids=json.dumps(request.bcg_service_ids),
        price_posture=request.price_posture,
        team_mix_json=json.dumps(request.team_mix.model_dump()),
        technical_score=technical,
        financial_score=financial,
        total_score=total,
        bid_recommendation=bid_recommendation(total),
    )
    session.add(scenario)
    session.commit()
    session.refresh(scenario)

    return ScenarioOut(
        id=scenario.id,
        entity_id=scenario.entity_id,
        hacs_field=scenario.hacs_field,
        provider_mix=scenario.provider_mix,
        dst_service_ids=request.dst_service_ids,
        bcg_service_ids=request.bcg_service_ids,
        price_posture=scenario.price_posture,
        technical_score=scenario.technical_score,
        financial_score=scenario.financial_score,
        total_score=scenario.total_score,
        bid_recommendation=scenario.bid_recommendation,
        created_at=scenario.created_at,
    )


@router.get("", response_model=List[ScenarioOut])
def list_scenarios(
    entity_id: Optional[int] = Query(default=None),
    session: Session = Depends(get_session),
):
    query = select(Scenario).order_by(Scenario.created_at.desc())
    if entity_id is not None:
        query = query.where(Scenario.entity_id == entity_id)
    rows = session.exec(query).all()

    return [
        ScenarioOut(
            id=r.id,
            entity_id=r.entity_id,
            hacs_field=r.hacs_field,
            provider_mix=r.provider_mix,
            dst_service_ids=json.loads(r.dst_service_ids),
            bcg_service_ids=json.loads(r.bcg_service_ids),
            price_posture=r.price_posture,
            technical_score=r.technical_score,
            financial_score=r.financial_score,
            total_score=r.total_score,
            bid_recommendation=r.bid_recommendation,
            created_at=r.created_at,
        )
        for r in rows
    ]
