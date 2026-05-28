import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
ENTITIES_FILE = ROOT / "data" / "entities.json"
EXECUTION_FILE = ROOT / "data" / "beacon_execution_public.json"
OUTPUT_FILE = ROOT / "data" / "beacon_execution_coverage_plan.json"


def load_json(path: Path):
    return json.loads(path.read_text())


def source_types_for_entity(entity: dict) -> list[str]:
    name = str(entity["name"])
    acronym = str(entity["acronym"])

    if entity.get("is_ec_dg"):
        return ["specific_contracts", "annual_contracts", "programme_contract_pages"]
    if "Joint Undertaking" in name or acronym.endswith("_JU"):
        return ["specific_contracts", "annual_contracts", "programme_contract_pages"]
    if "Executive Agency" in name or acronym in {"HADEA", "EISMEA", "EACEA", "REA", "ERCEA"}:
        return ["programme_contract_pages", "specific_contracts", "annual_contracts"]
    return ["annual_contracts", "contracts_awarded", "specific_contracts"]


def wave_for_entity(entity: dict, covered_acronyms: set[str]) -> int:
    acronym = str(entity["acronym"])
    name = str(entity["name"])
    cluster = str(entity["cluster"])

    if acronym in covered_acronyms:
        return 0
    if entity.get("is_ec_dg"):
        return 1
    if acronym in {"EIB", "ECA", "CJEU", "EEAS", "ENISA", "EUIPO", "EUROPOL", "eu-LISA", "HADEA", "EESC", "EP"}:
        return 1
    if cluster in {"Brussels", "Luxembourg"}:
        return 2
    if "Joint Undertaking" in name or "Executive Agency" in name:
        return 2
    return 3


def query_templates(entity: dict) -> list[str]:
    name = str(entity["name"])
    acronym = str(entity["acronym"])
    return [
        f'site:.europa.eu "{name}" "DIGIT/2020/OP/0005"',
        f'site:.europa.eu "{name}" "BEACON"',
        f'site:.europa.eu "{acronym}" "DIGIT/2020/OP/0005"',
        f'site:.europa.eu "{name}" "annual list of contracts" pdf',
        f'site:.europa.eu "{name}" "specific contract" pdf',
    ]


def main() -> None:
    entities = load_json(ENTITIES_FILE)
    execution_rows = load_json(EXECUTION_FILE)
    covered_acronyms = {str(row["entity_acronym"]) for row in execution_rows}
    checked_no_evidence = {
        "ECA",
        "EEAS",
        "ENISA",
        "EUIPO",
        "eu-LISA",
        "EIB",
        "CJEU",
        "REA",
        "EMA",
        "CdT",
        "EIOPA",
        "EEA",
        "EUROJUST",
        "EDPS",
        "EUROHPC",
        "CBE_JU",
        "F4E",
        "EPPO",
        "IHI_JU",
        "SESAR",
        "COR",
        "SNS_JU",
        "EURSC",
        "CHIPS_JU",
        "CA_JU",
        "EIF",
        "EC",
        "EASA",
        "EFSA",
        "EIGE",
        "ELA",
        "ESMA",
        "FRA",
        "FRONTEX",
        "EU_LISA",
        "CEDEFOP",
        "ERA",
        "EU_OSHA",
        "BEREC",
        "EUDA",
        "ETF",
        "EUI",
        "ECCC",
    }
    indirect_only = {"REA", "EDA", "EISMEA", "ERCEA", "ECHA", "EUAA", "CEPOL", "ECDC", "CPVO"}
    follow_up_needed = {
        "DG_AGRI",
        "DG_BUDG",
        "DG_CLIMA",
        "DG_COMP",
        "DG_CONNECT",
        "DG_DEFIS",
        "DG_EAC",
        "DG_ECFIN",
        "DG_EMPL",
        "DG_ENER",
        "DG_ENV",
        "DG_FISMA",
        "DG_GROW",
        "DG_HOME",
        "DG_JUST",
        "DG_MARE",
        "DG_MOVE",
        "DG_REFORM",
        "DG_REGIO",
        "DG_RTD",
        "DG_SANTE",
        "DG_TAXUD",
        "DG_TRADE",
        "DG_ECHO",
        "DG_INTPA",
        "DG_NEAR",
        "DG_DIGIT",
        "DG_HR",
        "DG_COMM",
        "DG_OLAF",
        "DG_ESTAB",
        "DG_SG",
        "DG_PMO",
        "DG_OIB",
        "DG_OIL",
        "DG_BUDGET",
        "DG_CNECT",
        "DG_ESTAT",
        "DG_JRC",
        "OLAF",
        "SG",
        "SJ",
        "SFPI",
        "DG_SCIC",
        "DG_DGT",
        "OIB",
        "OIL",
        "PMO",
        "EPSO_EC",
        "OP",
        "IAS",
        "EACEA",
        "EDCTP3_JU",
        "ESA",
        "CFSP",
        "AMLA",
    }

    plan_rows = []
    for entity in entities:
        acronym = str(entity["acronym"])
        if acronym in covered_acronyms:
            status = "covered"
        elif acronym in indirect_only:
            status = "indirect_only"
        elif acronym in follow_up_needed:
            status = "follow_up_needed"
        elif acronym in checked_no_evidence:
            status = "checked_no_public_beacon_evidence"
        else:
            status = "pending"
        wave = wave_for_entity(entity, covered_acronyms)
        plan_rows.append(
            {
                "entity_id": entity["id"],
                "acronym": acronym,
                "name": entity["name"],
                "cluster": entity["cluster"],
                "country": entity["country"],
                "is_ec_dg": bool(entity.get("is_ec_dg")),
                "status": status,
                "coverage_wave": wave,
                "target_source_types": source_types_for_entity(entity),
                "search_queries": query_templates(entity),
            }
        )

    payload = {
        "framework_reference": "DIGIT/2020/OP/0005",
        "total_entities": len(entities),
        "covered_entities": len(covered_acronyms),
        "rows": plan_rows,
    }
    OUTPUT_FILE.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    main()
