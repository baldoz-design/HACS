from __future__ import annotations
import os
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from db import get_session
from models import Entity, OutreachRequest, OutreachResult, AIStatusOut

router = APIRouter(prefix="/api", tags=["outreach"])

SYSTEM_PROMPT = (
    "You are a business development assistant helping draft outreach emails "
    "for HACS (Harmonised Advisory and Consulting Services) framework opportunities. "
    "Do not invent facts, awards, names, rates, or contacts. "
    "Use only the entity data provided in this prompt. "
    "If you are uncertain about a fact, omit it."
)

PURPOSE_LABELS = {
    "intro": "initial introduction",
    "follow_up": "follow-up",
    "proposal_intro": "proposal introduction",
    "meeting_request": "meeting request",
}

TONE_LABELS = {
    "formal": "formal and professional",
    "professional": "professional and direct",
    "friendly": "friendly and approachable",
}


@router.get("/ai/status", response_model=AIStatusOut)
def ai_status():
    if os.getenv("ANTHROPIC_API_KEY"):
        return AIStatusOut(available=True, provider="anthropic", model="claude-haiku-4-5-20251001")
    if os.getenv("OPENAI_API_KEY"):
        return AIStatusOut(available=True, provider="openai", model="gpt-4o-mini")
    return AIStatusOut(available=False)


@router.post("/outreach/generate", response_model=OutreachResult)
def generate_outreach(req: OutreachRequest, session: Session = Depends(get_session)):
    entity = session.exec(select(Entity).where(Entity.id == req.entity_id)).first()
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")

    purpose_label = PURPOSE_LABELS.get(req.purpose, req.purpose)
    tone_label = TONE_LABELS.get(req.tone, req.tone)

    anthropic_key = os.getenv("ANTHROPIC_API_KEY")
    openai_key = os.getenv("OPENAI_API_KEY")

    entity_context = (
        f"Entity: {entity.name} ({entity.acronym})\n"
        f"Location: {entity.city}, {entity.country}\n"
        f"Cluster: {entity.cluster}\n"
        f"Relationship signal: {entity.relationship_signal}\n"
    )
    if entity.notes:
        entity_context += f"Notes: {entity.notes}\n"
    if req.context:
        entity_context += f"Additional context: {req.context}\n"

    user_prompt = (
        f"Draft a {tone_label} {purpose_label} email to {entity.name} ({entity.acronym}) "
        f"in the context of the HACS framework contract. "
        f"Entity details:\n{entity_context}\n"
        f"Return ONLY a JSON object with keys 'subject' and 'body'."
    )

    if anthropic_key:
        result = _call_anthropic(anthropic_key, user_prompt)
        if result:
            return OutreachResult(**result, ai_generated=True, model_used="claude-haiku-4-5-20251001")
    elif openai_key:
        result = _call_openai(openai_key, user_prompt)
        if result:
            return OutreachResult(**result, ai_generated=True, model_used="gpt-4o-mini")

    return _template_outreach(entity, purpose_label, tone_label)


def _call_anthropic(api_key: str, prompt: str) -> dict | None:
    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)
        msg = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}],
        )
        import json
        text = msg.content[0].text.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        return json.loads(text)
    except Exception:
        return None


def _call_openai(api_key: str, prompt: str) -> dict | None:
    try:
        import urllib.request
        import json
        payload = json.dumps({
            "model": "gpt-4o-mini",
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            "max_tokens": 1024,
            "response_format": {"type": "json_object"},
        }).encode()
        req = urllib.request.Request(
            "https://api.openai.com/v1/chat/completions",
            data=payload,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read())
        return json.loads(data["choices"][0]["message"]["content"])
    except Exception:
        return None


def _template_outreach(entity, purpose_label: str, tone_label: str) -> OutreachResult:
    """Fallback template when no AI key is available."""
    subject = f"HACS Framework — {purpose_label.title()} | {entity.acronym}"
    body = (
        f"Dear {entity.name} team,\n\n"
        f"We are reaching out in the context of the HACS (Harmonised Advisory and Consulting Services) "
        f"framework contract to explore potential collaboration opportunities.\n\n"
        f"[Add your specific message here based on the entity's profile and your objectives.]\n\n"
        f"We would welcome the opportunity to discuss how we can support {entity.acronym}'s objectives "
        f"within the HACS framework.\n\n"
        f"Best regards,\n[Your name]"
    )
    return OutreachResult(subject=subject, body=body, ai_generated=False)
