"use client";

import { useRouter } from "next/navigation";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { HACS_FIELDS, type EntityWithScore } from "@/lib/types";
import type { ApiEntityIntelligence, ApiHacsAssignment } from "@/lib/api";
import { coverageLabel, evidenceCounts, getCoverageStatus } from "@/lib/evidence";

interface Props {
  open: boolean;
  entities: EntityWithScore[];
  intelligenceByEntityId: Record<number, ApiEntityIntelligence | undefined>;
  hacsAssignmentsByEntityId: Record<number, ApiHacsAssignment | undefined>;
  refreshing: boolean;
  onClose: () => void;
  onRefresh: () => void;
  onOpenDossier: (entity: EntityWithScore) => void;
}

export function IntelligenceComparePanel({
  open,
  entities,
  intelligenceByEntityId,
  hacsAssignmentsByEntityId,
  refreshing,
  onClose,
  onRefresh,
  onOpenDossier,
}: Props) {
  const router = useRouter();

  return (
    <Sheet open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <SheetContent
        side="right"
        className="h-full min-h-0 w-full max-w-none gap-0 overflow-hidden p-0 data-[side=right]:w-full data-[side=right]:sm:w-[860px] data-[side=right]:sm:max-w-[860px]"
      >
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-[var(--border)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <SheetTitle className="text-2xl font-semibold text-[var(--text-1)]">
                Opportunity compare
              </SheetTitle>
              <p className="text-sm text-[var(--text-2)] mt-1">
                Confronta segnali, field suggeriti e prossimo passo sui target selezionati.
              </p>
            </div>
            <button
              onClick={onRefresh}
              disabled={refreshing || entities.length === 0}
              className="shrink-0 px-3 py-2 rounded-lg border border-[var(--border)] text-sm font-medium text-[var(--text-1)] hover:bg-[var(--bg)] disabled:opacity-50"
            >
              {refreshing ? "Refreshing..." : "Refresh selected"}
            </button>
          </div>
        </SheetHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg)] border-b border-[var(--border)]">
              <tr className="text-left text-[11px] uppercase tracking-wider text-[var(--text-2)]">
                <th className="px-6 py-3 font-medium">Entity</th>
                <th className="px-4 py-3 font-medium">Need</th>
                <th className="px-4 py-3 font-medium">Field</th>
                <th className="px-4 py-3 font-medium">Match</th>
                <th className="px-4 py-3 font-medium">Confidence</th>
                <th className="px-4 py-3 font-medium">Recent</th>
                <th className="px-4 py-3 font-medium">Historical</th>
                <th className="px-4 py-3 font-medium">Execution</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {entities.map((entity) => {
                const intel = intelligenceByEntityId[entity.id];
                const assignment = hacsAssignmentsByEntityId[entity.id];
                const fieldId = assignment?.primary_field ?? intel?.primary_field;
                const field = fieldId ? HACS_FIELDS[fieldId] : null;
                const coverageStatus = getCoverageStatus(entity.acronym);
                const counts = evidenceCounts(intel);
                return (
                  <tr key={entity.id} className="border-b border-[var(--border)] align-top">
                    <td className="px-6 py-4 min-w-[180px]">
                      <div className="font-semibold text-[var(--text-1)]">{entity.acronym}</div>
                      <div className="text-xs text-[var(--text-2)] mt-1 leading-relaxed">{entity.name}</div>
                    </td>
                    <td className="px-4 py-4 min-w-[260px] text-[var(--text-1)]">
                      {intel?.need_statement ?? (
                        <span className="text-[var(--text-2)]">No intelligence yet</span>
                      )}
                    </td>
                    <td className="px-4 py-4 min-w-[180px]">
                      {field ? (
                        <>
                          <span className="inline-flex items-center gap-2 text-xs font-medium text-[var(--text-1)]">
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: field.color }}
                            />
                            F{fieldId}: {field.label}
                          </span>
                          {assignment && (
                            <div className="text-[10px] text-[var(--text-2)] mt-1">
                              {assignment.confidence} · {assignment.status}
                            </div>
                          )}
                        </>
                      ) : (
                        <span className="text-[var(--text-2)]">TBD</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-[var(--text-1)]">
                      {intel?.provider_match ?? "Unclear"}
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-[var(--text-1)]">{intel?.confidence ?? "Unknown"}</span>
                    </td>
                    <td className="px-4 py-4 text-[var(--text-1)]">{counts.recentProcurement}</td>
                    <td className="px-4 py-4 text-[var(--text-1)]">{counts.historicalProcurement}</td>
                    <td className="px-4 py-4">
                      <span className="text-[var(--text-1)]">{coverageLabel(coverageStatus)}</span>
                      {counts.execution > 0 && (
                        <div className="text-[10px] text-[var(--text-2)] mt-1">
                          {counts.execution} record(s)
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onOpenDossier(entity)}
                          className="text-xs text-[var(--accent)] font-medium hover:underline"
                        >
                          Open dossier
                        </button>
                        <button
                          onClick={() => {
                            const params = new URLSearchParams({ entity: String(entity.id) });
                            if (fieldId) {
                              params.set("field", String(fieldId));
                            }
                            router.push(`/propose?${params.toString()}`);
                            onClose();
                          }}
                          className="text-xs font-medium px-2.5 py-1 rounded-lg bg-[var(--text-1)] text-white hover:opacity-90"
                        >
                          Proposal Lab
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SheetContent>
    </Sheet>
  );
}
