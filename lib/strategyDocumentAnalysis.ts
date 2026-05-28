import strategyDocumentAnalysis from "@/data/strategy_document_analysis.json";

export interface StrategyAnalysisPriority {
  id: string;
  title: string;
}

export interface StrategyAnalysisObjective {
  code: string;
  title: string;
  hacs_field: number | null;
  ec_priority: StrategyAnalysisPriority | null;
  evidence: string;
}

export interface StrategyAnalysisAction {
  title: string;
  evidence: string;
  page: number;
  hacs_field: number | null;
  ec_priority: StrategyAnalysisPriority | null;
  score: number;
}

export interface StrategyAnalysisActionTheme {
  id: string;
  title: string;
  summary: string;
  hacs_field: number | null;
  ec_priority: StrategyAnalysisPriority | null;
  action_count: number;
  avg_score: number;
  pages: number[];
  evidence: Array<{
    title: string;
    page: number;
    score: number;
  }>;
}

export interface StrategyAnalysisNeed {
  need: string;
  hacs_field: number | null;
  strength: "High" | "Medium" | "Low";
  supporting_actions: string[];
}

export interface StrategyDocumentAnalysisRecord {
  entity_id: number;
  entity_acronym: string;
  entity_name: string;
  entity_type: string;
  document_type: string;
  title: string;
  source_url: string;
  pdf_url: string;
  publication_date: string;
  pages_analyzed: number;
  source_quality: {
    integration_status: string;
    validation_status: string;
    confidence: string;
    source_ok: boolean | null;
    pdf_ok: boolean | null;
    pdf_official_domain: boolean | null;
    notes: string[];
  };
  mission_context: string;
  objectives: StrategyAnalysisObjective[];
  actions: StrategyAnalysisAction[];
  action_themes: StrategyAnalysisActionTheme[];
  needs: StrategyAnalysisNeed[];
  top_hacs_fields: { field: number; score: number }[];
  analysis_error?: string;
}

export interface StrategyDocumentAnalysisCatalog {
  source: string;
  source_catalog: string;
  validation_catalog: string;
  year: number;
  analyzed_at: string;
  records_analyzed: number;
  records: StrategyDocumentAnalysisRecord[];
}

const catalog = strategyDocumentAnalysis as StrategyDocumentAnalysisCatalog;

export function getStrategyDocumentAnalysisCatalog() {
  return catalog;
}

export function getStrategyDocumentAnalysisByEntityId() {
  return new Map(catalog.records.map((record) => [record.entity_id, record]));
}
