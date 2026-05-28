"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { EntityDrawer } from "@/components/EntityDrawer";
import {
  buildCpvSpendRows,
  buildCpvSpendSummary,
  TedSpendIntelligence,
} from "@/components/TedSpendIntelligence";
import {
  fetchHacsAssignments,
  fetchIntelligence,
  fetchIntelligenceRefreshStatus,
  type ApiHacsAssignment,
  type ApiEntityIntelligence,
  type ApiIntelligenceRefreshRun,
} from "@/lib/api";
import { getAllEntities } from "@/lib/scoring";
import type { EntityWithScore } from "@/lib/types";

const allEntities = getAllEntities();

function indexByEntityId(items: ApiEntityIntelligence[]) {
  return Object.fromEntries(items.map((item) => [item.entity_id, item]));
}

function indexAssignmentsByEntityId(items: ApiHacsAssignment[]) {
  return Object.fromEntries(items.map((item) => [item.entity_id, item]));
}

export default function TedSpendPage() {
  const [intelligenceByEntityId, setIntelligenceByEntityId] = useState<Record<number, ApiEntityIntelligence | undefined>>({});
  const [hacsAssignmentsByEntityId, setHacsAssignmentsByEntityId] = useState<Record<number, ApiHacsAssignment | undefined>>({});
  const [selectedEntity, setSelectedEntity] = useState<EntityWithScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [batchRun, setBatchRun] = useState<ApiIntelligenceRefreshRun | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchIntelligence(), fetchHacsAssignments(), fetchIntelligenceRefreshStatus()])
      .then(([intelligenceItems, assignmentItems, run]) => {
        startTransition(() => {
          setIntelligenceByEntityId(indexByEntityId(intelligenceItems));
          setHacsAssignmentsByEntityId(indexAssignmentsByEntityId(assignmentItems));
          setBatchRun(run);
          setLoading(false);
        });
      })
      .catch(() => {
        setError("TED spend intelligence is not available yet.");
        setLoading(false);
      });
  }, []);

  const rows = useMemo(
    () => buildCpvSpendRows(allEntities, intelligenceByEntityId),
    [intelligenceByEntityId]
  );
  const summary = useMemo(
    () => buildCpvSpendSummary(intelligenceByEntityId),
    [intelligenceByEntityId]
  );

  const batchRunning = batchRun?.status === "running";
  const batchProgress =
    batchRun && batchRun.total_entities > 0
      ? Math.round((batchRun.processed_entities / batchRun.total_entities) * 100)
      : 0;

  return (
    <main className="min-h-screen bg-[var(--bg)] px-6 py-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-2)]">
              Spend intelligence
            </p>
            <h1 className="mt-1 text-3xl font-bold text-[var(--text-1)]">
              TED CPV spend map
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--text-2)]">
              Vista dedicata alla spesa TED per famiglie CPV 72, 73 e 79. Usa gli snapshot
              intelligence salvati: se la vista è vuota o vecchia, rilancia Refresh all dalla
              Entity Map.
            </p>
          </div>
          <Link
            href="/"
            className="text-sm font-medium text-[var(--accent)] hover:underline"
          >
            Back to Entity Map →
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-2)]">
          <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1">
            {rows.length} entities with mapped CPV spend
          </span>
          {batchRun && (
            <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1">
              Batch {batchRun.status}
              {batchRunning ? ` · ${batchProgress}%` : ""}
            </span>
          )}
          {error && (
            <span className="rounded-full bg-[#C0392B]/10 px-3 py-1 text-[#C0392B]">
              {error}
            </span>
          )}
        </div>

        <TedSpendIntelligence
          rows={rows}
          summary={summary}
          loading={loading}
          onOpenEntity={(entityId) => {
            const entity = allEntities.find((item) => item.id === entityId);
            if (entity) setSelectedEntity(entity);
          }}
        />
      </div>

      <EntityDrawer
        entity={selectedEntity}
        intelligence={selectedEntity ? intelligenceByEntityId[selectedEntity.id] : undefined}
        hacsAssignment={selectedEntity ? hacsAssignmentsByEntityId[selectedEntity.id] : undefined}
        onClose={() => setSelectedEntity(null)}
      />
    </main>
  );
}
