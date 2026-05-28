import json
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any, Optional

ROOT = Path(__file__).resolve().parents[2]
ENTITIES_FILE = ROOT / "data" / "entities.json"
OUTPUT_FILE = ROOT / "data" / "entity_profiles.json"

WIKI_API = "https://en.wikipedia.org/w/api.php"
WIKIDATA_API = "https://www.wikidata.org/w/api.php"


def load_entities() -> list[dict[str, Any]]:
    return json.loads(ENTITIES_FILE.read_text())


def request_json(url: str) -> dict[str, Any]:
    req = urllib.request.Request(
        url,
        headers={
            "Accept": "application/json",
            "User-Agent": "EU-HACS-Matrix/1.0 profile enrichment",
        },
    )
    with urllib.request.urlopen(req, timeout=15) as response:
        return json.loads(response.read())


def wiki_search(entity: dict[str, Any]) -> Optional[dict[str, Any]]:
    query = f"{entity['name']} {entity['acronym']} European Union"
    params = urllib.parse.urlencode(
        {
            "action": "query",
            "format": "json",
            "list": "search",
            "srsearch": query,
            "srlimit": 5,
            "utf8": 1,
        }
    )
    data = request_json(f"{WIKI_API}?{params}")
    results = data.get("query", {}).get("search", [])
    if not results:
        return None

    name_terms = {
        part.casefold()
        for part in re.split(r"[^A-Za-z0-9]+", entity["name"])
        if len(part) >= 4
    }
    acronym = str(entity["acronym"]).casefold().replace("_", "-")

    def score(result: dict[str, Any]) -> int:
        title = str(result.get("title") or "")
        snippet = re.sub("<[^>]+>", " ", str(result.get("snippet") or ""))
        haystack = f"{title} {snippet}".casefold()
        total = 0
        if acronym and acronym in haystack:
            total += 4
        if "european union" in haystack or title.casefold().startswith("european"):
            total += 3
        total += sum(1 for term in name_terms if term in haystack)
        return total

    ranked = sorted(results, key=score, reverse=True)
    return ranked[0] if score(ranked[0]) >= 3 else None


def entity_terms(entity: dict[str, Any]) -> set[str]:
    stopwords = {
        "agency",
        "authority",
        "european",
        "union",
        "office",
        "centre",
        "center",
        "joint",
        "undertaking",
        "directorate",
        "general",
        "commission",
        "executive",
    }
    return {
        part.casefold()
        for part in re.split(r"[^A-Za-z0-9]+", str(entity["name"]))
        if len(part) >= 4 and part.casefold() not in stopwords
    }


def page_matches_entity(entity: dict[str, Any], page: dict[str, str]) -> bool:
    text = f"{page.get('title', '')} {page.get('extract', '')}".casefold()
    if "may refer to" in text or "may stand for" in text:
        return False

    acronym = str(entity["acronym"]).replace("_", " ").casefold()
    name = str(entity["name"]).casefold()
    if name in text:
        return True
    if acronym and acronym in text and ("european" in text or "eu " in text):
        return True

    terms = entity_terms(entity)
    if not terms:
        return False
    hits = sum(1 for term in terms if term in text)
    return hits >= max(1, min(2, len(terms)))


def wiki_extract(title: str) -> Optional[dict[str, str]]:
    params = urllib.parse.urlencode(
        {
            "action": "query",
            "format": "json",
            "prop": "extracts|info",
            "exintro": 1,
            "explaintext": 1,
            "inprop": "url",
            "titles": title,
            "redirects": 1,
            "utf8": 1,
        }
    )
    data = request_json(f"{WIKI_API}?{params}")
    pages = data.get("query", {}).get("pages", {})
    if not pages:
        return None
    page = next(iter(pages.values()))
    extract = str(page.get("extract") or "").strip()
    if not extract:
        return None
    return {
        "title": str(page.get("title") or title),
        "url": str(page.get("fullurl") or ""),
        "extract": extract,
    }


def title_candidates(entity: dict[str, Any]) -> list[str]:
    name = str(entity["name"]).strip()
    acronym = str(entity["acronym"]).replace("_", " ").strip()
    candidates = [name]
    if entity.get("is_ec_dg"):
        candidates.extend(
            [
                f"Directorate-General for {name}",
                f"Directorate-General {name}",
                f"European Commission Directorate-General for {name}",
            ]
        )
    candidates.extend(
        [
            acronym,
            name.replace("EU ", "European Union "),
            name.replace("JU", "Joint Undertaking"),
        ]
    )
    seen: set[str] = set()
    unique: list[str] = []
    for candidate in candidates:
        key = candidate.casefold()
        if candidate and key not in seen:
            seen.add(key)
            unique.append(candidate)
    return unique


def wiki_batch_extracts(titles: list[str]) -> dict[str, dict[str, str]]:
    pages_by_title: dict[str, dict[str, str]] = {}
    for start in range(0, len(titles), 45):
        batch = titles[start : start + 45]
        params = urllib.parse.urlencode(
            {
                "action": "query",
                "format": "json",
                "prop": "extracts|info",
                "exintro": 1,
                "explaintext": 1,
                "inprop": "url",
                "titles": "|".join(batch),
                "redirects": 1,
                "utf8": 1,
            }
        )
        try:
            data = request_json(f"{WIKI_API}?{params}")
            pages = data.get("query", {}).get("pages", {})
            redirects = {
                str(item.get("from") or "").casefold(): str(item.get("to") or "").casefold()
                for item in data.get("query", {}).get("redirects", [])
            }
            for page in pages.values():
                if "missing" in page:
                    continue
                extract = str(page.get("extract") or "").strip()
                title = str(page.get("title") or "").strip()
                if title and extract:
                    profile_page = {
                        "title": title,
                        "url": str(page.get("fullurl") or ""),
                        "extract": extract,
                    }
                    pages_by_title[title.casefold()] = profile_page
                    for original, redirected in redirects.items():
                        if redirected == title.casefold():
                            pages_by_title[original] = profile_page
            time.sleep(0.4)
        except Exception as exc:
            print(f"warn: batch extract failed: {exc}")
            time.sleep(2)
    return pages_by_title


def wikidata_for_title(title: str) -> Optional[dict[str, Any]]:
    params = urllib.parse.urlencode(
        {
            "action": "wbgetentities",
            "format": "json",
            "sites": "enwiki",
            "titles": title,
            "props": "claims",
        }
    )
    try:
        data = request_json(f"{WIKIDATA_API}?{params}")
    except Exception:
        return None
    entities = data.get("entities", {})
    if not entities:
        return None
    entity = next(iter(entities.values()))
    if entity.get("missing"):
        return None
    return entity


def first_claim_value(entity: dict[str, Any], property_id: str) -> Any:
    claims = entity.get("claims", {}).get(property_id, [])
    if not claims:
        return None
    mainsnak = claims[0].get("mainsnak", {})
    return mainsnak.get("datavalue", {}).get("value")


def annual_budget_from_wikidata(entity: dict[str, Any]) -> tuple[Optional[float], Optional[str]]:
    value = first_claim_value(entity, "P2769")
    if not isinstance(value, dict):
        return None, None
    amount = value.get("amount")
    unit = str(value.get("unit") or "")
    if not amount:
        return None, None
    try:
        parsed = float(str(amount).replace("+", ""))
    except ValueError:
        return None, None
    currency = "EUR" if unit.endswith("/Q4916") else None
    return parsed, currency


def profile_structured_data(page: dict[str, str]) -> dict[str, Any]:
    item = wikidata_for_title(page["title"])
    if not item:
        return {
            "website_url": None,
            "annual_budget_eur": None,
            "annual_budget_source_title": None,
            "annual_budget_source_url": None,
        }

    website = first_claim_value(item, "P856")
    budget, currency = annual_budget_from_wikidata(item)
    return {
        "website_url": website if isinstance(website, str) else None,
        "annual_budget_eur": budget if currency == "EUR" else None,
        "annual_budget_source_title": "Wikidata budget property" if budget and currency == "EUR" else None,
        "annual_budget_source_url": f"https://www.wikidata.org/wiki/{item.get('id')}" if budget and currency == "EUR" else None,
    }


def clean_sentence(text: str) -> str:
    cleaned = re.sub(r"\s+", " ", text).strip()
    cleaned = re.sub(r"\[[^\]]+\]", "", cleaned).strip()
    return cleaned


def first_sentences(text: str, max_chars: int = 280) -> str:
    sentences = re.split(r"(?<=[.!?])\s+", clean_sentence(text))
    picked: list[str] = []
    for sentence in sentences:
        if not sentence:
            continue
        candidate = " ".join([*picked, sentence]).strip()
        if len(candidate) > max_chars and picked:
            break
        picked.append(sentence)
        if len(candidate) >= 140:
            break
    result = " ".join(picked).strip()
    if len(result) <= max_chars:
        return result
    return result[: max_chars - 3].rsplit(" ", 1)[0].strip() + "..."


def fallback_type(entity: dict[str, Any]) -> str:
    name = str(entity["name"]).lower()
    if entity.get("is_ec_dg"):
        return "European Commission service"
    if "joint undertaking" in name or str(entity["acronym"]).endswith("_JU"):
        return "EU joint undertaking"
    if "executive agency" in name:
        return "EU executive agency"
    if "agency" in name:
        return "EU agency"
    if "authority" in name or "supervisor" in name:
        return "EU authority"
    if "office" in name:
        return "EU office"
    if "committee" in name:
        return "EU advisory body"
    if "court" in name:
        return "EU judicial or audit institution"
    if "bank" in name or "fund" in name:
        return "EU financial institution"
    return "EU body"


def fallback_profile(entity: dict[str, Any]) -> dict[str, Any]:
    entity_type = fallback_type(entity)
    area = str(entity["name"])
    return {
        "entity_id": entity["id"],
        "acronym": entity["acronym"],
        "description": f"{entity['name']} ({entity['acronym']}) is a {entity_type} based in {entity['city']}, {entity['country']}.",
        "mission": f"Its mission is to support EU policy delivery and specialist work in the area of {area}.",
        "source_title": "Local entity registry",
        "source_url": None,
        "source_type": "derived_registry",
        "confidence": "Low",
        "website_url": None,
        "annual_budget_eur": None,
        "annual_budget_source_title": None,
        "annual_budget_source_url": None,
    }


def mission_from_extract(entity: dict[str, Any], extract: str) -> str:
    description = first_sentences(extract, max_chars=220)
    if "mission" in extract.casefold():
        mission_sentence = next(
            (
                clean_sentence(sentence)
                for sentence in re.split(r"(?<=[.!?])\s+", extract)
                if "mission" in sentence.casefold()
            ),
            "",
        )
        if mission_sentence:
            return first_sentences(mission_sentence, max_chars=240)
    name = str(entity["name"])
    return f"Its mission is reflected in its mandate: {description}" if description else f"Its mission is to deliver the EU mandate of {name}."


def sourced_profile(entity: dict[str, Any], page: dict[str, str]) -> dict[str, Any]:
    if not page_matches_entity(entity, page):
        return fallback_profile(entity)

    description = first_sentences(page["extract"], max_chars=260)
    mission = mission_from_extract(entity, page["extract"])
    structured = profile_structured_data(page)
    return {
        "entity_id": entity["id"],
        "acronym": entity["acronym"],
        "description": description,
        "mission": mission,
        "source_title": page["title"],
        "source_url": page["url"],
        "source_type": "wikipedia",
        "confidence": "Medium",
        **structured,
    }


def build_profile(entity: dict[str, Any]) -> dict[str, Any]:
    try:
        result = wiki_search(entity)
        time.sleep(0.15)
        if result:
            page = wiki_extract(str(result["title"]))
            time.sleep(0.15)
            if page:
                return sourced_profile(entity, page)
    except Exception as exc:
        print(f"warn: {entity['acronym']} profile fetch failed: {exc}")

    return fallback_profile(entity)


def main() -> None:
    entities = load_entities()
    all_candidates: list[str] = []
    candidate_map: dict[int, list[str]] = {}
    for entity in entities:
        candidates = title_candidates(entity)
        candidate_map[entity["id"]] = candidates
        all_candidates.extend(candidates)

    pages = wiki_batch_extracts(all_candidates)
    profiles: list[dict[str, Any]] = []
    unresolved: list[dict[str, Any]] = []
    for entity in entities:
        page = next(
            (
                pages.get(candidate.casefold())
                for candidate in candidate_map[entity["id"]]
                if pages.get(candidate.casefold())
            ),
            None,
        )
        if page:
            profiles.append(sourced_profile(entity, page))
        else:
            unresolved.append(entity)

    # Limited fallback search for unresolved items. Batch title matching handles most safe cases;
    # this slower path improves coverage without making the API work too hard.
    for index, entity in enumerate(unresolved, start=1):
        profiles.append(build_profile(entity))
        if index % 10 == 0:
            time.sleep(3)

    profiles.sort(key=lambda profile: int(profile["entity_id"]))
    OUTPUT_FILE.write_text(json.dumps({"profiles": profiles}, indent=2, ensure_ascii=False) + "\n")
    sourced = sum(1 for profile in profiles if profile["source_type"] != "derived_registry")
    print(f"Wrote {len(profiles)} profiles to {OUTPUT_FILE}")
    print(f"Web-sourced profiles: {sourced}; derived fallback: {len(profiles) - sourced}")


if __name__ == "__main__":
    main()
