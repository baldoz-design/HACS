"use client";

import { useMemo, useState } from "react";
import { getAllEntities } from "@/lib/scoring";
import { HACS_FIELDS } from "@/lib/types";
import type { EntityWithScore } from "@/lib/types";
import { EntityCard } from "@/components/EntityCard";
import { EntityDrawer } from "@/components/EntityDrawer";
import competitorsData from "@/data/competitors.json";

type SortKey = "priority_score" | "cluster_budget_eur" | "name";
type Cluster = "Brussels" | "Luxembourg" | "Frankfurt" | "The Hague" | "Other";

const ALL_CLUSTERS: Cluster[] = ["Brussels", "Luxembourg", "Frankfurt", "The Hague", "Other"];
const ALL_FIELDS = [1, 2, 3, 4, 5];

const allEntities = getAllEntities();

export default function Home() {
  const [search, setSearch] = useState("");
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [fields, setFields] = useState<number[]>([]);
  const [showDgs, setShowDgs] = useState(false);
  const [sort, setSort] = useState<SortKey>("priority_score");
  const [selectedEntity, setSelectedEntity] = useState<EntityWithScore | null>(null);

  const filtered = useMemo(() => {
    let entities = showDgs
      ? allEntities
      : allEntities.filter((e) => !e.is_ec_dg);

    if (search.trim()) {
      const q = search.toLowerCase();
      entities = entities.filter(
        (e) =>
          e.acronym.toLowerCase().includes(q) ||
          e.name.toLowerCase().includes(q)
      );
    }

    if (clusters.length > 0) {
      entities = entities.filter((e) => clusters.includes(e.cluster as Cluster));
    }

    if (fields.length > 0) {
      const includeNull = fields.includes(0);
      entities = entities.filter((e) =>
        includeNull
          ? e.top_hacs_field === null || fields.includes(e.top_hacs_field)
          : fields.includes(e.top_hacs_field ?? -1)
      );
    }

    return [...entities].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "cluster_budget_eur")
        return b.cluster_budget_eur - a.cluster_budget_eur;
      return b.priority_score - a.priority_score;
    });
  }, [search, clusters, fields, showDgs, sort]);

  function toggleCluster(c: Cluster) {
    setClusters((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
  }

  function toggleField(f: number) {
    setFields((prev) =>
      prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]
    );
  }

  const dgCount = allEntities.filter((e) => e.is_ec_dg).length;

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Filter bar */}
      <div className="sticky top-[53px] z-30 bg-[var(--surface)] border-b border-[var(--border)] px-6 py-3 space-y-3">
        {/* Row 1: search + sort */}
        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="text"
            placeholder="Search by name or acronym…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 px-3 text-sm rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-1)] placeholder:text-[var(--text-2)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] w-64"
          />
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-xs text-[var(--text-2)]">Sort:</span>
            {(["priority_score", "cluster_budget_eur", "name"] as SortKey[]).map((s) => (
              <button
                key={s}
                onClick={() => setSort(s)}
                className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                  sort === s
                    ? "bg-[var(--text-1)] text-white border-[var(--text-1)]"
                    : "border-[var(--border)] text-[var(--text-2)] hover:border-[var(--text-2)]"
                }`}
              >
                {s === "priority_score" ? "Priority" : s === "cluster_budget_eur" ? "Budget" : "Name"}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: filters + toggle */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Cluster filter */}
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-xs text-[var(--text-2)] mr-1">Cluster:</span>
            {ALL_CLUSTERS.map((c) => (
              <button
                key={c}
                onClick={() => toggleCluster(c)}
                className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                  clusters.includes(c)
                    ? "bg-[var(--accent)] text-white border-[var(--accent)]"
                    : "border-[var(--border)] text-[var(--text-2)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Field filter */}
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-xs text-[var(--text-2)] mr-1">Field:</span>
            {ALL_FIELDS.map((f) => (
              <button
                key={f}
                onClick={() => toggleField(f)}
                className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                  fields.includes(f)
                    ? "text-white border-transparent"
                    : "border-[var(--border)] text-[var(--text-2)] hover:border-[var(--text-2)]"
                }`}
                style={fields.includes(f) ? { backgroundColor: HACS_FIELDS[f].color } : {}}
              >
                {f}
              </button>
            ))}
            <button
              onClick={() => toggleField(0)}
              className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                fields.includes(0)
                  ? "bg-[#D1D5DB] text-[#374151] border-[#D1D5DB]"
                  : "border-[var(--border)] text-[var(--text-2)] hover:border-[var(--text-2)]"
              }`}
            >
              Not set
            </button>
          </div>

          {/* EC DG toggle */}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-[var(--text-2)]">Show EC DGs</span>
            <button
              onClick={() => setShowDgs((v) => !v)}
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
          </div>
        </div>
      </div>

      {/* Entity count bar */}
      <div className="px-6 py-2 text-xs text-[var(--text-2)] flex items-center gap-2">
        <span>
          {filtered.length} {filtered.length === 1 ? "entity" : "entities"}
          {search || clusters.length > 0 || fields.length > 0 ? " matching filters" : ""}
        </span>
        {showDgs && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E07A5F]/10 text-[#E07A5F]">
            EC expanded · {dgCount} DGs shown
          </span>
        )}
      </div>

      {/* Grid */}
      <main className="px-6 pb-16">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-[var(--text-2)]">
            <p className="text-lg font-medium">No entities match your filters</p>
            <button
              onClick={() => { setSearch(""); setClusters([]); setFields([]); }}
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
                onOpen={setSelectedEntity}
                indent={entity.is_ec_dg}
              />
            ))}
          </div>
        )}
      </main>

      {/* Drawer */}
      <EntityDrawer
        entity={selectedEntity}
        competitors={competitorsData}
        onClose={() => setSelectedEntity(null)}
      />
    </div>
  );
}
