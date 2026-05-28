"use client";

import { startTransition, useEffect, useMemo, useState } from "react";

import { buildCpvSpendRows } from "@/components/TedSpendIntelligence";
import {
  fetchHacsAssignments,
  fetchIntelligence,
  type ApiEntityIntelligence,
  type ApiHacsAssignment,
} from "@/lib/api";
import { formatEur } from "@/lib/format";
import { getEntityProfile } from "@/lib/entityProfile";
import {
  getManagementPlansByEntityId,
} from "@/lib/managementPlans";
import {
  getManagementPlanAnalysisByEntityId,
  getManagementPlanAnalysisCatalog,
  type ManagementPlanActionTheme,
  type ManagementPlanAnalysisRecord,
} from "@/lib/managementPlanAnalysis";
import { getAllEntities } from "@/lib/scoring";
import { HACS_FIELDS, type EntityWithScore } from "@/lib/types";

const allEntities = getAllEntities();
const dgEntities = allEntities.filter((entity) => entity.is_ec_dg);
const managementPlansByEntityId = getManagementPlansByEntityId();
const managementPlanAnalysisCatalog = getManagementPlanAnalysisCatalog();
const managementPlanAnalysisByEntityId = getManagementPlanAnalysisByEntityId();
const STRONG_ACTION_SCORE = 70;

function indexByEntityId<T extends { entity_id: number }>(items: T[]) {
  return Object.fromEntries(items.map((item) => [item.entity_id, item]));
}

function fieldLabel(fieldId: number | null | undefined) {
  return fieldId ? HACS_FIELDS[fieldId]?.label ?? `Field ${fieldId}` : "Field to qualify";
}

function relevanceScore(
  entity: EntityWithScore,
  intelligence?: ApiEntityIntelligence,
  assignment?: ApiHacsAssignment,
  managementPlan?: ManagementPlanAnalysisRecord
) {
  let score = 30;
  const highQualityActions =
    managementPlan?.actions.filter((action) => action.score >= STRONG_ACTION_SCORE).length ?? 0;
  if (managementPlan?.needs.some((need) => need.strength === "High")) score += 22;
  if (highQualityActions >= 8) score += 14;
  else if (highQualityActions >= 4) score += 8;
  if ((managementPlan?.objectives.length ?? 0) >= 4) score += 10;
  if (assignment?.confidence === "High") score += 25;
  if (assignment?.confidence === "Medium") score += 15;
  if (intelligence?.summary.ted_topics?.dominant_topic) score += 12;
  if ((intelligence?.summary.ted_counts?.recent ?? 0) > 0) score += 18;
  if ((intelligence?.summary.source_counts?.beacon_execution_discovery ?? 0) > 0) score += 15;
  if (entity.top_hacs_field) score += 8;
  return Math.min(100, score);
}

function priorityBucket(score: number, spend: number) {
  if (score >= 68 && spend >= 5_000_000) return "Target primary";
  if (score >= 68) return "Potential to develop";
  if (spend >= 5_000_000) return "Selective review";
  return "Monitor";
}

function needStrengthWeight(need: { strength: "High" | "Medium" | "Low" }) {
  if (need.strength === "High") return 3;
  if (need.strength === "Medium") return 2;
  return 1;
}

function topManagementNeed(record?: ManagementPlanAnalysisRecord) {
  return [...(record?.needs ?? [])].sort(
    (a, b) => needStrengthWeight(b) - needStrengthWeight(a)
  )[0];
}

function topManagementAction(record?: ManagementPlanAnalysisRecord) {
  return [...(record?.actions ?? [])].sort((a, b) => b.score - a.score)[0];
}

function topActionThemes(record?: ManagementPlanAnalysisRecord, limit = 5): ManagementPlanActionTheme[] {
  return [...(record?.action_themes ?? [])]
    .sort((a, b) => b.action_count - a.action_count || b.avg_score - a.avg_score)
    .slice(0, limit);
}

function strengthClass(strength: "High" | "Medium" | "Low") {
  if (strength === "High") return "bg-[var(--text-1)] text-white";
  if (strength === "Medium") return "bg-[#D4A017]/15 text-[#8A6500]";
  return "bg-[var(--border)] text-[var(--text-2)]";
}

function StrategyQuadrantCard({
  title,
  description,
  items,
  selectedEntityId,
  onSelect,
}: {
  title: string;
  description: string;
  items: Array<{
    entity: EntityWithScore;
    spend: number;
    relevance: number;
    field: number | null | undefined;
    managementPlan?: ManagementPlanAnalysisRecord;
  }>;
  selectedEntityId: number | null;
  onSelect: (entityId: number) => void;
}) {
  const visibleItems = items.slice(0, 6);
  const avgRelevance =
    items.length > 0
      ? Math.round(items.reduce((sum, item) => sum + item.relevance, 0) / items.length)
      : 0;
  const totalSpend = items.reduce((sum, item) => sum + item.spend, 0);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-1)]">{title}</h3>
          <p className="mt-1 text-[10px] leading-relaxed text-[var(--text-2)]">
            {description}
          </p>
        </div>
        <div className="text-right text-[10px] text-[var(--text-2)]">
          <p className="font-semibold text-[var(--text-1)]">{items.length} DGs</p>
          <p>{avgRelevance}/100 avg</p>
          <p>{formatEur(totalSpend)}</p>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {visibleItems.length === 0 ? (
          <p className="rounded-lg border border-dashed border-[var(--border)] bg-white p-3 text-xs text-[var(--text-2)]">
            No DGs in this segment yet.
          </p>
        ) : (
          visibleItems.map((item) => {
            const selected = selectedEntityId === item.entity.id;
            const actionThemes = item.managementPlan?.action_themes?.length ?? 0;
            return (
              <button
                key={item.entity.id}
                type="button"
                onClick={() => onSelect(item.entity.id)}
                className={`grid w-full grid-cols-[72px_1fr_auto] items-center gap-3 rounded-lg border px-3 py-2 text-left transition ${
                  selected
                    ? "border-[var(--text-1)] bg-white shadow-sm"
                    : "border-transparent bg-white hover:border-[var(--border)]"
                }`}
              >
                <span className="text-sm font-bold text-[var(--text-1)]">
                  {item.entity.acronym.replace("DG_", "")}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-xs font-medium text-[var(--text-1)]">
                    {fieldLabel(item.field)}
                  </span>
                  <span className="block text-[10px] text-[var(--text-2)]">
                    {actionThemes} themes · {formatEur(item.spend)}
                  </span>
                </span>
                <span className="rounded-full bg-[var(--text-1)] px-2 py-1 text-[10px] font-semibold text-white">
                  {item.relevance}
                </span>
              </button>
            );
          })
        )}
      </div>

      {items.length > visibleItems.length && (
        <p className="mt-2 text-[10px] text-[var(--text-2)]">
          +{items.length - visibleItems.length} more in this segment.
        </p>
      )}
    </div>
  );
}

export default function DgStrategyPage() {
  const [intelligenceByEntityId, setIntelligenceByEntityId] = useState<Record<number, ApiEntityIntelligence | undefined>>({});
  const [assignmentsByEntityId, setAssignmentsByEntityId] = useState<Record<number, ApiHacsAssignment | undefined>>({});
  const [selectedStrategyEntityId, setSelectedStrategyEntityId] = useState<number | null>(null);
  const [dgSearch, setDgSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchIntelligence(), fetchHacsAssignments()])
      .then(([intelligenceItems, assignmentItems]) => {
        startTransition(() => {
          setIntelligenceByEntityId(indexByEntityId(intelligenceItems));
          setAssignmentsByEntityId(indexByEntityId(assignmentItems));
          setLoading(false);
        });
      })
      .catch(() => {
        setError("Strategy data is not available yet. Check that the backend is running.");
        setLoading(false);
      });
  }, []);

  const spendRows = useMemo(
    () => buildCpvSpendRows(dgEntities, intelligenceByEntityId),
    [intelligenceByEntityId]
  );

  const rowsByEntityId = useMemo(
    () => Object.fromEntries(spendRows.map((row) => [row.entityId, row])),
    [spendRows]
  );

  const strategyItems = useMemo(() => {
    return dgEntities
      .map((entity) => {
        const intelligence = intelligenceByEntityId[entity.id];
        const assignment = assignmentsByEntityId[entity.id];
        const managementPlan = managementPlanAnalysisByEntityId.get(entity.id);
        const spend = rowsByEntityId[entity.id]?.totalValue ?? 0;
        const relevance = relevanceScore(entity, intelligence, assignment, managementPlan);
        const managementNeed = topManagementNeed(managementPlan);
        const managementAction = topManagementAction(managementPlan);
        return {
          entity,
          spend,
          relevance,
          field:
            managementNeed?.hacs_field ??
            managementPlan?.top_hacs_fields[0]?.field ??
            assignment?.primary_field ??
            intelligence?.primary_field ??
            entity.top_hacs_field,
          bucket: priorityBucket(relevance, spend),
          need:
            managementNeed?.need ??
            intelligence?.need_statement ??
            getEntityProfile(entity).mission,
          action: managementAction?.title ?? "No management plan action extracted yet",
          managementPlans: managementPlansByEntityId.get(entity.id) ?? [],
          managementPlan,
        };
      })
      .sort((a, b) => {
        const bucketOrder = ["Target primary", "Potential to develop", "Selective review", "Monitor"];
        const bucketDelta = bucketOrder.indexOf(a.bucket) - bucketOrder.indexOf(b.bucket);
        if (bucketDelta !== 0) return bucketDelta;
        return b.spend + b.relevance * 100_000 - (a.spend + a.relevance * 100_000);
      });
  }, [assignmentsByEntityId, intelligenceByEntityId, rowsByEntityId]);

  const strategySegments = [
    {
      title: "Target primary",
      description: "High need signal and meaningful mapped spend. These are the first DGs to inspect.",
      items: strategyItems.filter((item) => item.bucket === "Target primary"),
    },
    {
      title: "Potential to develop",
      description: "Strong management-plan need, but spend signal is still limited or not fully mapped.",
      items: strategyItems.filter((item) => item.bucket === "Potential to develop"),
    },
    {
      title: "Selective review",
      description: "Spend signal exists, but the management-plan fit needs sharper qualification.",
      items: strategyItems.filter((item) => item.bucket === "Selective review"),
    },
    {
      title: "Monitor",
      description: "Lower combined signal for now. Keep visible, but do not over-invest yet.",
      items: strategyItems.filter((item) => item.bucket === "Monitor"),
    },
  ];
  const selectedStrategyItem =
    strategyItems.find((item) => item.entity.id === selectedStrategyEntityId) ??
    strategyItems[0];
  const selectedActionThemes = topActionThemes(selectedStrategyItem?.managementPlan, 5);
  const visibleDirectoryItems = strategyItems.filter((item) => {
    const query = dgSearch.trim().toLowerCase();
    if (!query) return true;
    return (
      item.entity.acronym.toLowerCase().includes(query) ||
      item.entity.name.toLowerCase().includes(query) ||
      fieldLabel(item.field).toLowerCase().includes(query)
    );
  });

  return (
    <main className="min-h-screen bg-[var(--bg)] px-6 py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-2)]">
              Strategy layer
            </p>
            <h1 className="mt-1 text-3xl font-bold text-[var(--text-1)]">
              DG Strategy
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--text-2)]">
              Scegli un DG prioritario, verifica i need e le action emerse dal management
              plan, poi confrontale con la spesa TED mappata.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-[var(--text-2)]">
            <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1">
              {dgEntities.length} EC DG / services
            </span>
            <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1">
              {managementPlansByEntityId.size}/{dgEntities.length} management plans mapped
            </span>
            <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1">
              {managementPlanAnalysisCatalog.records_analyzed} analyzed ·{" "}
              {managementPlanAnalysisCatalog.records.reduce(
                (sum, item) => sum + (item.action_themes?.length ?? 0),
                0
              )} action themes
            </span>
            <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1">
              {spendRows.length} with TED CPV spend
            </span>
            <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1">
              {loading ? "Loading" : "Live local data"}
            </span>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-[#C0392B]/20 bg-[#C0392B]/10 px-4 py-3 text-sm text-[#C0392B]">
            {error}
          </div>
        )}

        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-2)]">
                Prioritization matrix
              </p>
              <h2 className="mt-1 text-xl font-bold text-[var(--text-1)]">
                Actionable DG segments
              </h2>
            </div>
            <p className="max-w-xs text-right text-[10px] leading-relaxed text-[var(--text-2)]">
              DGs grouped by management-plan relevance and mapped TED spend. Click one
              to inspect the evidence below.
            </p>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {strategySegments.map((segment) => (
              <StrategyQuadrantCard
                key={segment.title}
                title={segment.title}
                description={segment.description}
                items={segment.items}
                selectedEntityId={selectedStrategyItem?.entity.id ?? null}
                onSelect={setSelectedStrategyEntityId}
              />
            ))}
          </div>

          <div className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-1)]">
                  All DGs
                </h3>
                <p className="mt-1 text-xs text-[var(--text-2)]">
                  Complete selectable list. Use this when a DG is not visible in the segment shortlist.
                </p>
              </div>
              <input
                value={dgSearch}
                onChange={(event) => setDgSearch(event.target.value)}
                placeholder="Search DG or field…"
                className="h-9 rounded-lg border border-[var(--border)] bg-white px-3 text-sm text-[var(--text-1)] outline-none placeholder:text-[var(--text-2)] focus:ring-1 focus:ring-[var(--accent)] md:w-72"
              />
            </div>

            <div className="mt-3 max-h-[360px] overflow-auto rounded-lg border border-[var(--border)] bg-white">
              <table className="w-full min-w-[760px] text-xs">
                <thead className="sticky top-0 bg-white text-left text-[var(--text-2)] shadow-[0_1px_0_var(--border)]">
                  <tr>
                    <th className="px-3 py-2 font-medium">DG</th>
                    <th className="px-3 py-2 font-medium">Segment</th>
                    <th className="px-3 py-2 font-medium">HACS field</th>
                    <th className="px-3 py-2 text-right font-medium">Relevance</th>
                    <th className="px-3 py-2 text-right font-medium">Spend</th>
                    <th className="px-3 py-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {visibleDirectoryItems.map((item) => {
                    const selected = selectedStrategyItem?.entity.id === item.entity.id;
                    const actionThemes = item.managementPlan?.action_themes?.length ?? 0;
                    return (
                      <tr
                        key={item.entity.id}
                        onClick={() => setSelectedStrategyEntityId(item.entity.id)}
                        className={`cursor-pointer transition ${
                          selected ? "bg-[var(--bg)]" : "hover:bg-[var(--bg)]"
                        }`}
                      >
                        <td className="px-3 py-2">
                          <p className="font-bold text-[var(--text-1)]">{item.entity.acronym}</p>
                          <p className="max-w-[240px] truncate text-[10px] text-[var(--text-2)]">
                            {item.entity.name}
                          </p>
                        </td>
                        <td className="px-3 py-2 text-[var(--text-2)]">{item.bucket}</td>
                        <td className="px-3 py-2 text-[var(--text-1)]">{fieldLabel(item.field)}</td>
                        <td className="px-3 py-2 text-right font-semibold text-[var(--text-1)]">
                          {item.relevance}
                        </td>
                        <td className="px-3 py-2 text-right text-[var(--text-2)]">
                          {formatEur(item.spend)}
                        </td>
                        <td className="px-3 py-2 text-right text-[var(--text-2)]">
                          {actionThemes}
                        </td>
                      </tr>
                    );
                  })}
                  {visibleDirectoryItems.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-3 py-8 text-center text-sm text-[var(--text-2)]">
                        No DGs match this search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {selectedStrategyItem && (
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-2)]">
                  Management plan evidence
                </p>
                <h2 className="mt-1 text-xl font-bold text-[var(--text-1)]">
                  {selectedStrategyItem.entity.acronym} · {fieldLabel(selectedStrategyItem.field)}
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--text-2)]">
                  {selectedStrategyItem.managementPlan?.mission_context ??
                    getEntityProfile(selectedStrategyItem.entity).mission}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-[var(--text-2)] md:justify-end">
                <span className="rounded-full border border-[var(--border)] bg-[var(--bg)] px-3 py-1">
                  Relevance {selectedStrategyItem.relevance}/100
                </span>
                <span className="rounded-full border border-[var(--border)] bg-[var(--bg)] px-3 py-1">
                  Spend {formatEur(selectedStrategyItem.spend)}
                </span>
                <span className="rounded-full border border-[var(--border)] bg-[var(--bg)] px-3 py-1">
                  {selectedStrategyItem.managementPlan?.objectives.length ?? 0} objectives
                </span>
                <span className="rounded-full border border-[var(--border)] bg-[var(--bg)] px-3 py-1">
                  {selectedActionThemes.length} action themes
                </span>
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4">
                <h3 className="text-sm font-semibold text-[var(--text-1)]">
                  Top needs
                </h3>
                <div className="mt-3 space-y-3">
                  {(selectedStrategyItem.managementPlan?.needs ?? []).slice(0, 4).map((need, index) => (
                    <div key={`${need.need}-${index}`} className="rounded-lg bg-white p-3">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-semibold text-[var(--text-1)]">
                          {fieldLabel(need.hacs_field)}
                        </p>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${strengthClass(need.strength)}`}>
                          {need.strength}
                        </span>
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-[var(--text-2)]">
                        {need.need}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-[var(--text-1)]">
                    Planned action themes
                  </h3>
                  {selectedStrategyItem.managementPlans[0] && (
                    <div className="flex gap-2 text-[10px]">
                      <a
                        href={selectedStrategyItem.managementPlans[0].source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-[var(--accent)] hover:underline"
                      >
                        Source →
                      </a>
                      {selectedStrategyItem.managementPlans[0].pdf_url && (
                        <a
                          href={selectedStrategyItem.managementPlans[0].pdf_url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-[var(--accent)] hover:underline"
                        >
                          PDF →
                        </a>
                      )}
                    </div>
                  )}
                </div>
                <div className="mt-3 divide-y divide-[var(--border)] overflow-hidden rounded-lg border border-[var(--border)] bg-white">
                  {selectedActionThemes.length === 0 ? (
                    <p className="p-4 text-sm text-[var(--text-2)]">
                      No action themes synthesized yet.
                    </p>
                  ) : (
                    selectedActionThemes.map((theme, index) => (
                      <div key={`${theme.id}-${index}`} className="grid gap-3 p-3 md:grid-cols-[1fr_190px]">
                        <div>
                          <p className="text-sm font-semibold leading-snug text-[var(--text-1)]">
                            {theme.title}
                          </p>
                          <p className="mt-1 text-xs leading-relaxed text-[var(--text-2)]">
                            {theme.summary}
                          </p>
                          {theme.evidence.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {theme.evidence.slice(0, 2).map((evidence) => (
                                <p
                                  key={`${theme.id}-${evidence.page}-${evidence.title}`}
                                  className="text-[10px] leading-relaxed text-[var(--text-2)]"
                                >
                                  Evidence p.{evidence.page}: {evidence.title}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex content-start items-start gap-1.5 md:flex-wrap md:justify-end">
                          {theme.hacs_field && (
                            <span className="inline-flex h-6 shrink-0 items-center rounded-full border border-[var(--border)] px-2.5 text-[10px] font-semibold leading-none text-[var(--text-1)]">
                              F{theme.hacs_field}
                            </span>
                          )}
                          {theme.ec_priority && (
                            <span className="inline-flex h-6 shrink-0 items-center rounded-full bg-[var(--bg)] px-2.5 text-[10px] font-semibold leading-none text-[var(--text-2)]">
                              {theme.ec_priority.id}
                            </span>
                          )}
                          <span className="inline-flex h-6 shrink-0 items-center whitespace-nowrap rounded-full bg-[var(--bg)] px-2.5 text-[10px] font-semibold leading-none text-[var(--text-2)]">
                            {theme.action_count} evidence
                          </span>
                          {theme.pages.length > 0 && (
                            <span className="inline-flex h-6 shrink-0 items-center whitespace-nowrap rounded-full bg-[var(--bg)] px-2.5 text-[10px] font-semibold leading-none text-[var(--text-2)]">
                              p. {theme.pages.slice(0, 3).join(", ")}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
