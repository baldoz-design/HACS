# EU HACS Matrix

EU HACS Matrix is a local-first workspace for exploring HACS framework entities, building proposal scenarios, importing historical allocation data, and drafting outreach support.

The repository contains:

- a Next.js 16 frontend in `app/`, `components/`, and `lib/`
- a FastAPI backend in `backend/`
- seed data in `data/entities.json` and `data/provider_services.yaml`
- Annex 7.1 source data in `data/input/` as legacy reference only

## Repository Layout

```text
.
|-- app/                  # Next.js App Router pages
|-- components/           # UI components
|-- lib/                  # frontend state, scoring, API helpers
|-- backend/              # FastAPI app, SQLModel models, import services
|-- data/                 # JSON/YAML seed data and Excel inputs
|-- public/               # static assets
`-- .env.example          # local environment template
```

## Prerequisites

- Node.js 24+
- npm 11+
- Python 3.9+

## Frontend Setup

Install frontend dependencies from the repository root:

```bash
npm install
```

Create a local environment file if you need to override the backend URL:

```bash
cp .env.example .env.local
```

By default the frontend calls `http://localhost:8001`. You can override it with:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8001
```

## Backend Setup

Create a virtual environment and install backend dependencies:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cd ..
```

The backend uses a local SQLite database at `backend/hacs.db`. Database tables are created automatically on startup and seed data is loaded on first run.

## Running Locally

Start the frontend only:

```bash
npm run dev:web
```

Start the backend only:

```bash
npm run dev:api
```

Equivalent direct command:

```bash
python3 -m uvicorn backend.main:app --reload --port 8001
```

Start both together:

```bash
npm run dev:all
```

Default local URLs:

- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend healthcheck: [http://localhost:8001/api/health](http://localhost:8001/api/health)

## Data Notes

- `data/entities.json` seeds the entity map used by the homepage and proposal lab.
- `data/provider_services.yaml` seeds DST, BCG, and combined packages.
- `data/input/1.7.1_Annex_7.1_Contract_list_template_v2_V3_DST.xlsx` remains available only as a legacy reference and is not considered a reliable source for core historical intelligence.
- Historical awards should be synced directly from the BEACON backbone around `DIGIT/2020/OP/0005`.
- CSV allocations can also be uploaded from the Import page.
- Historical-award CSV uploads can include optional enrichment columns such as `supplier_name`, `framework_reference`, `lot_reference`, `source_url`, `field_of_expertise`, `contract_start`, `contract_end`, and `confidence_of_match`.

## Development Commands

```bash
npm run lint
npm run lint:fix
npm run build
```

## AI Integrations

Outreach generation supports optional provider keys:

```env
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
```

Without keys, the backend falls back to a deterministic template response.

## Git Workflow

This repository's Git root is the repository root directory, not a `hacs-web/` subfolder.

Typical flow:

```bash
git status
git add .
git commit -m "Your change"
git push
```

Run `git push` from the repository root:

```text
/Users/davide/Documents/EU HACS Matirx
```
