import difflib
from typing import Optional
from sqlmodel import Session, select

from models import Entity

THRESHOLD = 0.75


def match_entity(session: Session, raw_name: str) -> Optional[int]:
    """Return entity.id for the best fuzzy match, or None if below threshold."""
    entities = session.exec(select(Entity)).all()
    best_ratio = 0.0
    best_id: Optional[int] = None
    raw_lower = raw_name.lower().strip()

    for ent in entities:
        for candidate in [ent.name, ent.acronym]:
            ratio = difflib.SequenceMatcher(None, raw_lower, candidate.lower()).ratio()
            if ratio > best_ratio:
                best_ratio = ratio
                best_id = ent.id

    return best_id if best_ratio >= THRESHOLD else None
