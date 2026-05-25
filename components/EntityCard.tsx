"use client";

import { HACS_FIELDS } from "@/lib/types";
import type { EntityWithScore } from "@/lib/types";
import { PriorityGauge } from "./PriorityGauge";

interface Props {
  entity: EntityWithScore;
  onOpen: (entity: EntityWithScore) => void;
  indent?: boolean;
}

function formatEur(n: number): string {
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `€${Math.round(n / 1_000)}k`;
  return `€${n}`;
}

export function EntityCard({ entity, onOpen, indent }: Props) {
  const field = entity.top_hacs_field ? HACS_FIELDS[entity.top_hacs_field] : null;

  return (
    <div
      className={`
        bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 flex flex-col gap-3
        hover:shadow-md transition-shadow cursor-default
        ${indent ? "ml-4 border-l-4 border-l-[#E07A5F]/30" : ""}
      `}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xl font-bold text-[var(--text-1)] leading-none">
              {entity.acronym}
            </span>
            {entity.relationship_signal === "bcg_contact" && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[#E07A5F]/10 text-[#E07A5F] whitespace-nowrap">
                BCG contact
              </span>
            )}
            {entity.relationship_signal === "dst_contact" && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[#0EA5E9]/10 text-[#0EA5E9] whitespace-nowrap">
                DST contact
              </span>
            )}
            {entity.relationship_signal === "both" && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[#6A9E6A]/10 text-[#6A9E6A] whitespace-nowrap">
                Both contacts
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--text-2)] mt-1 line-clamp-2 leading-relaxed">
            {entity.name}
          </p>
        </div>
        <PriorityGauge score={entity.priority_score} />
      </div>

      <div className="flex items-center gap-1 text-xs text-[var(--text-2)]">
        <span>{entity.city}</span>
        <span>·</span>
        <span>{entity.cluster}</span>
      </div>

      <div className="flex items-center justify-between gap-2">
        {field ? (
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white truncate max-w-[160px]"
            style={{ backgroundColor: field.color }}
            title={field.label}
          >
            Field {entity.top_hacs_field}: {field.label}
          </span>
        ) : (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#D1D5DB] text-[#6B7280] font-medium">
            Field TBD
          </span>
        )}
      </div>

      <p className="text-[10px] text-[var(--text-2)] italic">
        Cluster share ~{formatEur(entity.cluster_share_eur)} proxy
      </p>

      <button
        onClick={() => onOpen(entity)}
        className="mt-auto text-xs text-[var(--accent)] font-medium hover:underline text-left"
      >
        Open dossier →
      </button>
    </div>
  );
}
