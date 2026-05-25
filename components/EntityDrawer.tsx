"use client";

import { useRouter } from "next/navigation";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { HACS_FIELDS } from "@/lib/types";
import type { EntityWithScore, Competitor } from "@/lib/types";

interface Props {
  entity: EntityWithScore | null;
  competitors: Competitor[];
  onClose: () => void;
}

function formatEur(n: number): string {
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `€${Math.round(n / 1_000)}k`;
  return `€${n}`;
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

export function EntityDrawer({ entity, competitors, onClose }: Props) {
  const router = useRouter();
  if (!entity) return null;

  const field = entity.top_hacs_field ? HACS_FIELDS[entity.top_hacs_field] : null;

  function copyBrief() {
    const text = [
      entity!.acronym,
      entity!.name,
      `${entity!.city}, ${entity!.country}`,
      `Cluster: ${entity!.cluster}`,
      field ? `HACS Field ${entity!.top_hacs_field}: ${field.label}` : "HACS Field: TBD",
    ].join("\n");
    navigator.clipboard.writeText(text).catch(() => {});
  }

  return (
    <Sheet open={!!entity} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="right" className="w-full sm:w-[480px] p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-[var(--border)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <SheetTitle className="text-2xl font-bold text-[var(--text-1)]">
                {entity.acronym}
              </SheetTitle>
              <p className="text-sm text-[var(--text-2)] mt-0.5">{entity.name}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--border)] text-[var(--text-2)]">
                  {entity.city} · {entity.country}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--border)] text-[var(--text-2)]">
                  {entity.cluster}
                </span>
              </div>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="px-6 divide-y divide-[var(--border)]">
            <Section title="Budget signal">
              <div className="space-y-2 text-sm">
                <Row label="Cluster" value={entity.cluster} />
                <Row label="Cluster FWC value" value={formatEur(entity.cluster_budget_eur)} />
                <Row label="Entities in cluster" value={String(entity.cluster_entity_count)} />
                <Row label="Your cluster share proxy" value={`~${formatEur(entity.cluster_share_eur)}`} />
              </div>
              <p className="text-[10px] text-[var(--text-2)] italic mt-3">
                Proxy estimate — individual budget not yet available
              </p>
              <button className="mt-2 text-xs text-[var(--accent)] font-medium hover:underline">
                Add budget data manually →
              </button>
            </Section>

            <Section title="HACS field">
              {field ? (
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs font-semibold px-2.5 py-1 rounded-full text-white"
                    style={{ backgroundColor: field.color }}
                  >
                    Field {entity.top_hacs_field}
                  </span>
                  <span className="text-sm text-[var(--text-1)]">{field.label}</span>
                </div>
              ) : (
                <p className="text-sm text-[var(--text-2)]">Field not yet assigned</p>
              )}
              <button className="mt-2 text-xs text-[var(--accent)] font-medium hover:underline">
                Assign field →
              </button>
            </Section>

            <Section title="Relationship signal">
              <div className="space-y-2 text-sm">
                <Row
                  label="BCG contact"
                  value={entity.relationship_signal === "bcg_contact" || entity.relationship_signal === "both" ? "Yes" : "No"}
                  highlight={entity.relationship_signal === "bcg_contact" || entity.relationship_signal === "both"}
                />
                <Row
                  label="DST contact"
                  value={entity.relationship_signal === "dst_contact" || entity.relationship_signal === "both" ? "Yes" : "No"}
                  highlight={entity.relationship_signal === "dst_contact" || entity.relationship_signal === "both"}
                />
              </div>
              {entity.relationship_signal === "none" && (
                <p className="text-xs text-[var(--text-2)] italic mt-2">No confirmed contact</p>
              )}
            </Section>

            <Section title="Competitors in framework">
              <p className="text-[10px] text-[var(--text-2)] mb-3">
                All 22 contractors selected for HACS. Past wins per entity will appear after TED import.
              </p>
              <div className="space-y-1.5">
                {competitors.map((c) => (
                  <div key={c.rank} className="flex items-start gap-2 text-xs">
                    <span className="text-[var(--text-2)] w-5 shrink-0 font-mono">#{c.rank}</span>
                    <div className="min-w-0">
                      <span className="font-medium text-[var(--text-1)]">{c.name}</span>
                      <p className="text-[var(--text-2)] truncate">{c.key_members}</p>
                    </div>
                  </div>
                ))}
              </div>
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
              router.push(`/propose?entity=${entity.id}`);
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
