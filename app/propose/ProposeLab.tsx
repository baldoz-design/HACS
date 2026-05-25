"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useProposalStore } from "@/lib/proposalStore";
import { HACS_FIELDS } from "@/lib/types";
import {
  fetchEntities,
  fetchServices,
  computeScenario,
  saveScenario,
  fetchScenarios,
} from "@/lib/api";
import type { ApiEntity, ApiService, ScenarioOut, TeamMix } from "@/lib/api";

// ── helpers ───────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
}

function recommendationColor(rec: string) {
  if (rec === "Bid recommended") return "#6A9E6A";
  if (rec === "Monitor") return "#D4A017";
  return "#C0392B";
}

// ── sub-components ────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold text-[var(--text-2)] uppercase tracking-wider mb-2">
      {children}
    </p>
  );
}

function FitBar({ label, value }: { label: string; value: number }) {
  const pct = (value / 5) * 100;
  const color = value >= 4 ? "#6A9E6A" : value >= 2.5 ? "#D4A017" : "#C0392B";
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-[var(--text-2)] w-20 shrink-0">{label}</span>
      <div className="flex-1 bg-[var(--border)] rounded-full h-2">
        <div
          className="h-2 rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-semibold w-8 text-right" style={{ color }}>
        {value.toFixed(1)}
      </span>
    </div>
  );
}

function ScoreBar({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  const pct = (value / max) * 100;
  const color =
    pct >= 70 ? "#6A9E6A" : pct >= 50 ? "#D4A017" : "#C0392B";
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-[var(--text-2)]">{label}</span>
        <span className="text-xs font-semibold text-[var(--text-1)]">
          {value.toFixed(1)} / {max}
        </span>
      </div>
      <div className="bg-[var(--border)] rounded-full h-2.5">
        <div
          className="h-2.5 rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function SkeletonBar({ wide }: { wide?: boolean }) {
  return (
    <div
      className={`h-2.5 rounded-full bg-[var(--border)] animate-pulse ${wide ? "w-full" : "w-24"}`}
    />
  );
}

// ── entity selector ───────────────────────────────────────────────────

function EntitySelector({
  entities,
  value,
  onChange,
}: {
  entities: ApiEntity[];
  value: number | null;
  onChange: (id: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selected = entities.find((e) => e.id === value);

  const filtered = entities
    .filter(
      (e) =>
        e.acronym.toLowerCase().includes(search.toLowerCase()) ||
        e.name.toLowerCase().includes(search.toLowerCase())
    )
    .slice(0, 30);

  return (
    <div className="relative">
      <input
        value={open ? search : (selected ? `${selected.acronym} — ${selected.name}` : "")}
        onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
        onFocus={() => { setOpen(true); setSearch(""); }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Search entity…"
        className="w-full h-8 px-3 text-sm rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-1)] placeholder:text-[var(--text-2)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-lg max-h-56 overflow-y-auto">
          {filtered.map((e) => (
            <button
              key={e.id}
              onMouseDown={() => {
                onChange(e.id);
                setOpen(false);
                setSearch("");
              }}
              className={`w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-[var(--bg)] text-sm ${
                e.is_ec_dg ? "pl-6" : ""
              } ${value === e.id ? "bg-[var(--bg)]" : ""}`}
            >
              <span className="font-semibold text-[var(--text-1)] shrink-0">
                {e.acronym}
              </span>
              <span className="text-[var(--text-2)] truncate">{e.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── team mix table ────────────────────────────────────────────────────

function TeamMixTable({
  team_mix,
  onChange,
}: {
  team_mix: TeamMix;
  onChange: (key: keyof TeamMix, val: number) => void;
}) {
  const rows: { label: string; dst: keyof TeamMix; bcg: keyof TeamMix }[] = [
    { label: "Senior Expert", dst: "senior_dst", bcg: "senior_bcg" },
    { label: "Expert", dst: "expert_dst", bcg: "expert_bcg" },
    { label: "Junior", dst: "junior_dst", bcg: "junior_bcg" },
  ];
  const totalDst =
    team_mix.senior_dst + team_mix.expert_dst + team_mix.junior_dst;
  const totalBcg =
    team_mix.senior_bcg + team_mix.expert_bcg + team_mix.junior_bcg;

  return (
    <table className="w-full text-xs border-collapse">
      <thead>
        <tr className="text-[var(--text-2)]">
          <th className="text-left pb-1 font-medium">Profile</th>
          <th className="text-center pb-1 font-medium w-16">DST d.</th>
          <th className="text-center pb-1 font-medium w-16">BCG d.</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.label}>
            <td className="py-0.5 text-[var(--text-1)]">{r.label}</td>
            <td className="py-0.5 px-1">
              <input
                type="number"
                min={0}
                value={team_mix[r.dst] || ""}
                onChange={(e) =>
                  onChange(r.dst, Math.max(0, parseInt(e.target.value) || 0))
                }
                className="w-full text-center h-6 rounded border border-[var(--border)] bg-[var(--bg)] text-xs focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
              />
            </td>
            <td className="py-0.5 px-1">
              <input
                type="number"
                min={0}
                value={team_mix[r.bcg] || ""}
                onChange={(e) =>
                  onChange(r.bcg, Math.max(0, parseInt(e.target.value) || 0))
                }
                className="w-full text-center h-6 rounded border border-[var(--border)] bg-[var(--bg)] text-xs focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
              />
            </td>
          </tr>
        ))}
        <tr className="font-semibold text-[var(--text-1)] border-t border-[var(--border)]">
          <td className="pt-1">Total</td>
          <td className="pt-1 text-center">{totalDst}</td>
          <td className="pt-1 text-center">{totalBcg}</td>
        </tr>
      </tbody>
    </table>
  );
}

// ── scenario card ─────────────────────────────────────────────────────

function ScenarioCard({
  scenario,
  onLoad,
}: {
  scenario: ScenarioOut;
  onLoad: () => void;
}) {
  const field = HACS_FIELDS[scenario.hacs_field];
  const recColor = recommendationColor(scenario.bid_recommendation);
  const mixLabel =
    scenario.provider_mix === "dst"
      ? "DST-led"
      : scenario.provider_mix === "bcg"
      ? "BCG-led"
      : "Combined";

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        {field ? (
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white"
            style={{ backgroundColor: field.color }}
          >
            Field {scenario.hacs_field}
          </span>
        ) : (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--border)] text-[var(--text-2)]">
            Field {scenario.hacs_field}
          </span>
        )}
        <span className="text-[10px] text-[var(--text-2)]">
          {fmtDate(scenario.created_at)}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span
          className="text-2xl font-bold"
          style={{ color: recColor }}
        >
          {scenario.total_score.toFixed(0)}
        </span>
        <span className="text-xs text-[var(--text-2)]">/ 100</span>
        <span className="ml-auto text-xs text-[var(--text-2)]">{mixLabel}</span>
      </div>
      <span
        className="text-[10px] font-semibold px-2 py-0.5 rounded-full self-start"
        style={{
          backgroundColor: `${recColor}20`,
          color: recColor,
        }}
      >
        {scenario.bid_recommendation}
      </span>
      <button
        onClick={onLoad}
        className="mt-1 text-xs text-[var(--accent)] font-medium hover:underline text-left"
      >
        Load scenario →
      </button>
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────

export function ProposeLab() {
  const searchParams = useSearchParams();
  const prefilledEntityId = searchParams.get("entity");

  const store = useProposalStore();
  const {
    entity_id,
    hacs_field,
    provider_mix,
    dst_service_ids,
    bcg_service_ids,
    price_posture,
    team_mix,
    score,
    isLoading,
    error,
    savedScenarios,
  } = store;

  const [entities, setEntities] = useState<ApiEntity[]>([]);
  const [dstServices, setDstServices] = useState<ApiService[]>([]);
  const [bcgServices, setBcgServices] = useState<ApiService[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load entities + services once
  useEffect(() => {
    Promise.all([fetchEntities(), fetchServices()])
      .then(([ents, svcs]) => {
        setEntities(ents);
        setDstServices(svcs.dst);
        setBcgServices(svcs.bcg);
        setLoadingData(false);

        // Pre-fill from URL param
        if (prefilledEntityId) {
          const id = parseInt(prefilledEntityId);
          if (!isNaN(id)) store.setEntityId(id);
        }
      })
      .catch(() => {
        setDataError("Cannot reach backend — is the API server running on port 8001?");
        setLoadingData(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load saved scenarios when entity changes
  useEffect(() => {
    if (!entity_id) return;
    fetchScenarios(entity_id)
      .then(store.setSavedScenarios)
      .catch(() => {});
  }, [entity_id]);

  // Debounced compute
  useEffect(() => {
    if (!entity_id || !hacs_field || !price_posture) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      store.setLoading(true);
      store.setError(null);
      try {
        const result = await computeScenario({
          entity_id,
          hacs_field,
          provider_mix,
          dst_service_ids,
          bcg_service_ids,
          price_posture,
          team_mix,
        });
        store.setScore(result);
      } catch {
        store.setError("Score unavailable — check backend connection.");
        store.setScore(null);
      } finally {
        store.setLoading(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [entity_id, hacs_field, provider_mix, dst_service_ids, bcg_service_ids, price_posture, team_mix]);

  async function handleSave() {
    if (!entity_id || !hacs_field || !price_posture) return;
    setSaving(true);
    try {
      const saved = await saveScenario({
        entity_id,
        hacs_field,
        provider_mix,
        dst_service_ids,
        bcg_service_ids,
        price_posture,
        team_mix,
      });
      store.addSavedScenario(saved);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }

  // Filter services by selected field
  const filteredDst = hacs_field
    ? dstServices.filter((s) => s.hacs_fields.includes(hacs_field))
    : dstServices;
  const filteredBcg = hacs_field
    ? bcgServices.filter((s) => s.hacs_fields.includes(hacs_field))
    : bcgServices;

  const selectedEntity = entities.find((e) => e.id === entity_id);
  const recColor = score ? recommendationColor(score.bid_recommendation) : "#78716C";

  if (loadingData) {
    return (
      <div className="flex items-center justify-center h-64 text-[var(--text-2)] text-sm">
        Loading data…
      </div>
    );
  }

  if (dataError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-center px-6">
        <p className="text-sm font-medium text-[var(--text-1)]">Backend unavailable</p>
        <p className="text-xs text-[var(--text-2)] max-w-sm">{dataError}</p>
        <code className="text-xs bg-[var(--border)] px-2 py-1 rounded font-mono">
          cd backend && python3 -m uvicorn main:app --port 8001
        </code>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Page header */}
      <div className="px-6 pt-6 pb-4 border-b border-[var(--border)] bg-[var(--surface)]">
        <h1 className="text-xl font-bold text-[var(--text-1)]">Proposal Lab</h1>
        <p className="text-sm text-[var(--text-2)] mt-0.5">
          Configure a proposal scenario and see the 70/30 win score update live.
        </p>
      </div>

      {/* Three-column layout */}
      <div className="px-6 py-6 grid grid-cols-1 lg:grid-cols-[320px_1fr_280px] gap-6 items-start">

        {/* ── LEFT: Inputs ─────────────────────────────────────────── */}
        <div className="space-y-5">

          {/* Entity */}
          <div>
            <SectionLabel>Entity</SectionLabel>
            <EntitySelector
              entities={entities}
              value={entity_id}
              onChange={store.setEntityId}
            />
            {selectedEntity && (
              <p className="text-[10px] text-[var(--text-2)] mt-1">
                {selectedEntity.city} · {selectedEntity.cluster}
              </p>
            )}
          </div>

          {/* HACS field */}
          <div>
            <SectionLabel>HACS Field</SectionLabel>
            <div className="flex flex-col gap-1">
              {[1, 2, 3, 4, 5].map((f) => {
                const fd = HACS_FIELDS[f];
                const active = hacs_field === f;
                return (
                  <button
                    key={f}
                    onClick={() => store.setField(active ? null : f)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs text-left transition-colors"
                    style={
                      active
                        ? { backgroundColor: fd.color, borderColor: fd.color, color: "white" }
                        : { borderColor: "var(--border)", color: "var(--text-2)" }
                    }
                  >
                    <span className="font-semibold w-4">{f}</span>
                    <span className="truncate">{fd.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Provider mix */}
          <div>
            <SectionLabel>Provider Mix</SectionLabel>
            <div className="flex flex-col gap-1">
              {(["dst", "bcg", "combined"] as const).map((m) => {
                const label =
                  m === "dst" ? "DST-led" : m === "bcg" ? "BCG-led" : "Combined (DST + BCG)";
                return (
                  <label
                    key={m}
                    className="flex items-center gap-2 cursor-pointer text-sm text-[var(--text-1)]"
                  >
                    <input
                      type="radio"
                      name="provider_mix"
                      checked={provider_mix === m}
                      onChange={() => store.setProviderMix(m)}
                      className="accent-[var(--accent)]"
                    />
                    {label}
                  </label>
                );
              })}
            </div>
          </div>

          {/* DST services */}
          <div>
            <SectionLabel>
              DST Services{hacs_field ? ` (Field ${hacs_field})` : ""}
            </SectionLabel>
            {filteredDst.length === 0 ? (
              <p className="text-xs text-[var(--text-2)] italic">
                {hacs_field ? "No DST services for this field" : "Select a field first"}
              </p>
            ) : (
              <div className="flex flex-col gap-1">
                {filteredDst.map((s) => (
                  <label
                    key={s.id}
                    className="flex items-start gap-2 cursor-pointer"
                    title={s.description}
                  >
                    <input
                      type="checkbox"
                      checked={dst_service_ids.includes(s.id)}
                      onChange={() => store.toggleDstService(s.id)}
                      className="mt-0.5 accent-[var(--accent)]"
                    />
                    <span className="text-xs text-[var(--text-1)] leading-tight">
                      {s.name}
                      <span className="ml-1 text-[var(--text-2)]">
                        (str {s.delivery_strength}/5)
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* BCG services */}
          <div>
            <SectionLabel>
              BCG Services{hacs_field ? ` (Field ${hacs_field})` : ""}
            </SectionLabel>
            {filteredBcg.length === 0 ? (
              <p className="text-xs text-[var(--text-2)] italic">
                {hacs_field ? "No BCG services for this field" : "Select a field first"}
              </p>
            ) : (
              <div className="flex flex-col gap-1">
                {filteredBcg.map((s) => (
                  <label
                    key={s.id}
                    className="flex items-start gap-2 cursor-pointer"
                    title={s.description}
                  >
                    <input
                      type="checkbox"
                      checked={bcg_service_ids.includes(s.id)}
                      onChange={() => store.toggleBcgService(s.id)}
                      className="mt-0.5 accent-[var(--accent)]"
                    />
                    <span className="text-xs text-[var(--text-1)] leading-tight">
                      {s.name}
                      <span className="ml-1 text-[var(--text-2)]">
                        (str {s.delivery_strength}/5)
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Price posture */}
          <div>
            <SectionLabel>Price Posture</SectionLabel>
            <div className="flex flex-col gap-1">
              {(
                [
                  {
                    key: "competitive",
                    label: "Competitive",
                    tip: "~90% of reference rate — maximises financial score, margin risk",
                  },
                  {
                    key: "balanced",
                    label: "Balanced",
                    tip: "~70% of reference rate — solid score, sustainable margin",
                  },
                  {
                    key: "premium",
                    label: "Premium",
                    tip: "~50% of reference rate — lower financial score, signals value",
                  },
                ] as const
              ).map(({ key, label, tip }) => (
                <label
                  key={key}
                  className="flex items-start gap-2 cursor-pointer"
                  title={tip}
                >
                  <input
                    type="radio"
                    name="price_posture"
                    checked={price_posture === key}
                    onChange={() => store.setPosture(key)}
                    className="mt-0.5 accent-[var(--accent)]"
                  />
                  <span className="text-xs text-[var(--text-1)]">
                    <span className="font-medium">{label}</span>
                    <span className="text-[var(--text-2)]"> — {tip}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Team mix */}
          <div>
            <SectionLabel>Team Mix (days)</SectionLabel>
            <TeamMixTable
              team_mix={team_mix}
              onChange={store.setTeamDays}
            />
          </div>
        </div>

        {/* ── CENTER: Live score ────────────────────────────────────── */}
        <div className="space-y-5">
          {/* Fit scores */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 space-y-3">
            <SectionLabel>Provider Fit (for selected field)</SectionLabel>
            {isLoading ? (
              <div className="space-y-3">
                <SkeletonBar wide />
                <SkeletonBar wide />
                <SkeletonBar wide />
              </div>
            ) : score ? (
              <>
                <FitBar label="DST fit" value={score.dst_fit} />
                <FitBar label="BCG fit" value={score.bcg_fit} />
                <FitBar label="Combined" value={score.combined_fit} />
              </>
            ) : (
              <p className="text-xs text-[var(--text-2)] italic">
                Select entity, field and posture to see fit scores.
              </p>
            )}
          </div>

          {/* Score bars + recommendation */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 space-y-4">
            <SectionLabel>Win Score (70/30)</SectionLabel>

            {error && (
              <p className="text-xs text-[var(--risk)] font-medium">{error}</p>
            )}

            {isLoading ? (
              <div className="space-y-4">
                <SkeletonBar wide />
                <SkeletonBar wide />
                <SkeletonBar wide />
              </div>
            ) : score ? (
              <>
                <ScoreBar
                  label="Technical score"
                  value={score.technical_score}
                  max={70}
                />
                <ScoreBar
                  label="Financial score"
                  value={score.financial_score}
                  max={30}
                />
                <div className="pt-1 border-t border-[var(--border)]">
                  <div className="flex items-end gap-2 mb-2">
                    <span
                      className="text-4xl font-bold leading-none"
                      style={{ color: recColor }}
                    >
                      {score.total_score.toFixed(0)}
                    </span>
                    <span className="text-sm text-[var(--text-2)] mb-1">/ 100</span>
                  </div>
                  <span
                    className="inline-block text-xs font-semibold px-3 py-1 rounded-full"
                    style={{
                      backgroundColor: `${recColor}20`,
                      color: recColor,
                    }}
                  >
                    {score.bid_recommendation}
                  </span>
                  <p className="text-xs text-[var(--text-2)] mt-2">
                    Lead: {score.lead_provider}
                  </p>
                </div>
              </>
            ) : (
              <p className="text-xs text-[var(--text-2)] italic">
                {!entity_id
                  ? "Select an entity to begin."
                  : !hacs_field
                  ? "Select a HACS field."
                  : "Computing…"}
              </p>
            )}

            <p className="text-[10px] text-[var(--text-2)] italic border-t border-[var(--border)] pt-3 mt-2">
              Scenario estimate — not a verified fact. Computed from seed data and
              deterministic rules.
            </p>
          </div>
        </div>

        {/* ── RIGHT: Explanation ───────────────────────────────────── */}
        <div className="space-y-4">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 space-y-4">
            <SectionLabel>Why this score</SectionLabel>

            {isLoading ? (
              <div className="space-y-2">
                <SkeletonBar wide />
                <SkeletonBar wide />
                <SkeletonBar />
              </div>
            ) : score?.explanation ? (
              <>
                <div>
                  <p className="text-xs font-semibold text-[var(--text-1)] mb-1">
                    Top factor
                  </p>
                  <p className="text-xs text-[var(--text-2)]">
                    {score.explanation.top_factor}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-[var(--text-1)] mb-1">
                    Score components
                  </p>
                  <ul className="space-y-1">
                    {score.explanation.components.map((c, i) => (
                      <li key={i} className="text-[10px] text-[var(--text-2)]">
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
                {score.explanation.risks.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-[var(--risk)] mb-1">
                      Risks
                    </p>
                    <ul className="space-y-1">
                      {score.explanation.risks.map((r, i) => (
                        <li
                          key={i}
                          className="text-[10px] text-[var(--text-2)] flex gap-1"
                        >
                          <span className="text-[var(--risk)] shrink-0">•</span>
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {score.explanation.missing_proof_points.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-[var(--warning)] mb-1">
                      Missing proof points
                    </p>
                    <ul className="space-y-1">
                      {score.explanation.missing_proof_points.map((m, i) => (
                        <li
                          key={i}
                          className="text-[10px] text-[var(--text-2)] flex gap-1"
                        >
                          <span className="text-[var(--warning)] shrink-0">•</span>
                          {m}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <p className="text-xs text-[var(--text-2)] italic">
                Explanation will appear once a score is computed.
              </p>
            )}
          </div>

          {/* Actions */}
          <button
            onClick={handleSave}
            disabled={!score || saving}
            className="w-full py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? "Saving…" : saveSuccess ? "Saved ✓" : "Save this scenario"}
          </button>
          <button
            disabled
            className="w-full py-2 rounded-lg border border-[var(--border)] text-sm font-medium text-[var(--text-2)] cursor-not-allowed opacity-60"
          >
            Generate outreach → (Session 3)
          </button>
        </div>
      </div>

      {/* ── Saved scenarios ──────────────────────────────────────────── */}
      <div className="px-6 pb-16">
        <div className="border-t border-[var(--border)] pt-6">
          <h2 className="text-sm font-semibold text-[var(--text-1)] mb-4">
            Saved scenarios
            {entity_id && selectedEntity
              ? ` for ${selectedEntity.acronym}`
              : ""}
          </h2>
          {savedScenarios.length === 0 ? (
            <p className="text-xs text-[var(--text-2)] italic">
              No saved scenarios yet for this entity. Configure and save one above.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {savedScenarios.map((s) => (
                <ScenarioCard
                  key={s.id}
                  scenario={s}
                  onLoad={() => store.loadScenario(s)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
