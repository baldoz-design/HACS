"use client";

import { useEffect, useMemo, useState } from "react";

import competitorDirectoryData from "@/data/competitors.json";
import { fetchAllocations, type PastAllocationOut } from "@/lib/api";
import { formatEur } from "@/lib/format";
import { HACS_FIELDS } from "@/lib/types";

type SortKey = "value" | "records" | "entities";

interface SupplierSummary {
  name: string;
  aliases: Set<string>;
  records: number;
  value: number;
  entities: Set<string>;
  fields: Map<number, number>;
  examples: PastAllocationOut[];
}

interface CompetitorDirectoryEntry {
  rank: number;
  name: string;
  is_consortium: boolean;
  key_members: string;
}

const COMPETITOR_DIRECTORY = competitorDirectoryData as CompetitorDirectoryEntry[];

const COMPETITOR_GROUPS: Array<{ name: string; patterns: RegExp[] }> = [
  { name: "PwC", patterns: [/\bpwc\b/i, /pricewaterhousecoopers/i] },
  { name: "EY", patterns: [/\bey\b/i, /ernst\s*(?:&|and)\s*young/i] },
  { name: "NTT DATA", patterns: [/ntt\s*data/i] },
  { name: "Tremend", patterns: [/tremend/i] },
  { name: "European Dynamics", patterns: [/european\s+dynamics/i] },
  { name: "Grant Thornton", patterns: [/grant\s+thornton/i] },
  { name: "Deloitte", patterns: [/deloitte/i] },
  { name: "Gartner", patterns: [/gartner/i] },
  { name: "KPMG", patterns: [/\bkpmg\b/i] },
  { name: "Atos", patterns: [/\batos\b/i] },
  { name: "ARHS", patterns: [/\barhs\b/i] },
  { name: "Cegeka", patterns: [/cegeka/i] },
  { name: "Sopra Steria", patterns: [/sopra\s+steria/i] },
  { name: "Wavestone", patterns: [/wavestone/i] },
  { name: "IDC", patterns: [/\bidc\b/i] },
  { name: "Fincons", patterns: [/fincons/i] },
  { name: "NRB", patterns: [/\bnrb\b/i, /network\s+research\s+belgium/i] },
  { name: "CTG", patterns: [/\bctg\b/i, /computer\s+task\s+group/i] },
  { name: "Netcompany", patterns: [/netcompany/i, /intrasoft/i] },
  { name: "Open Evidence", patterns: [/open\s+evidence/i] },
  { name: "IQVIA", patterns: [/\biqvia\b/i] },
];

const NON_COMPETITOR_PATTERNS = [
  /integrating\s+the\s+healthcare\s+enterprise\s+catalyst/i,
];

function supplierParts(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .replace(/Lot\s+\d+:/gi, "")
    .split(/\s*[;|]\s*|\s+\+\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function memberParts(raw: string): string[] {
  return raw
    .split(/\s*,\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function stripLegalSuffixes(name: string): string {
  return name
    .replace(/\bS\.?A\.?\b/gi, "")
    .replace(/\bN\.?V\.?\b/gi, "")
    .replace(/\bS\.?R\.?L\.?\b/gi, "")
    .replace(/\bSPRL\b/gi, "")
    .replace(/\bBVBA\b/gi, "")
    .replace(/\bEESV\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function canonicalSupplier(name: string): string {
  const normalized = stripLegalSuffixes(name);
  if (NON_COMPETITOR_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return "";
  }
  const group = COMPETITOR_GROUPS.find((candidate) =>
    candidate.patterns.some((pattern) => pattern.test(normalized))
  );
  return group?.name ?? normalized;
}

function sourceLabel(source: string): string {
  if (source === "beacon_execution_public") return "BEACON execution";
  if (source === "beacon_execution_discovery") return "Execution discovery";
  if (source === "beacon_direct") return "BEACON award";
  return source;
}

function isSupplierExecutionSource(source: string): boolean {
  return source === "beacon_execution_public" || source === "beacon_execution_discovery";
}

function isFrameworkAggregate(row: PastAllocationOut): boolean {
  const supplier = row.supplier_name ?? "";
  return /Lot\s+\d+:/i.test(supplier) || supplier.includes(" | Lot ");
}

function fieldLabel(fieldId: number | null): string {
  if (!fieldId) return "Unknown";
  return `F${fieldId}: ${HACS_FIELDS[fieldId]?.label ?? "Unknown"}`;
}

function buildSupplierSummaries(rows: PastAllocationOut[]): SupplierSummary[] {
  const summaries = new Map<string, SupplierSummary>();

  for (const row of rows) {
    const suppliers = supplierParts(row.supplier_name);
    for (const supplier of suppliers) {
      const name = canonicalSupplier(supplier);
      if (!name) continue;
      const alias = stripLegalSuffixes(supplier);
      const summary = summaries.get(name) ?? {
        name,
        aliases: new Set<string>(),
        records: 0,
        value: 0,
        entities: new Set<string>(),
        fields: new Map<number, number>(),
        examples: [],
      };
      if (alias && alias !== name) {
        summary.aliases.add(alias);
      }
      summary.records += 1;
      summary.value += row.contract_value_eur ?? 0;
      summary.entities.add(row.entity_acronym ?? row.client_name);
      if (row.hacs_field) {
        summary.fields.set(row.hacs_field, (summary.fields.get(row.hacs_field) ?? 0) + 1);
      }
      if (summary.examples.length < 3) {
        summary.examples.push(row);
      }
      summaries.set(name, summary);
    }
  }

  return Array.from(summaries.values());
}

function topField(summary: SupplierSummary): number | null {
  const ranked = Array.from(summary.fields.entries()).sort(([, a], [, b]) => b - a);
  return ranked[0]?.[0] ?? null;
}

function sortSuppliers(suppliers: SupplierSummary[], sortKey: SortKey): SupplierSummary[] {
  return [...suppliers].sort((a, b) => {
    if (sortKey === "records") return b.records - a.records;
    if (sortKey === "entities") return b.entities.size - a.entities.size;
    return b.value - a.value;
  });
}

function competitorMatchTerms(competitor: CompetitorDirectoryEntry): string[] {
  return [competitor.name, ...memberParts(competitor.key_members)]
    .map(canonicalSupplier)
    .filter(Boolean);
}

function buildDirectoryEvidenceIndex(suppliers: SupplierSummary[]) {
  const index = new Map<string, { records: number; value: number; entities: number }>();

  for (const competitor of COMPETITOR_DIRECTORY) {
    const terms = competitorMatchTerms(competitor);
    const matched = suppliers.filter((supplier) =>
      terms.some((term) => {
        const supplierName = supplier.name.toLowerCase();
        const matchTerm = term.toLowerCase();
        return (
          supplierName === matchTerm ||
          supplierName.includes(matchTerm) ||
          matchTerm.includes(supplierName)
        );
      })
    );
    const entities = new Set<string>();
    for (const supplier of matched) {
      supplier.entities.forEach((entity) => entities.add(entity));
    }
    index.set(competitor.name, {
      records: matched.reduce((sum, supplier) => sum + supplier.records, 0),
      value: matched.reduce((sum, supplier) => sum + supplier.value, 0),
      entities: entities.size,
    });
  }

  return index;
}

export default function CompetitorsPage() {
  const [allocations, setAllocations] = useState<PastAllocationOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [fieldFilter, setFieldFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("value");

  useEffect(() => {
    fetchAllocations()
      .then(setAllocations)
      .catch(() => setError("Backend unavailable"))
      .finally(() => setLoading(false));
  }, []);

  const evidenceRows = useMemo(
    () =>
      allocations.filter(
        (row) =>
          isSupplierExecutionSource(row.source) &&
          row.supplier_name &&
          !isFrameworkAggregate(row)
      ),
    [allocations]
  );

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return evidenceRows.filter((row) => {
      const matchesField = fieldFilter === "all" || String(row.hacs_field) === fieldFilter;
      const haystack = [
        row.supplier_name,
        row.client_name,
        row.entity_acronym,
        row.contract_title,
        row.field_of_expertise,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return matchesField && (!query || haystack.includes(query));
    });
  }, [evidenceRows, fieldFilter, search]);

  const supplierSummaries = useMemo(
    () => sortSuppliers(buildSupplierSummaries(filteredRows), sortKey),
    [filteredRows, sortKey]
  );

  const allEvidenceSupplierSummaries = useMemo(
    () => buildSupplierSummaries(evidenceRows),
    [evidenceRows]
  );

  const directoryEvidenceIndex = useMemo(
    () => buildDirectoryEvidenceIndex(allEvidenceSupplierSummaries),
    [allEvidenceSupplierSummaries]
  );

  const totalValue = filteredRows.reduce((sum, row) => sum + (row.contract_value_eur ?? 0), 0);
  const entityCount = new Set(filteredRows.map((row) => row.entity_acronym ?? row.client_name)).size;
  const supplierCount = COMPETITOR_DIRECTORY.length;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-[var(--text-2)]">
        Loading competitor evidence...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-[var(--text-2)]">
        {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] px-6 py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-2)]">
              Competitor intelligence
            </p>
            <h1 className="mt-1 text-3xl font-bold text-[var(--text-1)]">
              BEACON execution evidence
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--text-2)]">
              Vista basata sui vecchi affidamenti pubblici BEACON: chi ha lavorato con quali enti,
              su quali field HACS e per che valore. I framework award aggregati sono esclusi dai
              ranking supplier-level.
            </p>
          </div>
          <a
            href="/import"
            className="text-sm font-medium text-[var(--accent)] hover:underline"
          >
            Manage sources →
          </a>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <MetricCard label="Execution records" value={filteredRows.length.toString()} />
          <MetricCard label="Competitors in directory" value={supplierCount.toString()} />
          <MetricCard label="Client entities" value={entityCount.toString()} />
          <MetricCard label="Mapped value" value={totalValue ? formatEur(totalValue) : "n/a"} />
        </div>

        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-1)]">
                Competitor directory
              </h2>
              <p className="mt-1 text-xs text-[var(--text-2)]">
                Lista master dei competitor individuati nella presentazione CTM_HACS_vpartner.
              </p>
            </div>
            <p className="text-xs font-medium text-[var(--text-2)]">
              {COMPETITOR_DIRECTORY.length} competitor
            </p>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-[var(--bg)] text-left text-[var(--text-2)]">
                <tr>
                  <th className="rounded-l-lg px-4 py-3 font-medium">Rank</th>
                  <th className="px-4 py-3 font-medium">Competitor</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Key members</th>
                  <th className="rounded-r-lg px-4 py-3 font-medium text-right">Evidence match</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {COMPETITOR_DIRECTORY.map((competitor) => {
                  const evidence = directoryEvidenceIndex.get(competitor.name);
                  return (
                    <tr key={competitor.rank} className="align-top hover:bg-[var(--bg)]/70">
                      <td className="px-4 py-3 font-semibold text-[var(--text-1)]">
                        #{competitor.rank}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-[var(--text-1)]">{competitor.name}</p>
                      </td>
                      <td className="px-4 py-3 text-[var(--text-2)]">
                        {competitor.is_consortium ? "Consortium" : "Single supplier"}
                      </td>
                      <td className="max-w-[520px] px-4 py-3 text-[var(--text-2)]">
                        {competitor.key_members}
                      </td>
                      <td className="px-4 py-3 text-right text-[var(--text-2)]">
                        {evidence?.records ? (
                          <>
                            <span className="font-semibold text-[var(--text-1)]">
                              {evidence.records}
                            </span>
                            <span className="ml-1">record(s)</span>
                            {evidence.value > 0 && (
                              <span className="block text-[10px]">
                                {formatEur(evidence.value)}
                              </span>
                            )}
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_180px_180px]">
            <label className="text-xs font-medium text-[var(--text-2)]">
              Search supplier, entity or contract
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="e.g. PwC, HADEA, compliance..."
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text-1)] outline-none focus:border-[var(--accent)]"
              />
            </label>
            <label className="text-xs font-medium text-[var(--text-2)]">
              HACS field
              <select
                value={fieldFilter}
                onChange={(event) => setFieldFilter(event.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text-1)] outline-none focus:border-[var(--accent)]"
              >
                <option value="all">All fields</option>
                {Object.entries(HACS_FIELDS).map(([fieldId, field]) => (
                  <option key={fieldId} value={fieldId}>
                    F{fieldId}: {field.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium text-[var(--text-2)]">
              Sort suppliers
              <select
                value={sortKey}
                onChange={(event) => setSortKey(event.target.value as SortKey)}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text-1)] outline-none focus:border-[var(--accent)]"
              >
                <option value="value">By value</option>
                <option value="records">By records</option>
                <option value="entities">By entity footprint</option>
              </select>
            </label>
          </div>
        </div>

        {filteredRows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-10 text-center">
            <p className="text-sm font-semibold text-[var(--text-1)]">
              No competitor evidence found for these filters.
            </p>
            <p className="mt-2 text-sm text-[var(--text-2)]">
              Sync BEACON execution signals from the Import page or clear the filters.
            </p>
          </div>
        ) : (
          <>
            <section className="space-y-3">
              <div>
                <h2 className="text-sm font-semibold text-[var(--text-1)]">
                  Top competitors
                </h2>
                <p className="mt-1 text-xs text-[var(--text-2)]">
                  Supplier più rilevanti secondo l’ordinamento selezionato.
                </p>
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                {supplierSummaries.slice(0, 8).map((supplier) => {
                  const fieldId = topField(supplier);
                  const field = fieldId ? HACS_FIELDS[fieldId] : null;
                  return (
                    <article
                      key={supplier.name}
                      className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <h2 className="truncate text-lg font-semibold text-[var(--text-1)]">
                            {supplier.name}
                          </h2>
                          <p className="mt-1 text-xs text-[var(--text-2)]">
                            {supplier.records} evidence record(s) · {supplier.entities.size} client entit(y/ies)
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-semibold text-[var(--text-1)]">
                            {supplier.value ? formatEur(supplier.value) : "n/a"}
                          </p>
                          <p className="text-[10px] uppercase tracking-wider text-[var(--text-2)]">
                            mapped value
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {field ? (
                          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg)] px-2.5 py-1 text-xs text-[var(--text-1)]">
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: field.color }}
                            />
                            {fieldLabel(fieldId)}
                          </span>
                        ) : (
                          <span className="rounded-full border border-[var(--border)] bg-[var(--bg)] px-2.5 py-1 text-xs text-[var(--text-2)]">
                            Field unknown
                          </span>
                        )}
                        {Array.from(supplier.entities).slice(0, 4).map((entity) => (
                          <span
                            key={entity}
                            className="rounded-full border border-[var(--border)] bg-[var(--bg)] px-2.5 py-1 text-xs text-[var(--text-2)]"
                          >
                            {entity}
                          </span>
                        ))}
                      </div>
                      <div className="mt-4 space-y-2">
                        {supplier.examples.map((row) => (
                          <p key={`${row.source}-${row.id}-${row.supplier_name}`} className="line-clamp-1 text-xs text-[var(--text-2)]">
                            {row.contract_title}
                          </p>
                        ))}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
              <div className="border-b border-[var(--border)] px-5 py-4">
                <h2 className="text-sm font-semibold text-[var(--text-1)]">
                  All detected competitors
                </h2>
                <p className="mt-1 text-xs text-[var(--text-2)]">
                  Lista completa dei supplier individuati nelle execution evidence supplier-level.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-[var(--bg)] text-left text-[var(--text-2)]">
                    <tr>
                      <th className="px-4 py-3 font-medium">Competitor</th>
                      <th className="px-4 py-3 font-medium">Evidence</th>
                      <th className="px-4 py-3 font-medium">Entities</th>
                      <th className="px-4 py-3 font-medium">Main field</th>
                      <th className="px-4 py-3 font-medium text-right">Mapped value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {supplierSummaries.map((supplier) => {
                      const fieldId = topField(supplier);
                      return (
                        <tr key={supplier.name} className="align-top hover:bg-[var(--bg)]/70">
                          <td className="px-4 py-3 font-semibold text-[var(--text-1)]">
                            {supplier.name}
                          </td>
                          <td className="px-4 py-3 text-[var(--text-2)]">
                            {supplier.records} record(s)
                          </td>
                          <td className="max-w-[420px] px-4 py-3 text-[var(--text-2)]">
                            <span className="font-medium text-[var(--text-1)]">
                              {supplier.entities.size}
                            </span>
                            <span className="ml-2 line-clamp-2">
                              {Array.from(supplier.entities).join(", ")}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-[var(--text-1)]">
                            {fieldLabel(fieldId)}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-[var(--text-1)]">
                            {supplier.value ? formatEur(supplier.value) : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
              <div className="border-b border-[var(--border)] px-5 py-4">
                <h2 className="text-sm font-semibold text-[var(--text-1)]">
                  Execution records
                </h2>
                <p className="mt-1 text-xs text-[var(--text-2)]">
                  Record-level evidence with source links for verification.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-[var(--bg)] text-left text-[var(--text-2)]">
                    <tr>
                      <th className="px-4 py-3 font-medium">Supplier</th>
                      <th className="px-4 py-3 font-medium">Client</th>
                      <th className="px-4 py-3 font-medium">Contract</th>
                      <th className="px-4 py-3 font-medium">Field</th>
                      <th className="px-4 py-3 font-medium">Value</th>
                      <th className="px-4 py-3 font-medium">Evidence</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {filteredRows.map((row) => (
                      <tr
                        key={`${row.source}-${row.id}-${row.supplier_name}-${row.client_name}`}
                        className="align-top hover:bg-[var(--bg)]/70"
                      >
                        <td className="max-w-[240px] px-4 py-3 font-medium text-[var(--text-1)]">
                          {row.supplier_name}
                        </td>
                        <td className="px-4 py-3 text-[var(--text-2)]">
                          <span className="font-medium text-[var(--text-1)]">
                            {row.entity_acronym ?? "—"}
                          </span>
                          <span className="block max-w-[220px] truncate">{row.client_name}</span>
                        </td>
                        <td className="max-w-[320px] px-4 py-3 text-[var(--text-2)]">
                          <span className="line-clamp-2">{row.contract_title}</span>
                          {row.field_of_expertise && (
                            <span className="mt-1 block line-clamp-2 text-[10px]">
                              {row.field_of_expertise}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-[var(--text-1)]">
                          {fieldLabel(row.hacs_field)}
                        </td>
                        <td className="px-4 py-3 font-medium text-[var(--text-1)]">
                          {row.contract_value_eur ? formatEur(row.contract_value_eur) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-[10px] uppercase tracking-wider text-[var(--text-2)]">
                            {sourceLabel(row.source)}
                          </div>
                          {row.source_url && (
                            <a
                              href={row.source_url}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-1 inline-block text-xs font-medium text-[var(--accent)] hover:underline"
                            >
                              Open source →
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-2)]">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-[var(--text-1)]">{value}</p>
    </div>
  );
}
