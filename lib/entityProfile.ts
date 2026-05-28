import type { Entity } from "./types";
import entityProfiles from "@/data/entity_profiles.json";

interface EntityProfile {
  type: string;
  policyArea: string;
  description: string;
  mission: string;
  sourceLabel: string;
  sourceUrl: string | null;
  confidence: "High" | "Medium" | "Low";
  websiteUrl: string | null;
  annualBudgetEur: number | null;
  annualBudgetLabel: string | null;
  annualBudgetNote: string | null;
  annualBudgetSourceTitle: string | null;
  annualBudgetSourceUrl: string | null;
  logoUrl: string | null;
}

interface EntityProfileRow {
  entity_id: number;
  acronym: string;
  description: string;
  mission: string;
  source_title: string;
  source_url: string | null;
  source_type: string;
  confidence: "High" | "Medium" | "Low";
  website_url: string | null;
  annual_budget_eur: number | null;
  annual_budget_label?: string | null;
  annual_budget_note?: string | null;
  annual_budget_source_title: string | null;
  annual_budget_source_url: string | null;
  logo_url?: string | null;
}

const webProfilesByEntityId = new Map(
  (entityProfiles.profiles as EntityProfileRow[]).map((profile) => [
    profile.entity_id,
    profile,
  ])
);

export function getEntityAnnualBudgetEur(entityId: number): number | null {
  return webProfilesByEntityId.get(entityId)?.annual_budget_eur ?? null;
}

const POLICY_REPLACEMENTS: Record<string, string> = {
  "agriculture and rural development": "agriculture, rural development and related EU policy delivery",
  "budget": "EU budget planning, execution and financial governance",
  "climate action": "climate policy and the EU green transition",
  "communications networks content and technology": "digital policy, connectivity, platforms and technology",
  "defence industry and space": "defence industry, space policy and strategic capabilities",
  "economic and financial affairs": "economic policy, fiscal surveillance and financial affairs",
  "employment social affairs and inclusion": "employment, social affairs and inclusion",
  "financial stability and capital markets union": "financial stability, capital markets and regulatory policy",
  "health and food safety": "public health, food safety and related EU programmes",
  "internal market industry entrepreneurship and smes": "internal market, industry, entrepreneurship and SMEs",
  "migration and home affairs": "migration, internal security and home affairs",
  "mobility and transport": "transport, mobility systems and related EU policy",
  "neighbourhood and enlargement": "neighbourhood policy, enlargement and external cooperation",
  "regional and urban policy": "regional development, cohesion policy and urban policy",
  "research and innovation": "research, innovation and EU knowledge programmes",
  "structural reform support": "structural reform, public administration and institutional capacity",
  "taxation and customs union": "taxation, customs union and related enforcement cooperation",
};

function normalizedName(entity: Entity) {
  return entity.name.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

function entityType(entity: Entity) {
  const name = normalizedName(entity);
  if (entity.is_ec_dg) return "European Commission service";
  if (name.includes("joint undertaking") || entity.acronym.endsWith("_JU")) return "EU joint undertaking";
  if (name.includes("executive agency")) return "EU executive agency";
  if (name.includes("agency")) return "EU agency";
  if (name.includes("authority")) return "EU authority";
  if (name.includes("office")) return "EU office";
  if (name.includes("committee")) return "EU advisory body";
  if (name.includes("court")) return "EU judicial or audit institution";
  if (name.includes("bank") || name.includes("fund")) return "EU financial institution";
  if (name.includes("parliament")) return "EU institution";
  if (name.includes("centre") || name.includes("center")) return "EU specialised centre";
  if (name.includes("foundation")) return "EU foundation";
  if (name.includes("supervisor")) return "EU supervisory authority";
  return "EU body";
}

function policyArea(entity: Entity) {
  const name = normalizedName(entity)
    .replace(/^european /, "")
    .replace(/^eu /, "")
    .replace(/^union /, "")
    .replace(/^directorate general for /, "")
    .replace(/^directorate general /, "")
    .replace(/ agency$/, "")
    .replace(/ authority$/, "")
    .replace(/ office$/, "")
    .replace(/ joint undertaking$/, "")
    .replace(/ executive agency$/, "")
    .replace(/ european commission$/, "")
    .trim();

  return POLICY_REPLACEMENTS[name] ?? name;
}

function missionVerb(type: string) {
  if (type === "European Commission service") {
    return "defines, coordinates and implements EU policy";
  }
  if (type === "EU executive agency") {
    return "manages EU programmes and turns policy priorities into funded operations";
  }
  if (type === "EU joint undertaking") {
    return "coordinates public-private research and innovation programmes";
  }
  if (type === "EU authority" || type === "EU supervisory authority") {
    return "provides supervision, coordination and specialist oversight";
  }
  if (type === "EU judicial or audit institution") {
    return "supports accountability, legal certainty and institutional oversight";
  }
  if (type === "EU financial institution") {
    return "supports EU investment, financing and economic policy objectives";
  }
  if (type === "EU advisory body") {
    return "provides institutional representation, consultation and policy advice";
  }
  return "supports EU policy delivery, operational coordination and specialist expertise";
}

export function getEntityProfile(entity: Entity): EntityProfile {
  const webProfile = webProfilesByEntityId.get(entity.id);
  const type = entityType(entity);
  const area = policyArea(entity);
  if (webProfile) {
    return {
      type,
      policyArea: area,
      description: webProfile.description,
      mission: webProfile.mission,
      sourceLabel:
        webProfile.source_type === "wikipedia"
          ? `Wikipedia · ${webProfile.source_title}`
          : webProfile.source_type === "xlsx_user_supplied"
            ? webProfile.source_title
          : "Local entity registry",
      sourceUrl: webProfile.source_url,
      confidence: webProfile.confidence,
      websiteUrl: webProfile.website_url,
      annualBudgetEur: webProfile.annual_budget_eur,
      annualBudgetLabel: webProfile.annual_budget_label ?? null,
      annualBudgetNote: webProfile.annual_budget_note ?? null,
      annualBudgetSourceTitle: webProfile.annual_budget_source_title,
      annualBudgetSourceUrl: webProfile.annual_budget_source_url,
      logoUrl: webProfile.logo_url ?? null,
    };
  }

  return {
    type,
    policyArea: area,
    description: `${entity.name} (${entity.acronym}) is a ${type} based in ${entity.city}, ${entity.country}.`,
    mission: `Its mission is to ${missionVerb(type)} in the area of ${area}.`,
    sourceLabel: "Derived from entity registry",
    sourceUrl: null,
    confidence: "Low",
    websiteUrl: null,
    annualBudgetEur: null,
    annualBudgetLabel: null,
    annualBudgetNote: null,
    annualBudgetSourceTitle: null,
    annualBudgetSourceUrl: null,
    logoUrl: null,
  };
}
