import difflib
import json
from pathlib import Path
from typing import Optional
from sqlmodel import Session, select

from backend.models import Entity

THRESHOLD = 0.75
DATA_DIR = Path(__file__).parent.parent.parent / "data"
ALIASES_FILE = DATA_DIR / "entity_aliases.json"


def _normalize(value: str) -> str:
    return " ".join(value.lower().strip().split())


def _load_aliases() -> dict[str, list[str]]:
    if not ALIASES_FILE.exists():
        return {}
    with open(ALIASES_FILE) as f:
        raw = json.load(f)
    return {
        str(key): [str(item).strip() for item in values if str(item).strip()]
        for key, values in raw.items()
        if isinstance(values, list)
    }


def match_entity(session: Session, raw_name: str) -> Optional[int]:
    """Return entity.id for the best fuzzy match, or None if below threshold."""
    entities = session.exec(select(Entity)).all()
    best_ratio = 0.0
    best_id: Optional[int] = None
    raw_lower = _normalize(raw_name)
    aliases_by_acronym = _load_aliases()

    for ent in entities:
        candidates = [ent.name, ent.acronym, *aliases_by_acronym.get(ent.acronym, [])]
        for candidate in candidates:
            normalized_candidate = _normalize(candidate)
            if raw_lower == normalized_candidate:
                return ent.id
            ratio = difflib.SequenceMatcher(None, raw_lower, normalized_candidate).ratio()
            if ratio > best_ratio:
                best_ratio = ratio
                best_id = ent.id

    return best_id if best_ratio >= THRESHOLD else None
