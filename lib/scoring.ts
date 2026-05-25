import type { Entity, EntityWithScore, CLUSTER_BUDGETS } from "./types";
import { CLUSTER_BUDGETS as BUDGETS } from "./types";
import rawEntities from "@/data/entities.json";

function countByCluster(entities: Entity[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const e of entities) {
    counts[e.cluster] = (counts[e.cluster] ?? 0) + 1;
  }
  return counts;
}

function normalize(value: number, min: number, max: number): number {
  if (max === min) return 0;
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

export function computePriorityScore(entity: Entity, clusterEntityCount: number): number {
  const clusterBudget = BUDGETS[entity.cluster] ?? 0;
  const sharePerEntity = clusterEntityCount > 0 ? clusterBudget / clusterEntityCount : 0;

  const cluster_weight = normalize(clusterBudget, 0, 82_500_000) * 0.40;

  const rel =
    entity.relationship_signal === "both" ? 1.0
    : entity.relationship_signal === "bcg_contact" ? 0.6
    : entity.relationship_signal === "dst_contact" ? 0.4
    : 0.0;
  const relationship_weight = rel * 0.30;

  const field_known = entity.top_hacs_field !== null ? 1.0 : 0.3;
  const field_weight = field_known * 0.15;

  const is_ec_dg = entity.is_ec_dg ? 0.8 : 0.5;
  const dg_weight = is_ec_dg * 0.15;

  const raw = cluster_weight + relationship_weight + field_weight + dg_weight;
  return Math.round(raw * 100);
}

export function enrichEntities(entities: Entity[]): EntityWithScore[] {
  const clusterCounts = countByCluster(entities);
  return entities.map((e) => {
    const count = clusterCounts[e.cluster] ?? 1;
    const clusterBudget = BUDGETS[e.cluster] ?? 0;
    return {
      ...e,
      priority_score: computePriorityScore(e, count),
      cluster_budget_eur: clusterBudget,
      cluster_share_eur: Math.round(clusterBudget / count),
      cluster_entity_count: count,
    };
  });
}

export function getAllEntities(): EntityWithScore[] {
  return enrichEntities(rawEntities as Entity[]);
}
