import managementPlanAnalysis from "@/data/management_plan_analysis.json";

export interface ManagementPlanPriority {
  id: string;
  title: string;
}

export interface ManagementPlanObjective {
  code: string;
  title: string;
  hacs_field: number | null;
  ec_priority: ManagementPlanPriority | null;
  evidence: string;
}

export interface ManagementPlanAction {
  title: string;
  evidence: string;
  page: number;
  hacs_field: number | null;
  ec_priority: ManagementPlanPriority | null;
  score: number;
}

export interface ManagementPlanActionTheme {
  id: string;
  title: string;
  summary: string;
  hacs_field: number | null;
  ec_priority: ManagementPlanPriority | null;
  action_count: number;
  avg_score: number;
  pages: number[];
  evidence: Array<{
    title: string;
    page: number;
    score: number;
  }>;
}

export interface ManagementPlanNeed {
  need: string;
  hacs_field: number | null;
  strength: "High" | "Medium" | "Low";
  supporting_actions: string[];
}

export interface ManagementPlanAnalysisRecord {
  entity_id: number;
  entity_acronym: string;
  department: string;
  title: string;
  source_url: string;
  pdf_url: string;
  publication_date: string;
  pages_analyzed: number;
  mission_context: string;
  objectives: ManagementPlanObjective[];
  actions: ManagementPlanAction[];
  action_themes?: ManagementPlanActionTheme[];
  needs: ManagementPlanNeed[];
  top_hacs_fields: { field: number; score: number }[];
}

export interface ManagementPlanAnalysisCatalog {
  source: string;
  source_catalog: string;
  year: number;
  analyzed_at: string;
  records_analyzed: number;
  records: ManagementPlanAnalysisRecord[];
}

const catalog = managementPlanAnalysis as ManagementPlanAnalysisCatalog;

export function getManagementPlanAnalysisCatalog() {
  return catalog;
}

export function getManagementPlanAnalysisByEntityId() {
  return new Map(catalog.records.map((record) => [record.entity_id, record]));
}
