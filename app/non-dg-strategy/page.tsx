"use client";

import { useMemo, useState } from "react";

import {
  getStrategyDocumentAnalysisByEntityId,
  type StrategyDocumentAnalysisRecord,
} from "@/lib/strategyDocumentAnalysis";
import {
  getStrategyDocumentCatalog,
} from "@/lib/strategyDocuments";
import {
  getStrategyDocumentValidationByEntityId,
  getStrategyDocumentValidationCatalog,
} from "@/lib/strategyDocumentValidation";
import { HACS_FIELDS } from "@/lib/types";

const documentCatalog = getStrategyDocumentCatalog();
const validationCatalog = getStrategyDocumentValidationCatalog();
const validationByEntityId = getStrategyDocumentValidationByEntityId();
const analysisByEntityId = getStrategyDocumentAnalysisByEntityId();

function fieldLabel(fieldId: number | null | undefined) {
  return fieldId ? HACS_FIELDS[fieldId]?.label ?? `Field ${fieldId}` : "Field to qualify";
}

function statusClass(status: string) {
  if (status === "verified") return "bg-[var(--text-1)] text-white";
  if (status === "candidate") return "bg-[#D4A017]/15 text-[#8A6500]";
  return "bg-[var(--border)] text-[var(--text-2)]";
}

function strengthClass(strength: "High" | "Medium" | "Low") {
  if (strength === "High") return "bg-[var(--text-1)] text-white";
  if (strength === "Medium") return "bg-[#D4A017]/15 text-[#8A6500]";
  return "bg-[var(--border)] text-[var(--text-2)]";
}

function topField(record?: StrategyDocumentAnalysisRecord) {
  return record?.top_hacs_fields[0]?.field ?? record?.needs[0]?.hacs_field ?? null;
}

export default function NonDgStrategyPage() {
  const [selectedEntityId, setSelectedEntityId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    return documentCatalog.records.map((document) => {
      const validation = validationByEntityId.get(document.entity_id);
      const analysis = analysisByEntityId.get(document.entity_id);
      return {
        document,
        validation,
        analysis,
        status: validation?.recommended_status ?? document.integration_status,
        analyzed: Boolean(analysis && !analysis.analysis_error && analysis.pages_analyzed > 0),
      };
    });
  }, []);

  const visibleRows = rows.filter((row) => {
    const normalizedQuery = query.trim().toLowerCase();
    const matchesStatus = statusFilter === "all" || row.status === statusFilter;
    const matchesQuery =
      !normalizedQuery ||
      row.document.acronym.toLowerCase().includes(normalizedQuery) ||
      row.document.full_name.toLowerCase().includes(normalizedQuery) ||
      row.document.document_type.toLowerCase().includes(normalizedQuery);
    return matchesStatus && matchesQuery;
  });

  const selectedRow =
    rows.find((row) => row.document.entity_id === selectedEntityId) ??
    rows.find((row) => row.analyzed) ??
    rows[0];

  const statusCounts = validationCatalog.recommended_status_counts;
  const analyzedCount = rows.filter((row) => row.analyzed).length;

  return (
    <main className="min-h-screen bg-[var(--bg)] px-6 py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-2)]">
              Strategy layer
            </p>
            <h1 className="mt-1 text-3xl font-bold text-[var(--text-1)]">
              Non-DG Strategy
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--text-2)]">
              Documenti programmatici 2026 per agenzie, joint undertakings e altri
              enti non-DG. La vista separa fonti verificate, candidate e casi speciali,
              poi sintetizza need e action themes dove il PDF è già analizzato.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-[var(--text-2)] md:justify-end">
            <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1">
              {documentCatalog.records.length} non-DG sources
            </span>
            <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1">
              {statusCounts.verified ?? 0} verified
            </span>
            <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1">
              {statusCounts.candidate ?? 0} candidate
            </span>
            <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1">
              {analyzedCount} analyzed PDFs
            </span>
          </div>
        </div>

        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-2)]">
                Source coverage
              </p>
              <h2 className="mt-1 text-xl font-bold text-[var(--text-1)]">
                Strategy document directory
              </h2>
            </div>
            <div className="flex flex-col gap-2 md:flex-row">
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="h-9 rounded-lg border border-[var(--border)] bg-white px-3 text-sm text-[var(--text-1)] outline-none focus:ring-1 focus:ring-[var(--accent)]"
              >
                <option value="all">All statuses</option>
                <option value="verified">Verified</option>
                <option value="candidate">Candidate</option>
                <option value="exclude_or_special_case">Special cases</option>
              </select>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search entity or document…"
                className="h-9 rounded-lg border border-[var(--border)] bg-white px-3 text-sm text-[var(--text-1)] outline-none placeholder:text-[var(--text-2)] focus:ring-1 focus:ring-[var(--accent)] md:w-72"
              />
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="max-h-[620px] overflow-auto rounded-xl border border-[var(--border)] bg-white">
              <table className="w-full min-w-[760px] text-xs">
                <thead className="sticky top-0 bg-white text-left text-[var(--text-2)] shadow-[0_1px_0_var(--border)]">
                  <tr>
                    <th className="px-3 py-2 font-medium">Entity</th>
                    <th className="px-3 py-2 font-medium">Document</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Top field</th>
                    <th className="px-3 py-2 text-right font-medium">Themes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {visibleRows.map((row) => {
                    const selected = selectedRow?.document.entity_id === row.document.entity_id;
                    return (
                      <tr
                        key={row.document.entity_id}
                        onClick={() => setSelectedEntityId(row.document.entity_id)}
                        className={`cursor-pointer transition ${
                          selected ? "bg-[var(--bg)]" : "hover:bg-[var(--bg)]"
                        }`}
                      >
                        <td className="px-3 py-2">
                          <p className="font-bold text-[var(--text-1)]">{row.document.acronym}</p>
                          <p className="max-w-[220px] truncate text-[10px] text-[var(--text-2)]">
                            {row.document.full_name}
                          </p>
                        </td>
                        <td className="px-3 py-2">
                          <p className="max-w-[240px] truncate text-[var(--text-1)]">
                            {row.document.document_type}
                          </p>
                          <p className="text-[10px] text-[var(--text-2)]">
                            {row.document.year_or_period || "n/a"}
                          </p>
                        </td>
                        <td className="px-3 py-2">
                          <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${statusClass(row.status)}`}>
                            {row.status.replaceAll("_", " ")}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-[var(--text-2)]">
                          {fieldLabel(topField(row.analysis))}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-[var(--text-1)]">
                          {row.analysis?.action_themes.length ?? 0}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {selectedRow && (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-2)]">
                      Selected entity
                    </p>
                    <h3 className="mt-1 text-xl font-bold text-[var(--text-1)]">
                      {selectedRow.document.acronym}
                    </h3>
                    <p className="mt-1 text-sm text-[var(--text-2)]">
                      {selectedRow.document.full_name}
                    </p>
                  </div>
                  <span className={`self-start rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusClass(selectedRow.status)}`}>
                    {selectedRow.status.replaceAll("_", " ")}
                  </span>
                </div>

                <div className="mt-4 rounded-lg border border-[var(--border)] bg-white p-3">
                  <p className="text-sm font-semibold text-[var(--text-1)]">
                    {selectedRow.document.document_title}
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-2)]">
                    {selectedRow.document.document_type} · {selectedRow.document.year_or_period}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    {selectedRow.document.source_url && (
                      <a
                        href={selectedRow.document.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-[var(--accent)] hover:underline"
                      >
                        Source →
                      </a>
                    )}
                    {selectedRow.document.pdf_url && (
                      <a
                        href={selectedRow.document.pdf_url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-[var(--accent)] hover:underline"
                      >
                        PDF →
                      </a>
                    )}
                  </div>
                </div>

                {selectedRow.analysis?.analysis_error ? (
                  <div className="mt-4 rounded-lg border border-[#C0392B]/20 bg-[#C0392B]/10 p-3 text-sm text-[#C0392B]">
                    Analysis failed: {selectedRow.analysis.analysis_error}
                  </div>
                ) : selectedRow.analysis ? (
                  <div className="mt-4 space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold text-[var(--text-1)]">
                        Mission context
                      </h4>
                      <p className="mt-2 text-xs leading-relaxed text-[var(--text-2)]">
                        {selectedRow.analysis.mission_context || "No mission context extracted yet."}
                      </p>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-[var(--text-1)]">
                        Top needs
                      </h4>
                      <div className="mt-2 grid gap-2 md:grid-cols-2">
                        {selectedRow.analysis.needs.slice(0, 4).map((need, index) => (
                          <div key={`${need.need}-${index}`} className="rounded-lg bg-white p-3">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-xs font-semibold text-[var(--text-1)]">
                                {fieldLabel(need.hacs_field)}
                              </p>
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${strengthClass(need.strength)}`}>
                                {need.strength}
                              </span>
                            </div>
                            <p className="mt-2 text-[10px] leading-relaxed text-[var(--text-2)]">
                              {need.need}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-[var(--text-1)]">
                        Planned action themes
                      </h4>
                      <div className="mt-2 divide-y divide-[var(--border)] overflow-hidden rounded-lg border border-[var(--border)] bg-white">
                        {selectedRow.analysis.action_themes.length === 0 ? (
                          <p className="p-3 text-xs text-[var(--text-2)]">
                            No action themes synthesized yet.
                          </p>
                        ) : (
                          selectedRow.analysis.action_themes.slice(0, 5).map((theme) => (
                            <div key={theme.id} className="grid gap-3 p-3 md:grid-cols-[1fr_160px]">
                              <div>
                                <p className="text-sm font-semibold text-[var(--text-1)]">
                                  {theme.title}
                                </p>
                                <p className="mt-1 text-xs leading-relaxed text-[var(--text-2)]">
                                  {theme.summary}
                                </p>
                                {theme.evidence[0] && (
                                  <p className="mt-2 text-[10px] leading-relaxed text-[var(--text-2)]">
                                    Evidence p.{theme.evidence[0].page}: {theme.evidence[0].title}
                                  </p>
                                )}
                              </div>
                              <div className="flex content-start items-start gap-1.5 md:flex-wrap md:justify-end">
                                {theme.hacs_field && (
                                  <span className="inline-flex h-6 shrink-0 items-center rounded-full border border-[var(--border)] px-2.5 text-[10px] font-semibold leading-none text-[var(--text-1)]">
                                    F{theme.hacs_field}
                                  </span>
                                )}
                                <span className="inline-flex h-6 shrink-0 items-center whitespace-nowrap rounded-full bg-[var(--bg)] px-2.5 text-[10px] font-semibold leading-none text-[var(--text-2)]">
                                  {theme.action_count} evidence
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 rounded-lg border border-dashed border-[var(--border)] bg-white p-4 text-sm text-[var(--text-2)]">
                    This source is catalogued but not analyzed yet. Use it in the next
                    ingestion wave once the PDF is verified or resolved.
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
