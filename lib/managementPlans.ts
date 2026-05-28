import managementPlans from "@/data/management_plans.json";

export interface ManagementPlanRecord {
  title: string;
  publication_date: string;
  publication_datetime: string;
  department: string;
  description: string;
  source_url: string;
  entity_id: number | null;
  entity_acronym: string | null;
  pdf_url: string | null;
}

export interface ManagementPlansCatalog {
  source: string;
  source_url: string;
  year: number;
  refreshed_at: string;
  records: ManagementPlanRecord[];
}

const catalog = managementPlans as ManagementPlansCatalog;

export function getManagementPlansCatalog() {
  return catalog;
}

export function getManagementPlansByEntityId() {
  const byEntityId = new Map<number, ManagementPlanRecord[]>();
  for (const record of catalog.records) {
    if (!record.entity_id) continue;
    const records = byEntityId.get(record.entity_id) ?? [];
    records.push(record);
    byEntityId.set(record.entity_id, records);
  }
  return byEntityId;
}
