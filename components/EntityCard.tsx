"use client";

import { useState } from "react";
import { HACS_FIELDS } from "@/lib/types";
import type { EntityWithScore } from "@/lib/types";
import type { ApiEntityIntelligence, ApiHacsAssignment } from "@/lib/api";
import { getEntityProfile } from "@/lib/entityProfile";
import { coverageLabel, evidenceCounts, getCoverageStatus } from "@/lib/evidence";
import { formatEur } from "@/lib/format";
import { countryFlag } from "@/lib/flags";

interface Props {
  entity: EntityWithScore;
  onOpen: (entity: EntityWithScore) => void;
  intelligence?: ApiEntityIntelligence;
  hacsAssignment?: ApiHacsAssignment;
  indent?: boolean;
  selected?: boolean;
  onToggleSelect: (entityId: number) => void;
}

function faviconUrl(websiteUrl: string | null): string | null {
  if (!websiteUrl) return null;
  try {
    const { hostname } = new URL(websiteUrl);
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=96`;
  } catch {
    return null;
  }
}

function EntityLogo({
  acronym,
  logoUrl,
  websiteUrl,
}: {
  acronym: string;
  logoUrl: string | null;
  websiteUrl: string | null;
}) {
  const fallbackUrl = faviconUrl(websiteUrl);
  const [mode, setMode] = useState<"logo" | "favicon" | "badge">(
    logoUrl ? "logo" : fallbackUrl ? "favicon" : "badge"
  );
  const src = mode === "logo" ? logoUrl : mode === "favicon" ? fallbackUrl : null;

  if (!src) {
    return (
      <div className="flex h-11 w-16 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[10px] font-semibold text-[var(--text-2)]">
        {acronym}
      </div>
    );
  }

  return (
    <div className="flex h-11 w-16 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-white p-1.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={`${acronym} logo`}
        className="max-h-8 max-w-12 object-contain"
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => {
          if (mode === "logo" && fallbackUrl) {
            setMode("favicon");
            return;
          }
          setMode("badge");
        }}
      />
    </div>
  );
}

export function EntityCard({
  entity,
  onOpen,
  intelligence,
  hacsAssignment,
  indent,
  selected,
  onToggleSelect,
}: Props) {
  const field = entity.top_hacs_field ? HACS_FIELDS[entity.top_hacs_field] : null;
  const assignmentField = hacsAssignment?.primary_field
    ? HACS_FIELDS[hacsAssignment.primary_field]
    : null;
  const coverageStatus = getCoverageStatus(entity.acronym);
  const counts = evidenceCounts(intelligence);
  const entityProfile = getEntityProfile(entity);
  const relationship =
    entity.relationship_signal === "both"
      ? "Dst + BCG contact"
      : entity.relationship_signal === "bcg_contact"
        ? "BCG contact"
        : entity.relationship_signal === "dst_contact"
          ? "Dst contact"
          : null;

  return (
    <div
      onClick={() => onOpen(entity)}
      className={`
        bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 flex flex-col gap-3
        hover:shadow-md transition-shadow cursor-pointer
        ${indent ? "ml-4 border-l-4 border-l-[#E07A5F]/30" : ""}
        ${selected ? "ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--bg)]" : ""}
      `}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onToggleSelect(entity.id);
              }}
              className={`h-4 w-4 rounded border transition-colors ${
                selected
                  ? "bg-[var(--accent)] border-[var(--accent)]"
                  : "border-[var(--border)] bg-transparent"
              }`}
              aria-label={selected ? "Deselect entity" : "Select entity"}
            >
              <span className="sr-only">{selected ? "Selected" : "Not selected"}</span>
            </button>
            <span className="text-xl font-bold text-[var(--text-1)] leading-none">
              {entity.acronym}
            </span>
          </div>
          <p className="text-xs text-[var(--text-2)] mt-1 line-clamp-2 leading-relaxed">
            {entity.name}
          </p>
        </div>
        <EntityLogo
          acronym={entity.acronym}
          logoUrl={entityProfile.logoUrl}
          websiteUrl={entityProfile.websiteUrl}
        />
      </div>

      <div className="flex items-center gap-1 text-xs text-[var(--text-2)]">
        <span aria-label={entity.country} title={entity.country}>
          {countryFlag(entity.country)}
        </span>
        <span>{entity.city}</span>
        <span>·</span>
        <span>{entity.cluster}</span>
        {relationship && (
          <>
            <span>·</span>
            <span>{relationship}</span>
          </>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        {field ? (
          <span className="inline-flex items-center gap-2 text-[11px] font-medium text-[var(--text-1)] truncate">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: field.color }}
              aria-hidden="true"
            />
            Approved F{entity.top_hacs_field}: {field.label}
          </span>
        ) : assignmentField ? (
          <span className="inline-flex items-center gap-2 text-[11px] font-medium text-[var(--text-1)] truncate">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: assignmentField.color }}
              aria-hidden="true"
            />
            Suggested F{hacsAssignment?.primary_field}: {assignmentField.label}
          </span>
        ) : (
          <span className="text-[11px] text-[var(--text-2)] font-medium">
            Field TBD
          </span>
        )}
      </div>

      <p className="text-[11px] text-[var(--text-1)] leading-relaxed min-h-[2.5rem]">
        {intelligence?.need_statement ?? "Run Refresh intelligence to estimate the likely need and suggested HACS field."}
      </p>

      <div className="grid grid-cols-4 gap-2">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2">
          <p className="text-[9px] uppercase tracking-wider text-[var(--text-2)]">
            Annual budget
          </p>
          <p className="mt-0.5 text-sm font-semibold text-[var(--text-1)]">
            {entityProfile.annualBudgetEur !== null
              ? formatEur(entityProfile.annualBudgetEur)
              : "Not available"}
          </p>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2">
          <p className="text-[9px] uppercase tracking-wider text-[var(--text-2)]">
            Recent TED
          </p>
          <p className="mt-0.5 text-sm font-semibold text-[var(--text-1)]">
            {counts.recentProcurement}
          </p>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2">
          <p className="text-[9px] uppercase tracking-wider text-[var(--text-2)]">
            Historical TED
          </p>
          <p className="mt-0.5 text-sm font-semibold text-[var(--text-1)]">
            {counts.historicalProcurement}
          </p>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2">
          <p className="text-[9px] uppercase tracking-wider text-[var(--text-2)]">
            Exec. Evidence
          </p>
          <p className="mt-0.5 text-sm font-semibold text-[var(--text-1)]">
            {counts.execution}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 text-[10px] text-[var(--text-2)] border-t border-[var(--border)] pt-2">
        <span>Execution {coverageLabel(coverageStatus)}</span>
        <span>{hacsAssignment?.confidence ?? intelligence?.confidence ?? "Unscored"}</span>
      </div>
    </div>
  );
}
