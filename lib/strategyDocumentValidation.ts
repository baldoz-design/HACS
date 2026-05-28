import strategyDocumentValidation from "@/data/strategy_documents_validation.json";

export type StrategyDocumentValidationStatus =
  | "verified"
  | "candidate"
  | "exclude_or_special_case";

export interface StrategyDocumentValidationRecord {
  entity_id: number;
  acronym: string;
  full_name: string;
  document_type: string;
  document_title: string;
  confidence: string;
  previous_status: string;
  recommended_status: StrategyDocumentValidationStatus;
  source_url: string;
  source_ok: boolean;
  source_status_code: number | null;
  source_final_url: string;
  source_page_title: string;
  pdf_url: string;
  pdf_ok: boolean;
  pdf_status_code: number | null;
  pdf_content_type: string;
  pdf_official_domain: boolean;
  resolved_pdf_url: string;
  resolved_pdf_score: number | null;
  validation_notes: string[];
}

export interface StrategyDocumentValidationCatalog {
  source: string;
  validated_at: string;
  records_validated: number;
  recommended_status_counts: Record<StrategyDocumentValidationStatus, number>;
  records: StrategyDocumentValidationRecord[];
}

const catalog = strategyDocumentValidation as StrategyDocumentValidationCatalog;

export function getStrategyDocumentValidationCatalog() {
  return catalog;
}

export function getStrategyDocumentValidationByEntityId() {
  return new Map(catalog.records.map((record) => [record.entity_id, record]));
}
