"use client";

import { useRouter } from "next/navigation";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  coverageDescription,
  coverageLabel,
  getCoverageStatus,
  splitEvidenceSignals,
} from "@/lib/evidence";
import { getEntityProfile } from "@/lib/entityProfile";
import { countryFlag } from "@/lib/flags";
import { formatEur } from "@/lib/format";
import { HACS_FIELDS } from "@/lib/types";
import type { ApiEntityIntelligence, ApiHacsAssignment } from "@/lib/api";
import type { EntityWithScore } from "@/lib/types";

interface Props {
  entity: EntityWithScore | null;
  intelligence?: ApiEntityIntelligence;
  hacsAssignment?: ApiHacsAssignment;
  refreshing?: boolean;
  onRefresh?: (entityId: number) => void;
  onClose: () => void;
}

function formatAnnualBudget(value: number | null, label?: string | null): string {
  if (label) return label;
  if (value === null) return "Not available yet";
  return `${formatEur(value)} / year`;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="py-4">
      <h3 className="text-xs font-semibold text-[var(--text-2)] uppercase tracking-wider mb-3">
        {title}
      </h3>
      {children}
    </div>
  );
}

function assignmentStatusLabel(status: string) {
  if (status === "suggested") return "Suggested";
  if (status === "reviewed") return "Reviewed";
  if (status === "locked") return "Locked";
  return status;
}

function sourceLabel(source: string) {
  if (source === "historical_execution") return "Execution evidence";
  if (source === "historical_award") return "Framework award";
  if (source === "ted") return "TED";
  return source;
}

function SignalCard({ signal }: { signal: ApiEntityIntelligence["signals"][number] }) {
  const signalField = signal.field_guess ? HACS_FIELDS[signal.field_guess] : null;

  return (
    <div className="rounded-xl border border-[var(--border)] p-3 bg-[var(--bg)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[var(--text-1)] leading-snug">{signal.title}</p>
          {signal.summary ? (
            <p className="text-xs text-[var(--text-2)] mt-1 leading-relaxed">
              {signal.summary}
            </p>
          ) : (
            <p className="text-xs text-[var(--text-2)] mt-1 italic">
              No short description available in the source payload.
            </p>
          )}
        </div>
        {signalField && (
          <span
            className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full text-white"
            style={{ backgroundColor: signalField.color }}
          >
            F{signal.field_guess}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 flex-wrap mt-2 text-[10px] text-[var(--text-2)]">
        <span className="px-2 py-0.5 rounded-full bg-[var(--surface)] border border-[var(--border)]">
          {sourceLabel(signal.source)}
        </span>
        {signal.date && <span>{signal.date}</span>}
        {signal.award_value_eur !== null && signal.award_value_eur !== undefined && (
          <span className="px-2 py-0.5 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--text-1)]">
            Award {formatEur(signal.award_value_eur)}
          </span>
        )}
        {signal.estimated_value_eur !== null && signal.estimated_value_eur !== undefined && (
          <span className="px-2 py-0.5 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--text-1)]">
            Est. {formatEur(signal.estimated_value_eur)}
          </span>
        )}
        {signal.award_value_eur == null &&
          signal.estimated_value_eur == null &&
          signal.contract_value_eur !== null &&
          signal.contract_value_eur !== undefined && (
          <span className="px-2 py-0.5 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--text-1)]">
            {formatEur(signal.contract_value_eur)}
          </span>
        )}
        {(signal.cpv_codes ?? []).length > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-[var(--surface)] border border-[var(--border)]">
            CPV {(signal.cpv_codes ?? []).slice(0, 3).join(", ")}
          </span>
        )}
      </div>
      {signal.url && (
        <a
          href={signal.url}
          target="_blank"
          rel="noreferrer"
          className="inline-block mt-2 text-xs text-[var(--accent)] font-medium hover:underline"
        >
          Open source →
        </a>
      )}
    </div>
  );
}

function TedTopicPanel({ intelligence }: { intelligence?: ApiEntityIntelligence }) {
  const topicProfile = intelligence?.summary.ted_topics;
  if (!topicProfile || topicProfile.total_analyzed === 0) {
    return (
      <p className="text-sm text-[var(--text-2)]">
        No TED topic pattern available yet. Refresh intelligence to analyse the current procurement demand.
      </p>
    );
  }

  const modeLabel =
    topicProfile.mode === "cpv_filtered"
      ? "Based on TED notices for this entity filtered by CPV families 72, 73 and 79."
      : topicProfile.mode === "recent"
        ? "Based on recent TED notices from 2025 onward."
        : "No recent TED notices found; based on HACS-relevant TED notices from 2023-2024.";

  return (
    <div className="space-y-3">
      <p className="text-xs text-[var(--text-2)]">
        {modeLabel} {topicProfile.total_analyzed} notice(s) analysed.
      </p>
      <div className="space-y-2">
        {topicProfile.topics.map((topic) => {
          const field = topic.hacs_field ? HACS_FIELDS[topic.hacs_field] : null;
          return (
            <div
              key={topic.topic}
              className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {field && (
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: field.color }}
                        aria-hidden="true"
                      />
                    )}
                    <p className="text-sm font-semibold text-[var(--text-1)]">
                      {topic.topic}
                    </p>
                  </div>
                  {topic.examples.length > 0 && (
                    <p className="mt-1 text-xs text-[var(--text-2)] leading-relaxed line-clamp-2">
                      Examples: {topic.examples.join(" · ")}
                    </p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-[var(--text-1)]">
                    {topic.count}
                  </p>
                  <p className="text-[10px] text-[var(--text-2)]">
                    {Math.round(topic.share * 100)}%
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function EntityDrawer({
  entity,
  intelligence,
  hacsAssignment,
  refreshing,
  onRefresh,
  onClose,
}: Props) {
  const router = useRouter();
  if (!entity) return null;

  const field = entity.top_hacs_field ? HACS_FIELDS[entity.top_hacs_field] : null;
  const assignmentField = hacsAssignment?.primary_field
    ? HACS_FIELDS[hacsAssignment.primary_field]
    : null;
  const secondaryAssignmentField = hacsAssignment?.secondary_field
    ? HACS_FIELDS[hacsAssignment.secondary_field]
    : null;
  const suggestedField = intelligence?.primary_field
    ? HACS_FIELDS[intelligence.primary_field]
    : null;
  const coverageStatus = getCoverageStatus(entity.acronym);
  const {
    recentProcurementSignals,
    historicalProcurementSignals,
    executionSignals,
  } = splitEvidenceSignals(intelligence);
  const entityProfile = getEntityProfile(entity);
  const topAssignmentScores = hacsAssignment
    ? Object.entries(hacsAssignment.field_scores)
        .sort(([, a], [, b]) => b.total - a.total)
        .slice(0, 3)
    : [];

  function copyBrief() {
    const text = [
      entity!.acronym,
      entity!.name,
      `${entity!.city}, ${entity!.country}`,
      `Cluster: ${entity!.cluster}`,
      entityProfile.websiteUrl ? `Website: ${entityProfile.websiteUrl}` : "Website: not available yet",
      `Annual spending budget: ${formatAnnualBudget(entityProfile.annualBudgetEur, entityProfile.annualBudgetLabel)}`,
      entityProfile.annualBudgetNote ? `Budget note: ${entityProfile.annualBudgetNote}` : null,
      `Description: ${entityProfile.description}`,
      `Mission: ${entityProfile.mission}`,
      field ? `HACS Field ${entity!.top_hacs_field}: ${field.label}` : "HACS Field: TBD",
      hacsAssignment?.primary_field
        ? `Suggested HACS Field ${hacsAssignment.primary_field}: ${assignmentField?.label ?? ""} (${hacsAssignment.confidence})`
        : "Suggested HACS Field: not generated",
      intelligence ? `Need: ${intelligence.need_statement}` : "Need: not assessed yet",
    ].filter(Boolean).join("\n");
    navigator.clipboard.writeText(text).catch(() => {});
  }

  return (
    <Sheet open={!!entity} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent
        side="right"
        className="h-full min-h-0 w-full max-w-none gap-0 overflow-hidden p-0 data-[side=right]:w-full data-[side=right]:sm:w-[860px] data-[side=right]:sm:max-w-[860px]"
      >
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-[var(--border)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <SheetTitle className="text-2xl font-bold text-[var(--text-1)]">
                {entity.acronym}
              </SheetTitle>
              <p className="text-sm text-[var(--text-2)] mt-0.5">{entity.name}</p>
              <p className="text-xs text-[var(--text-2)] mt-2">
                <span aria-label={entity.country} title={entity.country}>
                  {countryFlag(entity.country)}
                </span>{" "}
                {entity.city}, {entity.country} · {entity.cluster} · Execution {coverageLabel(coverageStatus)}
              </p>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="min-h-0 flex-1">
          <div className="px-6 pb-6 divide-y divide-[var(--border)]">
            <Section title="Entity profile">
              <div className="space-y-3">
                <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4 space-y-3">
                  <Row label="Type" value={entityProfile.type} />
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-[var(--text-2)]">Website</span>
                    {entityProfile.websiteUrl ? (
                      <a
                        href={entityProfile.websiteUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-[var(--accent)] hover:underline text-right"
                      >
                        Open official website →
                      </a>
                    ) : (
                      <span className="font-medium text-[var(--text-2)] text-right">
                        Not available yet
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-[var(--text-2)]">Annual spending budget</span>
                    {entityProfile.annualBudgetLabel || entityProfile.annualBudgetEur !== null ? (
                      entityProfile.annualBudgetSourceUrl ? (
                        <a
                          href={entityProfile.annualBudgetSourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-[var(--accent)] hover:underline text-right"
                        >
                          {formatAnnualBudget(entityProfile.annualBudgetEur, entityProfile.annualBudgetLabel)}
                        </a>
                      ) : (
                        <span className="font-medium text-[var(--text-1)] text-right">
                          {formatAnnualBudget(entityProfile.annualBudgetEur, entityProfile.annualBudgetLabel)}
                        </span>
                      )
                    ) : (
                      <span className="font-medium text-[var(--text-2)] text-right">
                        Not available yet
                      </span>
                    )}
                  </div>
                  {entityProfile.annualBudgetNote && (
                    <p className="text-xs text-[var(--text-2)] leading-relaxed">
                      {entityProfile.annualBudgetNote}
                    </p>
                  )}
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-2)]">
                      Description
                    </p>
                    <p className="mt-1 text-sm text-[var(--text-1)] leading-relaxed">
                      {entityProfile.description}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-2)]">
                      Mission
                    </p>
                    <p className="mt-1 text-sm text-[var(--text-1)] leading-relaxed">
                      {entityProfile.mission}
                    </p>
                  </div>
                </div>
              </div>
            </Section>

            <Section title="Need intelligence">
              <div className="space-y-3">
                <p className="text-sm text-[var(--text-1)] leading-relaxed">
                  {intelligence?.need_statement ?? "No need statement yet. Launch a refresh to pull TED evidence for this entity."}
                </p>
                <div className="space-y-2 text-sm">
                  {suggestedField ? (
                    <FieldLine
                      label="Need field"
                      fieldId={intelligence?.primary_field ?? null}
                      fieldLabel={suggestedField.label}
                      color={suggestedField.color}
                    />
                  ) : (
                    <Row label="Need field" value="TBD" />
                  )}
                </div>
                <div className="space-y-2 text-sm">
                  <Row label="Provider match" value={intelligence?.provider_match ?? "Unclear"} />
                  <Row label="Confidence" value={intelligence?.confidence ?? "Not assessed"} />
                </div>
                <button
                  onClick={() => onRefresh?.(entity.id)}
                  disabled={refreshing}
                  className="text-xs text-[var(--accent)] font-medium hover:underline disabled:opacity-50"
                >
                  {refreshing ? "Refreshing intelligence..." : "Refresh intelligence →"}
                </button>
              </div>
            </Section>

            <Section title="HACS field assignment">
              {hacsAssignment ? (
                <div className="space-y-3">
                  <div className="space-y-2 text-sm">
                    {assignmentField && (
                      <FieldLine
                        label="Primary field"
                        fieldId={hacsAssignment.primary_field}
                        fieldLabel={assignmentField.label}
                        color={assignmentField.color}
                      />
                    )}
                    {secondaryAssignmentField && (
                      <FieldLine
                        label="Secondary field"
                        fieldId={hacsAssignment.secondary_field}
                        fieldLabel={secondaryAssignmentField.label}
                        color={secondaryAssignmentField.color}
                      />
                    )}
                    <Row label="Confidence" value={hacsAssignment.confidence} />
                    <Row label="Status" value={assignmentStatusLabel(hacsAssignment.status)} />
                  </div>
                  {topAssignmentScores.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {topAssignmentScores.map(([fieldId], index) => {
                        const scoreField = HACS_FIELDS[Number(fieldId)];
                        const matchLabel =
                          index === 0
                            ? "Best match"
                            : index === 1
                              ? "Secondary match"
                              : "Weak match";
                        return (
                          <div key={fieldId} className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold text-[var(--text-1)]">
                                F{fieldId}
                              </span>
                              <span className="text-xs text-[var(--text-2)]">
                                {matchLabel}
                              </span>
                            </div>
                            <p className="mt-1 text-[10px] text-[var(--text-2)] line-clamp-2">
                              {scoreField?.label ?? "Unknown field"}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {field && (
                    <p className="text-xs text-[var(--text-2)]">
                      Approved field currently set to F{entity.top_hacs_field}: {field.label}.
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-[var(--text-2)]">
                  No HACS assignment generated yet. The assignment layer combines mission fit, procurement signals and execution evidence.
                </p>
              )}
            </Section>

            <Section title="Budget signal">
              <div className="space-y-2 text-sm">
                <Row
                  label="Annual budget"
                  value={formatAnnualBudget(entityProfile.annualBudgetEur, entityProfile.annualBudgetLabel)}
                />
                <Row label="Cluster" value={entity.cluster} />
              </div>
              {entityProfile.annualBudgetNote && (
                <p className="text-[10px] text-[var(--text-2)] italic mt-3">
                  {entityProfile.annualBudgetNote}
                </p>
              )}
            </Section>

            <Section title="TED topic intelligence">
              <TedTopicPanel intelligence={intelligence} />
            </Section>

            <Section title="Recent procurement">
              <p className="text-xs text-[var(--text-2)] mb-3">
                TED signals from 2025 onward. These are the strongest indicators for current scouting.
              </p>
              {recentProcurementSignals.length > 0 ? (
                <div className="space-y-3">
                  {recentProcurementSignals.map((signal, index) => (
                    <SignalCard key={`${signal.source}-${index}`} signal={signal} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--text-2)]">No recent procurement signals captured yet.</p>
              )}
            </Section>

            <Section title="Historical procurement">
              <p className="text-xs text-[var(--text-2)] mb-3">
                TED signals up to 2024 and framework award records. Useful as demand history, not as current opportunity evidence.
              </p>
              {historicalProcurementSignals.length > 0 ? (
                <div className="space-y-3">
                  {historicalProcurementSignals.map((signal, index) => (
                    <SignalCard key={`${signal.source}-${index}`} signal={signal} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--text-2)]">No historical procurement signals captured yet.</p>
              )}
            </Section>

            <Section title="Execution evidence">
              <Row label="Coverage" value={coverageLabel(coverageStatus)} />
              <p className="text-sm text-[var(--text-2)] mb-3 leading-relaxed">
                {coverageDescription(coverageStatus)}
              </p>
              {executionSignals.length > 0 ? (
                <div className="space-y-3">
                  {executionSignals.map((signal, index) => (
                    <SignalCard key={`${signal.source}-${index}`} signal={signal} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--text-2)]">
                  No execution record is attached to the current intelligence snapshot.
                </p>
              )}
            </Section>

            <Section title="Relationship signal">
              <div className="space-y-2 text-sm">
                <Row
                  label="BCG contact"
                  value={entity.relationship_signal === "bcg_contact" || entity.relationship_signal === "both" ? "Yes" : "No"}
                  highlight={entity.relationship_signal === "bcg_contact" || entity.relationship_signal === "both"}
                />
                <Row
                  label="Dst contact"
                  value={entity.relationship_signal === "dst_contact" || entity.relationship_signal === "both" ? "Yes" : "No"}
                  highlight={entity.relationship_signal === "dst_contact" || entity.relationship_signal === "both"}
                />
              </div>
              {entity.relationship_signal === "none" && (
                <p className="text-xs text-[var(--text-2)] italic mt-2">No confirmed contact</p>
              )}
            </Section>

            <Section title="Notes">
              {entity.notes ? (
                <blockquote className="border-l-2 border-[var(--accent)] pl-3 text-sm text-[var(--text-1)] italic">
                  {entity.notes}
                </blockquote>
              ) : (
                <p className="text-sm text-[var(--text-2)]">No notes</p>
              )}
            </Section>
          </div>
        </ScrollArea>

        <div className="px-6 py-4 border-t border-[var(--border)] flex gap-3">
          <button
            onClick={() => {
              const params = new URLSearchParams({ entity: String(entity.id) });
              const proposalField = hacsAssignment?.primary_field ?? intelligence?.primary_field;
              if (proposalField) {
                params.set("field", String(proposalField));
              }
              router.push(`/propose?${params.toString()}`);
              onClose();
            }}
            className="flex-1 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Build proposal →
          </button>
          <button
            onClick={copyBrief}
            className="px-4 py-2 rounded-lg border border-[var(--border)] text-sm font-medium text-[var(--text-1)] hover:bg-[var(--border)] transition-colors"
          >
            Copy brief
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[var(--text-2)]">{label}</span>
      <span
        className={`font-medium ${highlight ? "text-[var(--accent)]" : "text-[var(--text-1)]"}`}
      >
        {value}
      </span>
    </div>
  );
}

function FieldLine({
  label,
  fieldId,
  fieldLabel,
  color,
}: {
  label: string;
  fieldId: number | null;
  fieldLabel: string;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[var(--text-2)]">{label}</span>
      <span className="flex items-center gap-2 text-right font-medium text-[var(--text-1)]">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: color }}
          aria-hidden="true"
        />
        F{fieldId}: {fieldLabel}
      </span>
    </div>
  );
}
