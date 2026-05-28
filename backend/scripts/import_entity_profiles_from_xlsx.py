import json
import re
import sys
from pathlib import Path
from typing import Any

import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
ENTITIES_FILE = ROOT / "data" / "entities.json"
OUTPUT_FILE = ROOT / "data" / "entity_profiles.json"


def clean(value: Any) -> str | None:
    if value is None or pd.isna(value):
        return None
    text = str(value).strip()
    return text or None


def parse_budget_eur(label: str | None) -> float | None:
    if not label:
        return None

    text = label.lower()
    first_clause = re.split(r";|\+", text, maxsplit=1)[0]
    budget_text = re.sub(r"20\d{2}\s*(?:-|–)\s*20\d{2}", "", first_clause)
    number_match = re.search(
        r"(\d+(?:[,.]\d+)?)\s*(?:-|–)\s*(\d+(?:[,.]\d+)?)\s*(miliardi|mld|milioni|mln|million|billion)?",
        budget_text,
    )
    if number_match:
        low = float(number_match.group(1).replace(",", "."))
        high = float(number_match.group(2).replace(",", "."))
        number = (low + high) / 2
        unit = number_match.group(3) or ""
    else:
        number_match = re.search(
            r"(\d+(?:[,.]\d+)?)\s*(miliardi|mld|milioni|mln|million|billion)?",
            budget_text,
        )
        if not number_match:
            return None
        number = float(number_match.group(1).replace(",", "."))
        unit = number_match.group(2) or ""

    if unit in {"miliardi", "mld", "billion"}:
        return round(number * 1_000_000_000)
    if unit in {"milioni", "mln", "million"}:
        return round(number * 1_000_000)

    # Most rows are already expressed in euros; tiny bare numbers are usually millions.
    if number < 10_000:
        return round(number * 1_000_000)
    return round(number)


def logo_url_from_row(row: Any) -> str | None:
    return (
        clean(row.get("URL Logo (SVG/PNG)"))
        or clean(row.get("URL Logo ufficiale / Wikimedia"))
    )


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("Usage: import_entity_profiles_from_xlsx.py /path/to/EU_Enti_Scheda_Sintesi.xlsx")

    workbook_path = Path(sys.argv[1]).expanduser()
    entities = json.loads(ENTITIES_FILE.read_text())
    df = pd.read_excel(workbook_path, sheet_name="Enti UE", header=1)
    df = df[df["Acronimo"].notna()]

    rows_by_acronym = {
        str(row["Acronimo"]).strip(): row
        for _, row in df.iterrows()
    }

    missing = sorted({entity["acronym"] for entity in entities} - set(rows_by_acronym))
    extra = sorted(set(rows_by_acronym) - {entity["acronym"] for entity in entities})
    if missing or extra:
        raise SystemExit(
            f"Acronym mismatch. Missing in xlsx: {missing}. Extra in xlsx: {extra}."
        )

    profiles = []
    for entity in entities:
        row = rows_by_acronym[entity["acronym"]]
        budget_label = clean(row.get("Budget annuale"))
        budget_note = clean(row.get("Note budget"))
        logo_url = logo_url_from_row(row)
        annual_budget_eur = parse_budget_eur(budget_label)
        profiles.append(
            {
                "entity_id": entity["id"],
                "acronym": entity["acronym"],
                "description": clean(row.get("Descrizione")) or entity["name"],
                "mission": clean(row.get("Mission")) or "",
                "source_title": workbook_path.name,
                "source_url": None,
                "source_type": "xlsx_user_supplied",
                "confidence": "High",
                "website_url": clean(row.get("Sito ufficiale")),
                "annual_budget_eur": annual_budget_eur,
                "annual_budget_label": budget_label,
                "annual_budget_note": budget_note,
                "annual_budget_source_title": workbook_path.name if budget_label else None,
                "annual_budget_source_url": None,
                "logo_url": logo_url,
            }
        )

    OUTPUT_FILE.write_text(
        json.dumps({"profiles": profiles}, indent=2, ensure_ascii=False) + "\n"
    )
    print(f"Wrote {len(profiles)} profiles to {OUTPUT_FILE}")
    print("Source: xlsx_user_supplied")


if __name__ == "__main__":
    main()
