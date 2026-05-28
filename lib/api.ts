const rawApiBase =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8001";

export const API_BASE = rawApiBase.replace(/\/$/, "");

export interface ApiEntity {
  id: number;
  acronym: string;
  name: string;
  city: string;
  country: string;
  cluster: string;
  parent_id: number | null;
  top_hacs_field: number | null;
  relationship_signal: string;
  notes: string | null;
  is_ec_dg: boolean;
}

export interface ApiService {
  id: number;
  provider: string;
  name: string;
  description: string;
  hacs_fields: number[];
  delivery_strength: number;
}

export interface ApiServicesResponse {
  dst: ApiService[];
  bcg: ApiService[];
}

export interface ApiPackage {
  id: number;
  name: string;
  provider_lead: string;
  dst_service_ids: number[];
  bcg_service_ids: number[];
  target_fields: number[];
  description: string;
}

export interface TeamMix {
  senior_dst: number;
  senior_bcg: number;
  expert_dst: number;
  expert_bcg: number;
  junior_dst: number;
  junior_bcg: number;
}

export interface ComputeRequest {
  entity_id: number;
  hacs_field: number;
  provider_mix: "dst" | "bcg" | "combined";
  dst_service_ids: number[];
  bcg_service_ids: number[];
  price_posture: "competitive" | "balanced" | "premium";
  team_mix: TeamMix;
}

export interface Explanation {
  top_factor: string;
  components: string[];
  risks: string[];
  missing_proof_points: string[];
}

export interface ComputeResult {
  dst_fit: number;
  bcg_fit: number;
  combined_fit: number;
  technical_score: number;
  financial_score: number;
  total_score: number;
  bid_recommendation: string;
  lead_provider: string;
  explanation: Explanation;
}

export interface ScenarioOut {
  id: number;
  entity_id: number;
  hacs_field: number;
  provider_mix: string;
  dst_service_ids: number[];
  bcg_service_ids: number[];
  price_posture: string;
  technical_score: number;
  financial_score: number;
  total_score: number;
  bid_recommendation: string;
  created_at: string;
}

export async function fetchEntities(): Promise<ApiEntity[]> {
  const r = await fetch(`${API_BASE}/api/entities`);
  if (!r.ok) throw new Error("Failed to fetch entities");
  return r.json();
}

export async function fetchServices(): Promise<ApiServicesResponse> {
  const r = await fetch(`${API_BASE}/api/services`);
  if (!r.ok) throw new Error("Failed to fetch services");
  return r.json();
}

export async function computeScenario(req: ComputeRequest): Promise<ComputeResult> {
  const r = await fetch(`${API_BASE}/api/scenarios/compute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!r.ok) throw new Error("Compute failed");
  return r.json();
}

export async function saveScenario(req: ComputeRequest): Promise<ScenarioOut> {
  const r = await fetch(`${API_BASE}/api/scenarios`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!r.ok) throw new Error("Save failed");
  return r.json();
}

export async function fetchScenarios(entity_id?: number): Promise<ScenarioOut[]> {
  const url = entity_id
    ? `${API_BASE}/api/scenarios?entity_id=${entity_id}`
    : `${API_BASE}/api/scenarios`;
  const r = await fetch(url);
  if (!r.ok) throw new Error("Failed to fetch scenarios");
  return r.json();
}

// ── Import / Allocations ───────────────────────────────────────────────

export interface PastAllocationOut {
  id: number;
  entity_id: number | null;
  entity_name_raw: string;
  entity_acronym: string | null;
  client_name: string;
  contract_title: string;
  supplier_name: string | null;
  contract_start: string | null;
  contract_end: string | null;
  contract_value_eur: number | null;
  invoiced_by_entity_eur: number | null;
  role: string | null;
  hacs_field: number | null;
  field_of_expertise: string | null;
  framework_reference: string | null;
  lot_reference: string | null;
  source_url: string | null;
  confidence_of_match: number | null;
  source: string;
}

export interface ImportLogOut {
  id: number;
  source: string;
  status: string;
  message: string;
  records_imported: number;
  created_at: string;
}

export interface Annex71Status {
  file_found: boolean;
  file_path: string;
  records: number;
  last_imported: string | null;
}

export interface BeaconHistoricalStatus {
  records: number;
  last_synced: string | null;
  framework_reference: string;
}

export interface BeaconExecutionStatus {
  records: number;
  supplier_specific_records: number;
  framework_aggregate_records: number;
  last_synced: string | null;
  framework_reference: string;
  sources_file: string;
}

export interface TedNotice {
  notice_id: string;
  title: string;
  entity_name: string;
  client_name: string;
  contract_value_eur: number | null;
  estimated_value_eur: number | null;
  award_value_eur: number | null;
  cpv_codes: string[];
  publication_date: string | null;
  field_guess: number | null;
}

export interface AIStatus {
  available: boolean;
  provider: string | null;
  model: string | null;
}

export interface ApiIntelligenceSignal {
  source: string;
  title: string;
  summary: string;
  date: string | null;
  url: string | null;
  field_guess: number | null;
  contract_value_eur: number | null;
  estimated_value_eur: number | null;
  award_value_eur: number | null;
  cpv_codes: string[];
  relevance_score: number;
  client_name: string | null;
}

export interface ApiEntityIntelligence {
  id: number;
  entity_id: number;
  need_statement: string;
  primary_field: number | null;
  secondary_field: number | null;
  confidence: "High" | "Medium" | "Low";
  provider_match: string;
  recommended_action: string;
  signals: ApiIntelligenceSignal[];
  summary: {
    signal_count: number;
    source_counts: Record<string, number>;
    field_counts: Record<string, number>;
    aliases_used: string[];
    ted_counts?: {
      mode: "recent" | "historical_fallback" | "cpv_filtered";
      recent: number;
      historical: number;
      displayed: number;
      total_examined: number;
      cpv_filtered?: number;
      cpv_prefixes?: string[];
    };
    ted_topics?: {
      mode: "recent" | "historical_fallback" | "cpv_filtered";
      total_analyzed: number;
      dominant_topic: string | null;
      topics: {
        topic: string;
        count: number;
        share: number;
        hacs_field: number | null;
        examples: string[];
      }[];
    };
  };
  created_at: string;
}

export interface ApiIntelligenceRefreshRun {
  id: number;
  status: string;
  scope: string;
  total_entities: number;
  processed_entities: number;
  succeeded_entities: number;
  failed_entities: number;
  max_results_per_entity: number;
  error_message: string | null;
  started_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface ApiHacsAssignment {
  id: number;
  entity_id: number;
  primary_field: number | null;
  secondary_field: number | null;
  confidence: "High" | "Medium" | "Low";
  status: string;
  rationale: string;
  field_scores: Record<
    string,
    {
      total: number;
      mission_fit: number;
      procurement_fit: number;
      execution_fit: number;
      semantic_fit: number;
    }
  >;
  evidence: Record<string, unknown>;
  model_version: string;
  locked_by_user: boolean;
  created_at: string;
  updated_at: string;
}

export interface OutreachResult {
  subject: string;
  body: string;
  ai_generated: boolean;
  model_used: string | null;
}

export async function fetchAllocations(): Promise<PastAllocationOut[]> {
  const r = await fetch(`${API_BASE}/api/allocations`);
  if (!r.ok) throw new Error("Failed to fetch allocations");
  return r.json();
}

export async function fetchImportLog(): Promise<ImportLogOut[]> {
  const r = await fetch(`${API_BASE}/api/import/log`);
  if (!r.ok) throw new Error("Failed to fetch import log");
  return r.json();
}

export async function fetchAnnex71Status(): Promise<Annex71Status> {
  const r = await fetch(`${API_BASE}/api/import/annex71/status`);
  if (!r.ok) throw new Error("Failed to fetch annex71 status");
  return r.json();
}

export async function reimportAnnex71(): Promise<{ records_imported: number }> {
  const r = await fetch(`${API_BASE}/api/import/annex71/reimport`, { method: "POST" });
  if (!r.ok) throw new Error("Reimport failed");
  return r.json();
}

export async function searchTed(query: string, max_results = 20): Promise<{ notices: TedNotice[] }> {
  const r = await fetch(`${API_BASE}/api/import/ted/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, max_results }),
  });
  if (!r.ok) throw new Error("TED search failed");
  return r.json();
}

export async function confirmTed(notice_ids: string[]): Promise<{ records_imported: number }> {
  const r = await fetch(`${API_BASE}/api/import/ted/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ notice_ids }),
  });
  if (!r.ok) throw new Error("TED confirm failed");
  return r.json();
}

export async function fetchAIStatus(): Promise<AIStatus> {
  const r = await fetch(`${API_BASE}/api/ai/status`);
  if (!r.ok) throw new Error("Failed to fetch AI status");
  return r.json();
}

export async function fetchIntelligence(entity_ids?: number[]): Promise<ApiEntityIntelligence[]> {
  const url = new URL(`${API_BASE}/api/intelligence`);
  entity_ids?.forEach((id) => url.searchParams.append("entity_ids", String(id)));
  const r = await fetch(url.toString());
  if (!r.ok) throw new Error("Failed to fetch intelligence");
  return r.json();
}

export async function refreshIntelligence(req: {
  entity_ids: number[];
  max_results_per_entity?: number;
}): Promise<ApiEntityIntelligence[]> {
  const r = await fetch(`${API_BASE}/api/intelligence/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!r.ok) throw new Error("Intelligence refresh failed");
  return r.json();
}

export async function refreshAllIntelligence(max_results_per_entity = 6): Promise<ApiIntelligenceRefreshRun> {
  const url = new URL(`${API_BASE}/api/intelligence/refresh/all`);
  url.searchParams.set("max_results_per_entity", String(max_results_per_entity));
  const r = await fetch(url.toString(), { method: "POST" });
  if (!r.ok) throw new Error("Full intelligence refresh failed");
  return r.json();
}

export async function fetchIntelligenceRefreshStatus(): Promise<ApiIntelligenceRefreshRun | null> {
  const r = await fetch(`${API_BASE}/api/intelligence/refresh/status`);
  if (!r.ok) throw new Error("Failed to fetch intelligence refresh status");
  return r.json();
}

export async function fetchHacsAssignments(entity_ids?: number[]): Promise<ApiHacsAssignment[]> {
  const url = new URL(`${API_BASE}/api/hacs-assignments`);
  entity_ids?.forEach((id) => url.searchParams.append("entity_ids", String(id)));
  const r = await fetch(url.toString());
  if (!r.ok) throw new Error("Failed to fetch HACS assignments");
  return r.json();
}

export async function generateHacsAssignments(req: {
  entity_ids?: number[];
  apply_to_entities?: boolean;
} = {}): Promise<ApiHacsAssignment[]> {
  const r = await fetch(`${API_BASE}/api/hacs-assignments/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!r.ok) throw new Error("Failed to generate HACS assignments");
  return r.json();
}

export async function generateOutreach(req: {
  entity_id: number;
  purpose: string;
  tone: string;
  context: string;
}): Promise<OutreachResult> {
  const r = await fetch(`${API_BASE}/api/outreach/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!r.ok) throw new Error("Outreach generation failed");
  return r.json();
}

export async function fetchBeaconHistoricalStatus(): Promise<BeaconHistoricalStatus> {
  const r = await fetch(`${API_BASE}/api/intelligence/historical/beacon/status`);
  if (!r.ok) throw new Error("Failed to fetch BEACON status");
  return r.json();
}

export async function refreshBeaconHistorical(): Promise<{
  records_imported: number;
  notices_found: number;
  award_rows_found?: number;
  matched_entities: number;
}> {
  const r = await fetch(`${API_BASE}/api/intelligence/historical/beacon/refresh`, {
    method: "POST",
  });
  if (!r.ok) throw new Error("Failed to refresh BEACON historical awards");
  return r.json();
}

export async function fetchBeaconExecutionStatus(): Promise<BeaconExecutionStatus> {
  const r = await fetch(`${API_BASE}/api/intelligence/historical/beacon/execution/status`);
  if (!r.ok) throw new Error("Failed to fetch BEACON execution status");
  return r.json();
}

export async function fetchBeaconExecutionDiscoveryStatus(): Promise<BeaconExecutionStatus> {
  const r = await fetch(`${API_BASE}/api/intelligence/historical/beacon/execution/discovery/status`);
  if (!r.ok) throw new Error("Failed to fetch BEACON execution discovery status");
  return r.json();
}

export async function refreshBeaconExecution(): Promise<{
  records_imported: number;
  matched_entities: number;
  supplier_specific_records: number;
  framework_aggregate_records: number;
  framework_reference: string;
  sources_file: string;
}> {
  const r = await fetch(`${API_BASE}/api/intelligence/historical/beacon/execution/refresh`, {
    method: "POST",
  });
  if (!r.ok) throw new Error("Failed to refresh BEACON execution signals");
  return r.json();
}

export async function refreshBeaconExecutionDiscovery(): Promise<{
  records_imported: number;
  matched_entities: number;
  supplier_specific_records: number;
  framework_aggregate_records: number;
  validation_errors: string[];
  framework_reference: string;
  sources_file: string;
}> {
  const r = await fetch(`${API_BASE}/api/intelligence/historical/beacon/execution/discovery/refresh`, {
    method: "POST",
  });
  if (!r.ok) throw new Error("Failed to refresh BEACON execution discovery");
  return r.json();
}
