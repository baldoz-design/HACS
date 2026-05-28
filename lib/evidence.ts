import coveragePlan from "@/data/beacon_execution_coverage_plan.json";
import type { ApiEntityIntelligence, ApiIntelligenceSignal } from "@/lib/api";

export type CoverageStatus =
  | "covered"
  | "indirect_only"
  | "checked_no_public_beacon_evidence"
  | "follow_up_needed"
  | "pending";

interface CoverageRow {
  acronym: string;
  status: CoverageStatus;
}

const coverageByAcronym = new Map(
  (coveragePlan.rows as CoverageRow[]).map((row) => [row.acronym, row])
);

export function getCoverageStatus(acronym: string): CoverageStatus {
  return coverageByAcronym.get(acronym)?.status ?? "pending";
}

export function coverageLabel(status: CoverageStatus): string {
  if (status === "covered") return "Confirmed";
  if (status === "indirect_only") return "Indirect";
  if (status === "checked_no_public_beacon_evidence") return "Checked";
  if (status === "follow_up_needed") return "Follow-up";
  return "Unknown";
}

export function coverageTone(status: CoverageStatus): string {
  if (status === "covered") return "bg-[#6A9E6A]/10 text-[#4F7F4F]";
  if (status === "indirect_only") return "bg-[#D4A017]/10 text-[#9A7412]";
  if (status === "checked_no_public_beacon_evidence") return "bg-[var(--bg)] text-[var(--text-2)] border border-[var(--border)]";
  if (status === "follow_up_needed") return "bg-[#E07A5F]/10 text-[#B45A43]";
  return "bg-[var(--border)] text-[var(--text-2)]";
}

export function coverageDescription(status: CoverageStatus): string {
  if (status === "covered") {
    return "Confirmed public execution records exist for this entity. Refresh intelligence to attach the latest DB records to the dossier.";
  }
  if (status === "indirect_only") {
    return "Official sources show compatible framework or DIGIT signals, but not enough evidence to attribute a BEACON execution record.";
  }
  if (status === "checked_no_public_beacon_evidence") {
    return "Official procurement sources were checked and no public BEACON execution evidence was found.";
  }
  if (status === "follow_up_needed") {
    return "A source pattern exists, but this entity still needs targeted follow-up before we can classify execution evidence.";
  }
  return "Execution evidence has not been classified yet.";
}

export function isProcurementSignal(signal: ApiIntelligenceSignal): boolean {
  return signal.source === "ted" || signal.source === "historical_award";
}

export function isExecutionSignal(signal: ApiIntelligenceSignal): boolean {
  return signal.source === "historical_execution";
}

export function splitEvidenceSignals(intelligence?: ApiEntityIntelligence) {
  const signals = intelligence?.signals ?? [];
  const procurementSignals = signals.filter(isProcurementSignal);
  return {
    procurementSignals,
    recentProcurementSignals: procurementSignals.filter(isRecentProcurementSignal),
    historicalProcurementSignals: procurementSignals.filter(
      (signal) => !isRecentProcurementSignal(signal)
    ),
    executionSignals: signals.filter(isExecutionSignal),
  };
}

export function evidenceCounts(intelligence?: ApiEntityIntelligence) {
  const {
    procurementSignals,
    recentProcurementSignals,
    historicalProcurementSignals,
    executionSignals,
  } = splitEvidenceSignals(intelligence);
  const tedCounts = intelligence?.summary?.ted_counts;
  return {
    procurement: procurementSignals.length,
    recentProcurement: tedCounts?.recent ?? recentProcurementSignals.length,
    historicalProcurement: tedCounts?.historical ?? historicalProcurementSignals.length,
    execution: executionSignals.length,
  };
}

export function signalYear(signal: ApiIntelligenceSignal): number | null {
  if (!signal.date) return null;
  const year = Number(signal.date.slice(0, 4));
  return Number.isFinite(year) ? year : null;
}

export function isRecentProcurementSignal(signal: ApiIntelligenceSignal): boolean {
  if (signal.source !== "ted") return false;
  const year = signalYear(signal);
  return year !== null && year >= 2025;
}
