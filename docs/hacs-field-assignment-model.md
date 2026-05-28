# HACS Field Assignment Model

This document describes the first assignment model used to pre-classify EU entities against the five HACS fields.

## Principle

The assignment is a suggested decision aid, not a locked truth. It produces a primary field, optional secondary field, confidence, rationale, scores, and evidence. Human review should approve, override, or lock the assignment before it becomes a stable field for proposal work.

## Weights

- Mission fit: 45%
- Procurement fit: 25%
- Execution evidence fit: 20%
- Keyword / semantic fit: 10%

Mission fit has the strongest weight because it is the only signal available for every entity and protects the model from overfitting to uneven TED coverage.

## Inputs

- Entity metadata: acronym, name, cluster, DG status, notes.
- Latest intelligence snapshot: TED/procurement signals and BEACON execution evidence.
- Assignment rules: [hacs_field_assignment_rules.json](/Users/davide/Documents/EU%20HACS%20Matirx/data/hacs_field_assignment_rules.json).

## Field Logic

Field 1 - IT Strategy & Governance:
Digital infrastructure, cybersecurity, IT systems, interoperability, cloud, architecture, ICT governance.

Field 2 - Project & Programme Management:
Executive agencies, joint undertakings, funding programmes, grants, portfolio delivery, PMO, implementation support.

Field 3 - Organisational Transformation:
New or scaling bodies, operating model, process redesign, capacity building, training, skills, change management.

Field 4 - Digital Strategy, Governance, AI & Data:
Data-heavy agencies, digital policy, AI, analytics, knowledge hubs, data spaces, secure processing, scientific evidence platforms.

Field 5 - Audit, Risk & Compliance:
Supervisory, legal, audit, anti-fraud, financial, enforcement, regulatory, compliance-heavy bodies.

## Persistence

Assignments are stored in `entity_hacs_assignment` with:

- `primary_field`
- `secondary_field`
- `confidence`
- `status`
- `rationale`
- `field_scores_json`
- `evidence_json`
- `model_version`
- `locked_by_user`

The generation step does not overwrite `Entity.top_hacs_field` by default. It can apply suggestions to entities only when explicitly requested with `apply_to_entities=true`.

## API

- `GET /api/hacs-assignments`
- `GET /api/hacs-assignments/{entity_id}`
- `POST /api/hacs-assignments/generate`

Generation request:

```json
{
  "entity_ids": [1, 2, 3],
  "apply_to_entities": false
}
```

If `entity_ids` is omitted, the backend generates suggestions for all entities.
