# Execution Evidence Pipeline

## Goal

Build a supplier-specific evidence dataset for competitor analysis.

The dataset must answer:

- which EU entity used the framework or related advisory services
- which supplier executed the work
- what the work was about
- what value was disclosed
- which source proves the record

## Evidence Types

### Supplier-Specific Execution

Use this for competitor rankings.

Required fields:

- `entity_acronym` or `client_name`
- `supplier_name`
- `contract_title`
- `source_url`
- `framework_reference` or strong textual BEACON/HACS evidence

Preferred fields:

- `contract_value_eur`
- `contract_start`
- `contract_end`
- `lot_reference`
- `specific_contract_reference`
- `hacs_field`

### Framework Aggregate

Do not use this for supplier ranking or value attribution.

Examples:

- a framework award notice listing all Lot 1 / Lot 2 winners
- one total framework value associated with many suppliers
- supplier field containing `Lot 1:` / `Lot 2:` winner lists

Use only as context for framework presence.

### Relationship / News Signal

Do not use this for execution value.

Examples:

- news articles
- case studies
- public references to a supplier and entity without value or contract proof

Use later for relationship intelligence.

## Recommended Sources

Priority order:

1. Annual lists of contracts and specific contracts published by each entity.
2. Entity procurement pages with downloadable PDF lists.
3. TED notices only when they expose a supplier-specific award.
4. Public programme pages listing specific contracts.
5. Web/news only after the execution dataset is stable.

## Source Values

Use these `PastAllocation.source` values:

- `beacon_execution_public`: curated confirmed records already in `data/beacon_execution_public.json`
- `beacon_execution_discovery`: newly discovered supplier-specific execution records
- `beacon_direct`: BEACON framework award/backbone records, not supplier-specific execution

## Discovery File

Newly discovered records should be staged in:

```text
data/beacon_execution_discovery.json
```

Expected shape:

```json
[
  {
    "entity_acronym": "EUROPOL",
    "client_name": "EU Agency for Law Enforcement Cooperation",
    "contract_title": "Benchmarking, Advisory and Consultancy Services in Information and Communication Technology",
    "supplier_name": "Tremend Software Consulting SRL",
    "contract_start": "2024-01-01",
    "contract_end": null,
    "contract_value_eur": 153644,
    "role": "annual awarded contract under BEACON",
    "hacs_field": 2,
    "field_of_expertise": "Europol annual contracts entry under DIGIT/2020/OP/0005.",
    "framework_reference": "DIGIT/2020/OP/0005",
    "lot_reference": "Lot 2",
    "source_url": "https://example.eu/source.pdf",
    "confidence_of_match": 0.95
  }
]
```

Validation rules:

- `client_name`, `contract_title`, `supplier_name`, and `source_url` are required.
- `supplier_name` must not be an aggregate Lot 1 / Lot 2 winner list.
- `contract_value_eur`, if present, must be numeric.
- `hacs_field`, if present, must be between `1` and `5`.

## UI Rules

Competitor ranking includes:

- `beacon_execution_public`
- `beacon_execution_discovery`

Competitor ranking excludes:

- `beacon_direct`
- rows where supplier name contains aggregate lot lists such as `Lot 1:` / `Lot 2:`
- rows without a supplier

Entity intelligence can use supplier-specific execution as historical execution evidence.
Framework aggregate records must not be shown as execution evidence.
