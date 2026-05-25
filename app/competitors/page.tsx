"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { fetchAllocations, type PastAllocationOut } from "@/lib/api";
import { HACS_FIELDS } from "@/lib/types";

const BarChart = dynamic(
  () => import("recharts").then((m) => m.BarChart),
  { ssr: false }
);
const Bar = dynamic(() => import("recharts").then((m) => m.Bar), { ssr: false });
const XAxis = dynamic(() => import("recharts").then((m) => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then((m) => m.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then((m) => m.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then((m) => m.Tooltip), { ssr: false });
const Legend = dynamic(() => import("recharts").then((m) => m.Legend), { ssr: false });
const ResponsiveContainer = dynamic(
  () => import("recharts").then((m) => m.ResponsiveContainer),
  { ssr: false }
);

type View = "by_entity" | "by_supplier";

const FIELD_COLORS: Record<number, string> = {
  1: "#8B5CF6",
  2: "#0EA5E9",
  3: "#10B981",
  4: "#F59E0B",
  5: "#EF4444",
};

function buildEntityData(rows: PastAllocationOut[]) {
  const map: Record<string, Record<string, number>> = {};
  for (const r of rows) {
    const entity = r.entity_acronym || r.entity_name_raw;
    if (!map[entity]) map[entity] = {};
    const key = r.hacs_field ? `Field ${r.hacs_field}` : "Unknown";
    map[entity][key] = (map[entity][key] || 0) + 1;
  }
  return Object.entries(map).map(([name, fields]) => ({ name, ...fields }));
}

function buildSupplierData(rows: PastAllocationOut[]) {
  const map: Record<string, Record<string, number>> = {};
  for (const r of rows) {
    const supplier = r.entity_name_raw;
    if (!map[supplier]) map[supplier] = {};
    const key = r.client_name || "Unknown client";
    map[supplier][key] = (map[supplier][key] || 0) + 1;
  }
  return Object.entries(map).map(([name, clients]) => ({ name, ...clients }));
}

export default function CompetitorsPage() {
  const [allocations, setAllocations] = useState<PastAllocationOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState<View>("by_entity");

  useEffect(() => {
    fetchAllocations()
      .then(setAllocations)
      .catch(() => setError("Backend unavailable"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-[var(--text-2)] text-sm">
        Loading…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-[var(--text-2)] text-sm">
        {error}
      </div>
    );
  }

  if (allocations.length === 0) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex flex-col items-center justify-center gap-4">
        <div className="text-center space-y-2">
          <p className="text-lg font-semibold text-[var(--text-1)]">No allocation data yet</p>
          <p className="text-sm text-[var(--text-2)]">
            Import past contracts from the{" "}
            <a href="/import" className="text-[var(--accent)] hover:underline">
              Import page
            </a>{" "}
            to see competitor analysis here.
          </p>
        </div>
        <div className="mt-4 rounded-xl border border-dashed border-[var(--border)] p-8 text-center text-xs text-[var(--text-2)] max-w-sm">
          Stacked bar charts will appear here showing allocation breakdowns by entity and supplier
          once contract data is imported.
        </div>
      </div>
    );
  }

  const entityData = buildEntityData(allocations);
  const supplierData = buildSupplierData(allocations);

  const fieldKeys = Array.from(
    new Set(allocations.map((r) => (r.hacs_field ? `Field ${r.hacs_field}` : "Unknown")))
  );
  const clientKeys = Array.from(new Set(allocations.map((r) => r.client_name || "Unknown client")));

  return (
    <div className="min-h-screen bg-[var(--bg)] px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--text-1)]">Competitor War Room</h1>
        <div className="flex gap-1">
          {(["by_entity", "by_supplier"] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                view === v
                  ? "bg-[var(--text-1)] text-white border-[var(--text-1)]"
                  : "border-[var(--border)] text-[var(--text-2)] hover:border-[var(--text-2)]"
              }`}
            >
              {v === "by_entity" ? "By entity" : "By supplier"}
            </button>
          ))}
        </div>
      </div>

      <p className="text-sm text-[var(--text-2)]">
        {allocations.length} contracts · {view === "by_entity" ? "grouped by client entity" : "grouped by supplier"}
      </p>

      {view === "by_entity" ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="text-sm font-semibold text-[var(--text-1)] mb-4">
            Contracts by entity (stacked by HACS field)
          </h2>
          <ResponsiveContainer width="100%" height={Math.max(300, entityData.length * 50)}>
            <BarChart data={entityData} layout="vertical" margin={{ left: 80 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11 }}
                width={80}
              />
              <Tooltip />
              <Legend />
              {fieldKeys.map((key) => {
                const fieldNum = parseInt(key.replace("Field ", ""));
                const color = FIELD_COLORS[fieldNum] || "#94A3B8";
                return <Bar key={key} dataKey={key} stackId="a" fill={color} />;
              })}
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="text-sm font-semibold text-[var(--text-1)] mb-4">
            Contracts by supplier (stacked by client)
          </h2>
          <ResponsiveContainer width="100%" height={Math.max(300, supplierData.length * 50)}>
            <BarChart data={supplierData} layout="vertical" margin={{ left: 100 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11 }}
                width={100}
              />
              <Tooltip />
              <Legend />
              {clientKeys.slice(0, 8).map((key, i) => {
                const colors = ["#8B5CF6", "#0EA5E9", "#10B981", "#F59E0B", "#EF4444", "#EC4899", "#14B8A6", "#F97316"];
                return <Bar key={key} dataKey={key} stackId="a" fill={colors[i % colors.length]} />;
              })}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Raw table */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
        <div className="px-5 py-3 border-b border-[var(--border)]">
          <h2 className="text-sm font-semibold text-[var(--text-1)]">All contracts</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-[var(--bg)]">
              <tr>
                {["Supplier", "Client", "Field", "Value", "Role", "Source"].map((h) => (
                  <th key={h} className="px-4 py-2 text-left text-[var(--text-2)] font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {allocations.map((r) => (
                <tr key={r.id} className="hover:bg-[var(--border)]/30">
                  <td className="px-4 py-2 font-medium text-[var(--text-1)]">{r.entity_name_raw}</td>
                  <td className="px-4 py-2 text-[var(--text-2)] max-w-[200px] truncate">{r.client_name}</td>
                  <td className="px-4 py-2">
                    {r.hacs_field ? (
                      <span
                        className="px-1.5 py-0.5 rounded text-white text-[10px]"
                        style={{ backgroundColor: FIELD_COLORS[r.hacs_field] || "#94A3B8" }}
                      >
                        {r.hacs_field}
                      </span>
                    ) : (
                      <span className="text-[var(--text-2)]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-[var(--text-2)]">
                    {r.contract_value_eur
                      ? `€${(r.contract_value_eur / 1000).toFixed(0)}k`
                      : "—"}
                  </td>
                  <td className="px-4 py-2 text-[var(--text-2)] capitalize">{r.role || "—"}</td>
                  <td className="px-4 py-2 text-[var(--text-2)] uppercase text-[10px]">{r.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
