"use client";

import { useState } from "react";

import { formatEur } from "@/lib/format";
import { HACS_FIELDS, type EntityWithScore } from "@/lib/types";
import type { ApiEntityIntelligence } from "@/lib/api";

const CPV_FAMILIES = {
  "72": { label: "72", description: "IT / digital" },
  "73": { label: "73", description: "R&D / consulting" },
  "79": { label: "79", description: "Business / advisory" },
} as const;
const ROWS_PER_PAGE = 5;

type CpvFamily = keyof typeof CPV_FAMILIES;

interface CpvSpendCell {
  family: CpvFamily;
  tenderCount: number;
  awardedTenderCount: number;
  awardedValue: number;
  estimatedValue: number;
  dominantField: number | null;
  topTitles: string[];
}

interface CpvSpendRow {
  entityId: number;
  entityAcronym: string;
  entityName: string;
  totalValue: number;
  totalTenderCount: number;
  cells: Record<CpvFamily, CpvSpendCell>;
}

interface CpvSpendFamilySummary {
  family: CpvFamily;
  tenderCount: number;
  awardedTenderCount: number;
  estimatedValue: number;
  awardedValue: number;
}

export interface CpvSpendSummary {
  tenderCount: number;
  awardedTenderCount: number;
  estimatedValue: number;
  awardedValue: number;
  byFamily: CpvSpendFamilySummary[];
}

function emptyCell(family: CpvFamily): CpvSpendCell {
  return {
    family,
    tenderCount: 0,
    awardedTenderCount: 0,
    awardedValue: 0,
    estimatedValue: 0,
    dominantField: null,
    topTitles: [],
  };
}

function cpvFamilyFromCode(code: string): CpvFamily | null {
  const prefix = code.slice(0, 2);
  return prefix === "72" || prefix === "73" || prefix === "79" ? prefix : null;
}

function signalTenderId(
  entityId: number,
  signal: ApiEntityIntelligence["signals"][number]
): string {
  return `${entityId}-${signal.url ?? signal.title}-${signal.date ?? ""}`;
}

export function buildCpvSpendRows(
  entities: EntityWithScore[],
  intelligenceByEntityId: Record<number, ApiEntityIntelligence | undefined>
): CpvSpendRow[] {
  const rows: CpvSpendRow[] = [];

  for (const entity of entities) {
    const intelligence = intelligenceByEntityId[entity.id];
    if (!intelligence) continue;

    const fieldValues = new Map<CpvFamily, Map<number, number>>();
    const cells: Record<CpvFamily, CpvSpendCell> = {
      "72": emptyCell("72"),
      "73": emptyCell("73"),
      "79": emptyCell("79"),
    };

    for (const signal of intelligence.signals) {
      if (signal.source !== "ted") continue;
      const families = new Set(
        (signal.cpv_codes ?? [])
          .map(cpvFamilyFromCode)
          .filter((family): family is CpvFamily => Boolean(family))
      );
      if (families.size === 0) continue;

      const awardedValue = signal.award_value_eur ?? 0;
      const estimatedValue = signal.estimated_value_eur ?? 0;
      const fallbackValue =
        awardedValue || estimatedValue ? 0 : signal.contract_value_eur ?? 0;
      const spend = awardedValue || estimatedValue || fallbackValue || 1;

      for (const family of families) {
        const cell = cells[family];
        cell.tenderCount += 1;
        if (awardedValue > 0) {
          cell.awardedTenderCount += 1;
        }
        cell.awardedValue += awardedValue;
        cell.estimatedValue += estimatedValue + fallbackValue;
        if (signal.field_guess) {
          const familyFields = fieldValues.get(family) ?? new Map<number, number>();
          familyFields.set(signal.field_guess, (familyFields.get(signal.field_guess) ?? 0) + spend);
          fieldValues.set(family, familyFields);
        }
        if (cell.topTitles.length < 3) {
          cell.topTitles.push(signal.title);
        }
      }
    }

    for (const family of Object.keys(CPV_FAMILIES) as CpvFamily[]) {
      const rankedField = Array.from(fieldValues.get(family)?.entries() ?? []).sort(
        ([, a], [, b]) => b - a
      )[0]?.[0];
      cells[family].dominantField = rankedField ?? entity.top_hacs_field ?? null;
    }

    const totalValue = Object.values(cells).reduce(
      (sum, cell) => sum + cell.awardedValue + cell.estimatedValue,
      0
    );
    if (totalValue === 0) continue;

    rows.push({
      entityId: entity.id,
      entityAcronym: entity.acronym,
      entityName: entity.name,
      totalValue,
      totalTenderCount: Object.values(cells).reduce((sum, cell) => sum + cell.tenderCount, 0),
      cells,
    });
  }

  return rows.sort((a, b) => b.totalValue - a.totalValue);
}

export function buildCpvSpendSummary(
  intelligenceByEntityId: Record<number, ApiEntityIntelligence | undefined>
): CpvSpendSummary {
  const tenderIds = new Set<string>();
  const awardedTenderIds = new Set<string>();
  const familyBuckets = new Map<CpvFamily, CpvSpendFamilySummary>(
    (Object.keys(CPV_FAMILIES) as CpvFamily[]).map((family) => [
      family,
      {
        family,
        tenderCount: 0,
        awardedTenderCount: 0,
        estimatedValue: 0,
        awardedValue: 0,
      },
    ])
  );

  for (const intelligence of Object.values(intelligenceByEntityId)) {
    if (!intelligence) continue;

    for (const signal of intelligence.signals) {
      if (signal.source !== "ted") continue;
      const families = new Set(
        (signal.cpv_codes ?? [])
          .map(cpvFamilyFromCode)
          .filter((family): family is CpvFamily => Boolean(family))
      );
      if (families.size === 0) continue;

      const tenderId = signalTenderId(intelligence.entity_id, signal);
      const awardedValue = signal.award_value_eur ?? 0;
      const estimatedValue = signal.estimated_value_eur ?? 0;
      const fallbackValue =
        awardedValue || estimatedValue ? 0 : signal.contract_value_eur ?? 0;
      const hasAwardedValue = awardedValue > 0;

      tenderIds.add(tenderId);
      if (hasAwardedValue) {
        awardedTenderIds.add(tenderId);
      }

      for (const family of families) {
        const bucket = familyBuckets.get(family);
        if (!bucket) continue;
        bucket.tenderCount += 1;
        if (hasAwardedValue) {
          bucket.awardedTenderCount += 1;
        }
        bucket.estimatedValue += estimatedValue + fallbackValue;
        bucket.awardedValue += awardedValue;
      }
    }
  }

  const byFamily = Array.from(familyBuckets.values());
  return {
    tenderCount: tenderIds.size,
    awardedTenderCount: awardedTenderIds.size,
    estimatedValue: byFamily.reduce((sum, item) => sum + item.estimatedValue, 0),
    awardedValue: byFamily.reduce((sum, item) => sum + item.awardedValue, 0),
    byFamily,
  };
}

function cellValue(cell: CpvSpendCell): number {
  return cell.awardedValue + cell.estimatedValue;
}

function cellIntensity(cell: CpvSpendCell, maxValue: number): number {
  if (maxValue <= 0) return 0;
  return Math.max(0.08, Math.min(1, cellValue(cell) / maxValue));
}

function topRowsForFamily(rows: CpvSpendRow[], family: CpvFamily): CpvSpendRow[] {
  return [...rows]
    .filter((row) => cellValue(row.cells[family]) > 0)
    .sort((a, b) => cellValue(b.cells[family]) - cellValue(a.cells[family]))
    .slice(0, 10);
}

function SummaryMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-2)]">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-[var(--text-1)]">{value}</p>
      {detail && <p className="mt-1 text-xs text-[var(--text-2)]">{detail}</p>}
    </div>
  );
}

function SpendCell({ cell, maxValue }: { cell: CpvSpendCell; maxValue: number }) {
  const value = cellValue(cell);
  const field = cell.dominantField ? HACS_FIELDS[cell.dominantField] : null;
  const intensity = cellIntensity(cell, maxValue);

  if (value === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg)] p-3 text-xs text-[var(--text-2)]">
        No mapped spend
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3"
      title={cell.topTitles.join("\n")}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-bold text-[var(--text-1)]">{formatEur(value)}</p>
        {field && (
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
            style={{ backgroundColor: field.color }}
          >
            F{cell.dominantField}
          </span>
        )}
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--border)]">
        <div
          className="h-full rounded-full bg-[var(--text-1)]"
          style={{ width: `${Math.round(intensity * 100)}%` }}
        />
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-[var(--text-2)]">
        <span>
          Budget
          <strong className="block text-[var(--text-1)]">{formatEur(cell.estimatedValue)}</strong>
        </span>
        <span>
          Awarded
          <strong className="block text-[var(--text-1)]">{formatEur(cell.awardedValue)}</strong>
        </span>
      </div>
      <p className="mt-2 text-[10px] text-[var(--text-2)]">
        {cell.tenderCount} tender(s) · {cell.awardedTenderCount} with awarded value
      </p>
    </div>
  );
}

function FamilyRanking({
  family,
  rows,
  onOpenEntity,
}: {
  family: CpvFamily;
  rows: CpvSpendRow[];
  onOpenEntity?: (entityId: number) => void;
}) {
  const ranked = topRowsForFamily(rows, family);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4">
      <h3 className="text-sm font-semibold text-[var(--text-1)]">
        Top 10 CPV {family}
      </h3>
      <p className="mt-1 text-[10px] text-[var(--text-2)]">
        {CPV_FAMILIES[family].description}
      </p>
      <div className="mt-3 space-y-2">
        {ranked.length === 0 ? (
          <p className="text-xs text-[var(--text-2)]">No mapped spend yet.</p>
        ) : (
          ranked.map((row, index) => {
            const cell = row.cells[family];
            return (
              <button
                key={`${family}-${row.entityId}`}
                onClick={() => onOpenEntity?.(row.entityId)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-left hover:border-[var(--accent)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--text-1)]">
                      {index + 1}. {row.entityAcronym}
                    </p>
                    <p className="mt-0.5 truncate text-[10px] text-[var(--text-2)]">
                      Budget {formatEur(cell.estimatedValue)} · Awarded {formatEur(cell.awardedValue)}
                    </p>
                    <p className="mt-0.5 text-[10px] text-[var(--text-2)]">
                      {cell.tenderCount} tender(s) · {cell.awardedTenderCount} awarded mapped
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-[var(--text-1)]">
                    {formatEur(cellValue(cell))}
                  </p>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

export function TedSpendIntelligence({
  rows,
  summary,
  loading,
  onOpenEntity,
}: {
  rows: CpvSpendRow[];
  summary: CpvSpendSummary;
  loading: boolean;
  onOpenEntity?: (entityId: number) => void;
}) {
  const [page, setPage] = useState(0);
  const awardedCoverage =
    summary.tenderCount > 0
      ? Math.round((summary.awardedTenderCount / summary.tenderCount) * 100)
      : 0;
  const pageCount = Math.max(1, Math.ceil(rows.length / ROWS_PER_PAGE));
  const safePage = Math.min(page, pageCount - 1);
  const visibleRows = rows.slice(
    safePage * ROWS_PER_PAGE,
    safePage * ROWS_PER_PAGE + ROWS_PER_PAGE
  );
  const maxCellValue = Math.max(
    0,
    ...rows.flatMap((row) =>
      (Object.keys(CPV_FAMILIES) as CpvFamily[]).map((family) => cellValue(row.cells[family]))
    )
  );

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-2)]">
            TED spend intelligence
          </p>
          <h2 className="mt-1 text-xl font-bold text-[var(--text-1)]">
            CPV spend matrix
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-[var(--text-2)]">
            Righe per ente e colonne per CPV 72, 73 e 79. Ogni cella separa tender budget
            e awarded value, con intensità proporzionale alla spesa totale mappata.
          </p>
        </div>
        <div className="flex gap-2 text-[10px] text-[var(--text-2)]">
          {Object.entries(HACS_FIELDS).map(([fieldId, field]) => (
            <span key={fieldId} className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: field.color }} />
              F{fieldId}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-4">
        <SummaryMetric label="Mapped tenders" value={summary.tenderCount.toString()} />
        <SummaryMetric label="Tender budget" value={formatEur(summary.estimatedValue)} />
        <SummaryMetric label="Awarded value" value={formatEur(summary.awardedValue)} />
        <SummaryMetric
          label="Award value coverage"
          value={`${summary.awardedTenderCount}/${summary.tenderCount}`}
          detail={`${awardedCoverage}% of mapped tenders`}
        />
      </div>

      <div className="mt-3 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg)]">
        <table className="w-full text-xs">
          <thead className="text-left text-[var(--text-2)]">
            <tr>
              <th className="px-4 py-3 font-medium">CPV</th>
              <th className="px-4 py-3 font-medium">Tenders</th>
              <th className="px-4 py-3 font-medium">Award values mapped</th>
              <th className="px-4 py-3 font-medium text-right">Tender budget</th>
              <th className="px-4 py-3 font-medium text-right">Awarded value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {summary.byFamily.map((family) => (
              <tr key={family.family}>
                <td className="px-4 py-3 font-semibold text-[var(--text-1)]">
                  {family.family} · {CPV_FAMILIES[family.family].description}
                </td>
                <td className="px-4 py-3 text-[var(--text-2)]">
                  {family.tenderCount}
                </td>
                <td className="px-4 py-3 text-[var(--text-2)]">
                  {family.awardedTenderCount}/{family.tenderCount}
                </td>
                <td className="px-4 py-3 text-right font-medium text-[var(--text-1)]">
                  {formatEur(family.estimatedValue)}
                </td>
                <td className="px-4 py-3 text-right font-medium text-[var(--text-1)]">
                  {formatEur(family.awardedValue)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg)] p-6 text-sm text-[var(--text-2)]">
          {loading
            ? "Loading TED spend data..."
            : "No CPV spend data yet. Run Refresh all from Entity Map to rebuild TED intelligence with CPV 72/73/79 filters."}
        </div>
      ) : (
        <>
          <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--bg)]">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-1)]">
                  Entity × CPV matrix
                </h3>
                <p className="mt-0.5 text-xs text-[var(--text-2)]">
                  Showing {safePage * ROWS_PER_PAGE + 1}-{safePage * ROWS_PER_PAGE + visibleRows.length} of {rows.length} entities, ordered by mapped spend.
                </p>
              </div>
              {rows.length > ROWS_PER_PAGE && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((value) => Math.max(0, value - 1))}
                    disabled={safePage === 0}
                    className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-1)] hover:bg-[var(--surface)] disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span className="text-xs text-[var(--text-2)]">
                    Page {safePage + 1} / {pageCount}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))}
                    disabled={safePage >= pageCount - 1}
                    className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-1)] hover:bg-[var(--surface)] disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
            <table className="min-w-[980px] w-full text-xs">
              <thead className="text-left text-[var(--text-2)]">
                <tr>
                  <th className="sticky left-0 z-10 bg-[var(--bg)] px-4 py-3 font-medium">
                    Entity
                  </th>
                  {(Object.keys(CPV_FAMILIES) as CpvFamily[]).map((family) => (
                    <th key={family} className="px-3 py-3 font-medium">
                      CPV {family}
                      <span className="block text-[10px] font-normal">
                        {CPV_FAMILIES[family].description}
                      </span>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {visibleRows.map((row) => (
                  <tr key={row.entityId} className="align-top">
                    <td className="sticky left-0 z-10 max-w-[260px] bg-[var(--bg)] px-4 py-3">
                      <button
                        onClick={() => onOpenEntity?.(row.entityId)}
                        className="text-left hover:text-[var(--accent)]"
                      >
                        <span className="block text-sm font-semibold text-[var(--text-1)]">
                          {row.entityAcronym}
                        </span>
                        <span className="line-clamp-2 text-[10px] text-[var(--text-2)]">
                          {row.entityName}
                        </span>
                      </button>
                    </td>
                    {(Object.keys(CPV_FAMILIES) as CpvFamily[]).map((family) => (
                      <td key={`${row.entityId}-${family}`} className="min-w-[220px] px-3 py-3">
                        <SpendCell cell={row.cells[family]} maxValue={maxCellValue} />
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right">
                      <p className="text-sm font-bold text-[var(--text-1)]">
                        {formatEur(row.totalValue)}
                      </p>
                      <p className="mt-1 text-[10px] text-[var(--text-2)]">
                        {row.totalTenderCount} CPV tender hit(s)
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-3">
            {(Object.keys(CPV_FAMILIES) as CpvFamily[]).map((family) => (
              <FamilyRanking
                key={family}
                family={family}
                rows={rows}
                onOpenEntity={onOpenEntity}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
