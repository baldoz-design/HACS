import json
from typing import List, Dict
from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from backend.db import get_session
from backend.models import ProviderService, CombinedPackage, ServiceOut, PackageOut

router = APIRouter(prefix="/api", tags=["services"])


def _to_service_out(s: ProviderService) -> ServiceOut:
    return ServiceOut(
        id=s.id,
        provider=s.provider,
        name=s.name,
        description=s.description,
        hacs_fields=json.loads(s.hacs_fields),
        delivery_strength=s.delivery_strength,
    )


def _to_package_out(p: CombinedPackage) -> PackageOut:
    return PackageOut(
        id=p.id,
        name=p.name,
        provider_lead=p.provider_lead,
        dst_service_ids=json.loads(p.dst_service_ids),
        bcg_service_ids=json.loads(p.bcg_service_ids),
        target_fields=json.loads(p.target_fields),
        description=p.description,
    )


@router.get("/services", response_model=Dict[str, List[ServiceOut]])
def list_services(session: Session = Depends(get_session)):
    all_services = session.exec(select(ProviderService).order_by(ProviderService.id)).all()
    return {
        "dst": [_to_service_out(s) for s in all_services if s.provider == "dst"],
        "bcg": [_to_service_out(s) for s in all_services if s.provider == "bcg"],
    }


@router.get("/packages", response_model=List[PackageOut])
def list_packages(session: Session = Depends(get_session)):
    pkgs = session.exec(select(CombinedPackage).order_by(CombinedPackage.id)).all()
    return [_to_package_out(p) for p in pkgs]
