"use client";

import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";

import { EntityCard } from "@/components/EntityCard";
import { EntityDrawer } from "@/components/EntityDrawer";
import { IntelligenceComparePanel } from "@/components/IntelligenceComparePanel";
import {
  fetchHacsAssignments,
  fetchIntelligence,
  fetchIntelligenceRefreshStatus,
  refreshAllIntelligence,
  refreshIntelligence,
  type ApiEntityIntelligence,
  type ApiHacsAssignment,
  type ApiIntelligenceRefreshRun,
} from "@/lib/api";
import { getEntityAnnualBudgetEur } from "@/lib/entityProfile";
import { getCoverageStatus, type CoverageStatus } from "@/lib/evidence";
import { getAllEntities } from "@/lib/scoring";
import type { EntityWithScore } from "@/lib/types";

type SortKey = "name" | "cluster_budget_eur";
type Cluster = "Brussels" | "Luxembourg" | "Frankfurt" | "The Hague" | "Other";
type BudgetFilter = "all" | "high" | "medium" | "low";
type GeographyFilter = "all" | Cluster;
type ExecutionFilter = "all" | CoverageStatus;

const ALL_CLUSTERS: Cluster[] = ["Brussels", "Luxembourg", "Frankfurt", "The Hague", "Other"];
const allEntities = getAllEntities();

function indexByEntityId(items: ApiEntityIntelligence[]) {
  return Object.fromEntries(items.map((item) => [item.entity_id, item]));
}

function indexAssignmentsByEntityId(items: ApiHacsAssignment[]) {
  return Object.fromEntries(items.map((item) => [item.entity_id, item]));
}

export default function Home() {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [geography, setGeography] = useState<GeographyFilter>("all");
  const [executionEvidence, setExecutionEvidence] = useState<ExecutionFilter>("all");
  const [budgetFilter, setBudgetFilter] = useState<BudgetFilter>("all");
  const [showDgs, setShowDgs] = useState(false);
  const [sort, setSort] = useState<SortKey>("name");
  const [selectedEntity, setSelectedEntity] = useState<EntityWithScore | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [intelligenceByEntityId, setIntelligenceByEntityId] = useState<Record<number, ApiEntityIntelligence | undefined>>({});
  const [hacsAssignmentsByEntityId, setHacsAssignmentsByEntityId] = useState<Record<number, ApiHacsAssignment | undefined>>({});
  const [intelligenceLoading, setIntelligenceLoading] = useState(true);
  const [refreshingIds, setRefreshingIds] = useState<number[]>([]);
  const [batchRun, setBatchRun] = useState<ApiIntelligenceRefreshRun | null>(null);
  const [batchStarting, setBatchStarting] = useState(false);
  const [intelligenceError, setIntelligenceError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchIntelligence(), fetchHacsAssignments()])
      .then(([intelligenceItems, assignmentItems]) => {
        startTransition(() => {
          setIntelligenceByEntityId(indexByEntityId(intelligenceItems));
          setHacsAssignmentsByEntityId(indexAssignmentsByEntityId(assignmentItems));
          setIntelligenceLoading(false);
        });
      })
      .catch(() => {
        setIntelligenceError("Intelligence API not available yet.");
        setIntelligenceLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchIntelligenceRefreshStatus()
      .then(setBatchRun)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!batchRun || batchRun.status !== "running") {
      return;
    }

    const interval = window.setInterval(() => {
      fetchIntelligenceRefreshStatus()
        .then((run) => {
          setBatchRun(run);
          if (run && run.status !== "running") {
            fetchIntelligence()
              .then((items) => {
                startTransition(() => {
                  setIntelligenceByEntityId(indexByEntityId(items));
                });
              })
              .catch(() => {});
          }
        })
        .catch(() => {});
    }, 3000);

    return () => window.clearInterval(interval);
  }, [batchRun]);

  const filtered = useMemo(() => {
    let entities = showDgs
      ? allEntities
      : allEntities.filter((e) => !e.is_ec_dg);

    if (deferredSearch.trim()) {
      const q = deferredSearch.toLowerCase();
      entities = entities.filter(
        (e) =>
          e.acronym.toLowerCase().includes(q) ||
          e.name.toLowerCase().includes(q)
      );
    }

    if (geography !== "all") {
      entities = entities.filter((e) => e.cluster === geography);
    }

    if (executionEvidence !== "all") {
      entities = entities.filter((e) => getCoverageStatus(e.acronym) === executionEvidence);
    }

    if (budgetFilter !== "all") {
      entities = entities.filter((e) => {
        const budget = getEntityAnnualBudgetEur(e.id);
        if (budget === null) return false;
        if (budgetFilter === "high") return budget >= 500_000_000;
        if (budgetFilter === "medium") return budget >= 50_000_000 && budget < 500_000_000;
        return budget < 50_000_000;
      });
    }

    return [...entities].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "cluster_budget_eur") {
        return (getEntityAnnualBudgetEur(b.id) ?? -1) - (getEntityAnnualBudgetEur(a.id) ?? -1);
      }
      return a.name.localeCompare(b.name);
    });
  }, [budgetFilter, deferredSearch, executionEvidence, geography, showDgs, sort]);

  const selectedEntities = useMemo(
    () => allEntities.filter((entity) => selectedIds.includes(entity.id)),
    [selectedIds]
  );

  function clearFilters() {
    setSearch("");
    setGeography("all");
    setExecutionEvidence("all");
    setBudgetFilter("all");
  }

  function toggleEntitySelection(entityId: number) {
    setSelectedIds((prev) =>
      prev.includes(entityId)
        ? prev.filter((id) => id !== entityId)
        : [...prev, entityId]
    );
  }

  async function handleRefresh(entityIds: number[]) {
    if (entityIds.length === 0) {
      return;
    }

    setRefreshingIds(entityIds);
    setIntelligenceError(null);
    try {
      const refreshed = await refreshIntelligence({ entity_ids: entityIds, max_results_per_entity: 6 });
      startTransition(() => {
        setIntelligenceByEntityId((prev) => ({
          ...prev,
          ...indexByEntityId(refreshed),
        }));
      });
    } catch {
      setIntelligenceError("Refresh intelligence failed. Check that the backend can reach TED.");
    } finally {
      setRefreshingIds([]);
    }
  }

  async function handleRefreshAll() {
    setBatchStarting(true);
    setIntelligenceError(null);
    try {
      const run = await refreshAllIntelligence(6);
      setBatchRun(run);
    } catch {
      setIntelligenceError("Full intelligence refresh failed. Check that the backend is running.");
    } finally {
      setBatchStarting(false);
    }
  }

  const dgCount = allEntities.filter((e) => e.is_ec_dg).length;
  const hasActiveFilters =
    Boolean(search) ||
    geography !== "all" ||
    executionEvidence !== "all" ||
    budgetFilter !== "all";
  const batchRunning = batchRun?.status === "running";
  const batchProgress =
    batchRun && batchRun.total_entities > 0
      ? Math.round((batchRun.processed_entities / batchRun.total_entities) * 100)
      : 0;

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <div className="sticky top-[56px] z-30 bg-[var(--surface)] border-b border-[var(--border)] px-6 py-3 space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="text"
            placeholder="Search by name or acronym…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 px-3 text-sm rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-1)] placeholder:text-[var(--text-2)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] w-72"
          />

          <div className="flex items-center gap-2 flex-wrap">
            <FilterSelect
              label="Geography"
              value={geography}
              onChange={(value) => setGeography(value as GeographyFilter)}
              options={[
                ["all", "All geographies"],
                ...ALL_CLUSTERS.map((cluster) => [cluster, cluster] as [string, string]),
              ]}
            />
            <FilterSelect
              label="Execution"
              value={executionEvidence}
              onChange={(value) => setExecutionEvidence(value as ExecutionFilter)}
              options={[
                ["all", "All evidence"],
                ["covered", "Confirmed"],
                ["indirect_only", "Indirect"],
                ["checked_no_public_beacon_evidence", "Checked"],
                ["follow_up_needed", "Follow-up"],
                ["pending", "Unknown"],
              ]}
            />
            <FilterSelect
              label="Budget"
              value={budgetFilter}
              onChange={(value) => setBudgetFilter(value as BudgetFilter)}
              options={[
                ["all", "All budgets"],
                ["high", "High ≥ €500M"],
                ["medium", "€50M-€500M"],
                ["low", "Low < €50M"],
              ]}
            />
            <FilterSelect
              label="Sort"
              value={sort}
              onChange={(value) => setSort(value as SortKey)}
              options={[
                ["name", "Name"],
                ["cluster_budget_eur", "Budget"],
              ]}
            />
          </div>

          <div className="flex items-center gap-2 ml-auto flex-wrap">
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-xs px-3 py-2 rounded-lg border border-[var(--border)] text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--bg)]"
              >
                Clear
              </button>
            )}
            <button
              onClick={() => handleRefresh(selectedIds)}
              disabled={selectedIds.length === 0 || refreshingIds.length > 0}
              className="text-xs px-3 py-2 rounded-lg border border-[var(--border)] text-[var(--text-1)] hover:bg-[var(--bg)] disabled:opacity-50"
            >
              {refreshingIds.length > 0 ? "Refreshing..." : "Refresh intelligence"}
            </button>
            <button
              onClick={handleRefreshAll}
              disabled={batchStarting || batchRunning}
              className="text-xs px-3 py-2 rounded-lg border border-[var(--border)] text-[var(--text-1)] hover:bg-[var(--bg)] disabled:opacity-50"
            >
              {batchRunning ? `Refreshing all ${batchProgress}%` : batchStarting ? "Starting..." : "Refresh all"}
            </button>
            <button
              onClick={() => setCompareOpen(true)}
              disabled={selectedIds.length < 2}
              className="text-xs px-3 py-2 rounded-lg bg-[var(--text-1)] text-white hover:opacity-90 disabled:opacity-50"
            >
              Compare selected
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <label className="flex items-center gap-2 text-xs text-[var(--text-2)]">
            <span>Include EC DGs</span>
            <button
              onClick={() => setShowDgs((v) => !v)}
              type="button"
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                showDgs ? "bg-[var(--accent)]" : "bg-[var(--border)]"
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm ${
                  showDgs ? "translate-x-4" : "translate-x-0.5"
                }`}
              />
            </button>
          </label>
          <span className="text-xs text-[var(--text-2)]">
            Filtering by geography, evidence and annual budget.
          </span>
        </div>
      </div>

      <div className="px-6 py-2 text-xs text-[var(--text-2)] flex items-center gap-2 flex-wrap">
        <span>
          {filtered.length} {filtered.length === 1 ? "entity" : "entities"}
          {hasActiveFilters ? " matching filters" : ""}
        </span>
        {selectedIds.length > 0 && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--text-1)] text-white">
            {selectedIds.length} selected
          </span>
        )}
        {intelligenceLoading && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--border)] text-[var(--text-2)]">
            Loading intelligence…
          </span>
        )}
        {batchRun && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--border)] text-[var(--text-2)]">
            Batch {batchRun.status}
            {batchRun.total_entities > 0
              ? ` · ${batchRun.processed_entities}/${batchRun.total_entities}`
              : ""}
          </span>
        )}
        {showDgs && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E07A5F]/10 text-[#E07A5F]">
            EC expanded · {dgCount} DGs shown
          </span>
        )}
        {intelligenceError && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#C0392B]/10 text-[#C0392B]">
            {intelligenceError}
          </span>
        )}
      </div>

      <main className="px-6 pb-16">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-[var(--text-2)]">
            <p className="text-lg font-medium">No entities match your filters</p>
            <button
              onClick={() => {
                clearFilters();
              }}
              className="mt-3 text-sm text-[var(--accent)] hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((entity) => (
              <EntityCard
                key={entity.id}
                entity={entity}
                intelligence={intelligenceByEntityId[entity.id]}
                hacsAssignment={hacsAssignmentsByEntityId[entity.id]}
                onOpen={setSelectedEntity}
                indent={entity.is_ec_dg}
                selected={selectedIds.includes(entity.id)}
                onToggleSelect={toggleEntitySelection}
              />
            ))}
          </div>
        )}
      </main>

      <EntityDrawer
        entity={selectedEntity}
        intelligence={selectedEntity ? intelligenceByEntityId[selectedEntity.id] : undefined}
        hacsAssignment={selectedEntity ? hacsAssignmentsByEntityId[selectedEntity.id] : undefined}
        refreshing={selectedEntity ? refreshingIds.includes(selectedEntity.id) : false}
        onRefresh={(entityId) => handleRefresh([entityId])}
        onClose={() => setSelectedEntity(null)}
      />

      <IntelligenceComparePanel
        open={compareOpen}
        entities={selectedEntities}
        intelligenceByEntityId={intelligenceByEntityId}
        hacsAssignmentsByEntityId={hacsAssignmentsByEntityId}
        refreshing={refreshingIds.length > 0}
        onClose={() => setCompareOpen(false)}
        onRefresh={() => handleRefresh(selectedIds)}
        onOpenDossier={(entity) => {
          setCompareOpen(false);
          setSelectedEntity(entity);
        }}
      />
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: [string, string][];
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex items-center gap-1.5 text-xs text-[var(--text-2)]">
      <span>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs font-medium text-[var(--text-1)] outline-none focus:ring-1 focus:ring-[var(--accent)]"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}
