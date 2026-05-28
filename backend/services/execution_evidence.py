from __future__ import annotations

from backend.models import PastAllocation

SUPPLIER_EXECUTION_SOURCES = {
    "beacon_execution_public",
    "beacon_execution_discovery",
}


def is_framework_aggregate_supplier(raw_supplier: str | None) -> bool:
    supplier = raw_supplier or ""
    return " | Lot " in supplier or "Lot 1:" in supplier or "Lot 2:" in supplier


def is_supplier_specific_execution(row: PastAllocation) -> bool:
    return (
        row.source in SUPPLIER_EXECUTION_SOURCES
        and bool(row.supplier_name)
        and not is_framework_aggregate_supplier(row.supplier_name)
    )


def execution_evidence_type(row: PastAllocation) -> str:
    if is_supplier_specific_execution(row):
        return "supplier_specific_execution"
    if row.source in SUPPLIER_EXECUTION_SOURCES and is_framework_aggregate_supplier(row.supplier_name):
        return "framework_aggregate"
    if row.source == "beacon_direct":
        return "framework_award"
    return "other"
