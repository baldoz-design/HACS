import json
from pathlib import Path
import yaml
from sqlmodel import Session, select

from db import engine
from models import Entity, ProviderService, CombinedPackage, PastAllocation
from services import annex71 as annex71_svc

DATA_DIR = Path(__file__).parent.parent / "data"
ENTITIES_FILE = DATA_DIR / "entities.json"
SERVICES_FILE = DATA_DIR / "provider_services.yaml"


def _is_empty(session: Session) -> bool:
    return session.exec(select(Entity).limit(1)).first() is None


def seed_entities(session: Session) -> None:
    with open(ENTITIES_FILE) as f:
        rows = json.load(f)
    for row in rows:
        session.add(Entity(**row))


def seed_services(session: Session) -> None:
    with open(SERVICES_FILE) as f:
        data = yaml.safe_load(f)

    for svc in data.get("dst_services", []):
        session.add(ProviderService(
            id=svc["id"],
            provider="dst",
            name=svc["name"],
            description=svc["description"],
            hacs_fields=json.dumps(svc["hacs_fields"]),
            delivery_strength=svc["delivery_strength"],
        ))

    for svc in data.get("bcg_services", []):
        session.add(ProviderService(
            id=svc["id"],
            provider="bcg",
            name=svc["name"],
            description=svc["description"],
            hacs_fields=json.dumps(svc["hacs_fields"]),
            delivery_strength=svc["delivery_strength"],
        ))

    for pkg in data.get("combined_packages", []):
        session.add(CombinedPackage(
            id=pkg["id"],
            name=pkg["name"],
            provider_lead=pkg["provider_lead"],
            dst_service_ids=json.dumps(pkg["dst_service_ids"]),
            bcg_service_ids=json.dumps(pkg["bcg_service_ids"]),
            target_fields=json.dumps(pkg["target_fields"]),
            description=pkg["description"],
        ))


def _annex71_empty(session: Session) -> bool:
    return session.exec(select(PastAllocation)).first() is None


def run_seed() -> None:
    with Session(engine) as session:
        if _is_empty(session):
            seed_entities(session)
            seed_services(session)
            session.commit()
            print("✓ Database seeded")
        if _annex71_empty(session):
            count = annex71_svc.parse_annex71(session)
            print(f"✓ Annex 7.1: {count} records imported")
