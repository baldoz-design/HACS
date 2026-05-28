import strategyDocuments from "@/data/strategy_documents_candidates.json";

export type StrategyDocumentConfidence = "High" | "Medium" | "Low";

export type StrategyDocumentIntegrationStatus =
  | "verified"
  | "candidate"
  | "exclude_or_special_case";

export interface StrategyDocumentRecord {
  entity_id: number;
  acronym: string;
  full_name: string;
  entity_type: string;
  document_type: string;
  document_title: string;
  year_or_period: string;
  source_url: string;
  pdf_url: string;
  publication_date: string;
  confidence: StrategyDocumentConfidence;
  integration_status: StrategyDocumentIntegrationStatus;
  reason: string;
  notes: string;
}

export interface StrategyDocumentCatalog {
  source: string;
  year: number;
  created_at: string;
  integration_statuses: Record<StrategyDocumentIntegrationStatus, string>;
  records: StrategyDocumentRecord[];
}

const catalog = strategyDocuments as StrategyDocumentCatalog;

export function getStrategyDocumentCatalog() {
  return catalog;
}

export function getStrategyDocumentsByEntityId() {
  return new Map(catalog.records.map((record) => [record.entity_id, record]));
}

export function getIngestibleStrategyDocuments() {
  return catalog.records.filter((record) => record.integration_status === "verified");
}

export function getCandidateStrategyDocuments() {
  return catalog.records.filter((record) => record.integration_status === "candidate");
}
