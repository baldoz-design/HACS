"use client";

import { create } from "zustand";
import type { ComputeResult, ScenarioOut, TeamMix } from "./api";

export type ProviderMix = "dst" | "bcg" | "combined";
export type PricePosture = "competitive" | "balanced" | "premium";

const DEFAULT_TEAM: TeamMix = {
  senior_dst: 0,
  senior_bcg: 0,
  expert_dst: 0,
  expert_bcg: 0,
  junior_dst: 0,
  junior_bcg: 0,
};

interface ProposalState {
  entity_id: number | null;
  hacs_field: number | null;
  provider_mix: ProviderMix;
  dst_service_ids: number[];
  bcg_service_ids: number[];
  price_posture: PricePosture;
  team_mix: TeamMix;

  score: ComputeResult | null;
  isLoading: boolean;
  error: string | null;
  savedScenarios: ScenarioOut[];

  setEntityId: (id: number | null) => void;
  setField: (f: number | null) => void;
  setProviderMix: (m: ProviderMix) => void;
  toggleDstService: (id: number) => void;
  toggleBcgService: (id: number) => void;
  setPosture: (p: PricePosture) => void;
  setTeamDays: (key: keyof TeamMix, val: number) => void;
  setScore: (s: ComputeResult | null) => void;
  setLoading: (l: boolean) => void;
  setError: (e: string | null) => void;
  setSavedScenarios: (ss: ScenarioOut[]) => void;
  addSavedScenario: (s: ScenarioOut) => void;
  loadScenario: (s: ScenarioOut) => void;
  resetInputs: () => void;
}

export const useProposalStore = create<ProposalState>((set) => ({
  entity_id: null,
  hacs_field: null,
  provider_mix: "combined",
  dst_service_ids: [],
  bcg_service_ids: [],
  price_posture: "balanced",
  team_mix: { ...DEFAULT_TEAM },

  score: null,
  isLoading: false,
  error: null,
  savedScenarios: [],

  setEntityId: (id) => set({ entity_id: id, score: null }),
  setField: (f) =>
    set({ hacs_field: f, dst_service_ids: [], bcg_service_ids: [], score: null }),
  setProviderMix: (m) => set({ provider_mix: m, score: null }),
  toggleDstService: (id) =>
    set((s) => ({
      dst_service_ids: s.dst_service_ids.includes(id)
        ? s.dst_service_ids.filter((x) => x !== id)
        : [...s.dst_service_ids, id],
      score: null,
    })),
  toggleBcgService: (id) =>
    set((s) => ({
      bcg_service_ids: s.bcg_service_ids.includes(id)
        ? s.bcg_service_ids.filter((x) => x !== id)
        : [...s.bcg_service_ids, id],
      score: null,
    })),
  setPosture: (p) => set({ price_posture: p, score: null }),
  setTeamDays: (key, val) =>
    set((s) => ({ team_mix: { ...s.team_mix, [key]: val }, score: null })),
  setScore: (s) => set({ score: s }),
  setLoading: (l) => set({ isLoading: l }),
  setError: (e) => set({ error: e }),
  setSavedScenarios: (ss) => set({ savedScenarios: ss }),
  addSavedScenario: (s) =>
    set((state) => ({ savedScenarios: [s, ...state.savedScenarios] })),
  loadScenario: (s) =>
    set({
      entity_id: s.entity_id,
      hacs_field: s.hacs_field,
      provider_mix: s.provider_mix as ProviderMix,
      dst_service_ids: s.dst_service_ids,
      bcg_service_ids: s.bcg_service_ids,
      price_posture: s.price_posture as PricePosture,
      team_mix: { ...DEFAULT_TEAM },
      score: null,
    }),
  resetInputs: () =>
    set({
      hacs_field: null,
      provider_mix: "combined",
      dst_service_ids: [],
      bcg_service_ids: [],
      price_posture: "balanced",
      team_mix: { ...DEFAULT_TEAM },
      score: null,
    }),
}));
