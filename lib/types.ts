export type RelationshipSignal = "none" | "bcg_contact" | "dst_contact" | "both";

export interface Entity {
  id: number;
  acronym: string;
  name: string;
  city: string;
  country: string;
  cluster: "Brussels" | "Luxembourg" | "Frankfurt" | "The Hague" | "Other";
  parent_id: number | null;
  top_hacs_field: number | null;
  relationship_signal: RelationshipSignal;
  notes: string | null;
  is_ec_dg: boolean;
}

export interface EntityWithScore extends Entity {
  priority_score: number;
  cluster_budget_eur: number;
  cluster_share_eur: number;
  cluster_entity_count: number;
}

export interface Competitor {
  rank: number;
  name: string;
  is_consortium: boolean;
  key_members: string;
}

export const HACS_FIELDS: Record<number, { label: string; color: string }> = {
  1: { label: "IT Strategy & Governance", color: "#8B5CF6" },
  2: { label: "Project & Programme Mgmt", color: "#0EA5E9" },
  3: { label: "Organisational Transformation", color: "#10B981" },
  4: { label: "Digital Strategy, Governance, AI & Data", color: "#F59E0B" },
  5: { label: "Audit, Risk & Compliance", color: "#EF4444" },
};

export const CLUSTER_BUDGETS: Record<string, number> = {
  Brussels: 82_500_000,
  Luxembourg: 32_800_000,
  Frankfurt: 8_000_000,
  "The Hague": 8_000_000,
  Other: 111_017_267,
};
