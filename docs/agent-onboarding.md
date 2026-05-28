# Agent Onboarding Guide

This document gives coding agents the product, architecture, data, and workflow context needed to work safely on the EU HACS Dashboard.

## Product Intent

EU HACS Dashboard supports Dst and BCG in identifying and qualifying EU advisory opportunities connected to the HACS framework.

The working funnel is:

1. Scout opportunity signals across EU entities.
2. Match entity needs to HACS fields and Dst/BCG capabilities.
3. Compare opportunity quality across entities.
4. Support internal bid / monitor / no-bid decisions.

The product is not meant to be a generic CRM. It is an intelligence and decision-support tool.

## Current Product Areas

- `Entity Map` at `/`: main entity exploration page, with entity cards and drawers.
- `DG Strategy` at `/dg-strategy`: Commission DG strategy intelligence based on 2026 Management Plans.
- `Non-DG Strategy` at `/non-dg-strategy`: strategy document intelligence for agencies, joint undertakings, executive agencies, institutions, and other non-DG bodies.
- `TED Spend` at `/ted-spend`: spend intelligence over TED CPV areas of interest.
- `Magicissimi` at `/competitors`: competitor intelligence page. The route is still `/competitors`; only the visible nav label is playful.

Some legacy pages exist but are intentionally hidden from the header:

- `/import`
- `/outreach`
- `/propose`

Do not reintroduce them into the main navigation unless explicitly requested.

## Technology Stack

- Frontend: Next.js `16.2.6`, React `19`, App Router.
- Styling: Tailwind CSS v4 style classes plus CSS variables in `app/globals.css`.
- Backend: FastAPI with SQLModel-style local SQLite persistence.
- Local DB: `backend/hacs.db`, ignored by Git.
- Data layer: JSON/YAML files in `data/`, plus backend services and scripts.

Important Next.js note:

This repository intentionally uses a newer Next.js version. Before editing Next APIs, routing, layouts, server/client boundaries, or image/font behavior, read the relevant local docs under:

```text
node_modules/next/dist/docs/
```

This requirement is also captured in `AGENTS.md`.

## Local Setup

Install dependencies:

```bash
npm install
```

Backend environment:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cd ..
```

Run both frontend and backend:

```bash
npm run dev:all
```

Run individually:

```bash
npm run dev:web
npm run dev:api
```

Default URLs:

- Frontend: `http://localhost:3000`
- Backend healthcheck: `http://localhost:8001/api/health`

Useful verification:

```bash
npm run lint
npm run build
```

`npm run build` may need network access because `next/font` fetches Google fonts.

## Repository Structure

```text
app/                 Next.js App Router pages
components/          Shared UI components
lib/                 Frontend helpers, typed JSON accessors, scoring utilities
backend/             FastAPI app, routers, services, scripts
data/                Source data, generated analysis JSON, cached PDF text
docs/                Data-source, pipeline, and product notes
public/              Static frontend assets
```

## Backend Shape

Backend entrypoint:

```text
backend/main.py
```

Routers:

- `backend/routers/entities.py`
- `backend/routers/intelligence.py`
- `backend/routers/hacs_assignments.py`
- `backend/routers/allocations.py`
- `backend/routers/services.py`
- `backend/routers/scenarios.py`
- `backend/routers/import_routes.py`
- `backend/routers/outreach.py`

Important services:

- `backend/services/ted_search.py`: TED search and CPV-based procurement intelligence.
- `backend/services/intelligence.py`: entity intelligence aggregation.
- `backend/services/intelligence_batch.py`: batch refresh support.
- `backend/services/hacs_assignment.py`: HACS field assignment logic.
- `backend/services/beacon_history.py`: BEACON historical reconstruction.
- `backend/services/beacon_execution_discovery.py`: open-source execution evidence discovery.
- `backend/services/execution_evidence.py`: execution evidence normalization helpers.

## Data Source Policy

Treat data quality as product-critical. Do not add broad scraping or unverified sources without marking source confidence.

Source hierarchy currently used:

1. TED and official EU procurement data.
2. Official Commission Management Plans 2026 for DGs.
3. Official non-DG strategy documents: Single Programming Documents, Annual Work Programmes, Programming Documents, Work Programmes and Budgets.
4. BEACON / historical execution evidence from public official or strongly attributable sources.
5. Open web/news only as supporting context, not as primary scoring evidence.

Important: `data/input/1.7.1_Annex_7.1_Contract_list_template_v2_V3_DST.xlsx` is legacy reference only. It is not considered reliable for core historical intelligence.

## Main Data Files

Core entity/profile data:

- `data/entities.json`
- `data/entity_profiles.json`
- `data/entity_aliases.json`
- `data/provider_services.yaml`

HACS assignment:

- `data/hacs_field_assignment_rules.json`

DG strategy:

- `data/management_plans.json`
- `data/management_plan_analysis.json`
- `data/management_plan_text/`

Non-DG strategy:

- `data/strategy_documents_candidates.json`
- `data/strategy_documents_validation.json`
- `data/strategy_document_analysis.json`
- `data/strategy_document_text/`

Execution evidence / BEACON:

- `data/beacon_execution_public.json`
- `data/beacon_execution_discovery.json`
- `data/beacon_execution_coverage_plan.json`

Competitors:

- `data/competitors.json`

## Data Pipeline Scripts

DG Management Plans:

```bash
python3 backend/scripts/refresh_management_plans.py
python3 backend/scripts/analyze_management_plans.py
```

Non-DG strategy documents:

```bash
python3 backend/scripts/validate_strategy_documents.py
python3 backend/scripts/analyze_strategy_documents.py
```

Entity profiles:

```bash
python3 backend/scripts/build_entity_profiles.py
python3 backend/scripts/import_entity_profiles_from_xlsx.py
```

BEACON / execution evidence:

```bash
python3 backend/scripts/generate_beacon_execution_coverage_plan.py
```

## Strategy Document Statuses

Non-DG source validation uses three status buckets:

- `verified`: official source/PDF is robust enough for automatic analysis.
- `candidate`: official or plausible source identified, but not robust enough for automatic ingestion without follow-up.
- `exclude_or_special_case`: not comparable to the standard strategy-document pipeline.

Do not collapse `candidate` into `verified` just to improve apparent coverage.

## Product Modeling Notes

### HACS Fields

Configured in `lib/types.ts`:

1. IT Strategy & Governance
2. Project & Programme Mgmt
3. Organisational Transformation
4. Digital Strategy, Governance, AI & Data
5. Audit, Risk & Compliance

Assignment rules live in:

```text
data/hacs_field_assignment_rules.json
```

### Strategy Intelligence

DG and Non-DG strategy analysis both extract:

- mission context
- objectives
- planned actions
- synthesized action themes
- needs
- top HACS fields
- source links and source quality

The synthesized `action_themes` are the preferred UI unit. Avoid showing long raw action lists as primary content.

### TED Spend

TED Spend focuses on CPV families of interest:

- `72`: IT services
- `73`: R&D and related consultancy
- `79`: business, management, legal, accounting, marketing, consulting

The product distinguishes:

- tender budget / estimated value
- awarded value from award notices

Do not conflate the two.

### Execution Evidence

Execution evidence is different from TED signals:

- TED signals indicate procurement activity and potential demand.
- Execution evidence indicates historical delivery or framework usage, especially around BEACON/HACS predecessor context.

Keep this distinction visible in reasoning and UI.

## Frontend Conventions

Shared navigation:

```text
components/AppNav.tsx
```

Entity card/drawer:

```text
components/EntityCard.tsx
components/EntityDrawer.tsx
```

Typed JSON accessors live in `lib/`. Prefer adding typed accessors there instead of importing JSON directly in many components.

Current design direction:

- black header with white Dst/BCG logos
- restrained warm neutral UI
- avoid overly colorful badges and excessive chip noise
- prioritize readable decision-support summaries over raw data dumps

## Git and Generated Files

Ignored:

- `node_modules/`
- `.next/`
- `backend/*.db`
- `.env*`
- Python caches

Committed generated data:

- JSON source catalogs
- JSON analysis outputs
- text caches for official PDFs

This is intentional for now because the app is local-first and needs to be navigable without re-running every data collection job.

Before committing, check:

```bash
git status --short
find . -path ./.git -prune -o -type f -size +10M -print
npm run lint
npm run build
```

## Known Caveats

- `BEREC` currently appears in `strategy_document_analysis.json` with an analysis error because the candidate PDF URL returned `404` during analysis.
- Some `candidate` non-DG sources are official pages but still need direct PDF resolution.
- PDF parsing can produce noisy warnings for malformed documents. `analyze_strategy_documents.py` limits parsing to the first relevant pages to keep runs practical.
- `Magicissimi` is only a nav label for the competitors page; do not rename routes unless requested.
- The repository path contains a typo: `EU HACS Matirx`. Do not assume it is `Matrix` in local commands.

## Recommended Agent Workflow

1. Read this document, `README.md`, and `AGENTS.md`.
2. Inspect the relevant page/component/service before editing.
3. Preserve source confidence and data-status distinctions.
4. Prefer minimal, high-signal UI changes.
5. Run `npm run lint`.
6. Run `npm run build` for route/type changes.
7. Do not commit local DBs, `.env`, `.next`, or `node_modules`.

## Useful Docs

- `docs/source-validation-plan.md`
- `docs/source-validation-results.md`
- `docs/execution-signals-sources.md`
- `docs/execution-evidence-pipeline.md`
- `docs/hacs-field-assignment-model.md`
- `docs/beacon-reconstruction-checklist.md`
- `docs/beacon-execution-coverage.md`
