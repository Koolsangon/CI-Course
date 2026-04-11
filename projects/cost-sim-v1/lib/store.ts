"use client";

import { create } from "zustand";
import { calculate } from "./cost-engine/engine";
import type { CostParams, CostResult } from "./cost-engine/types";
import { diff, type DeltaTrace } from "./cost-engine/diff";
import { cloneParams, ALL_REFERENCES } from "./cost-engine/presets";

export type Mode = "sandbox" | "guided";

/** Guided 4-phase progression. */
export type GuidedPhase = "hook" | "discover" | "apply" | "reflect";

export interface StoreState {
  mode: Mode;
  caseId: string | null;
  params: CostParams;
  result: CostResult;
  lastDelta: DeltaTrace[];

  guidedPhase: GuidedPhase;
  guidedCompleted: Record<string, GuidedPhase[]>;
  // R9: Reflect freeform stays client-side only, never sent to any API.
  reflectNotes: Record<string, string>;

  setMode: (mode: Mode) => void;
  loadCase: (caseId: string, params: CostParams) => void;
  setParams: (next: CostParams | ((prev: CostParams) => CostParams)) => void;
  resetCase: () => void;
  advanceGuidedPhase: () => void;
  setGuidedPhase: (phase: GuidedPhase) => void;
  recordReflection: (caseId: string, text: string) => void;
}

const DEFAULT_PARAMS = cloneParams(ALL_REFERENCES[1]);

export const useStore = create<StoreState>((set, get) => ({
  mode: "sandbox",
  caseId: null,
  params: DEFAULT_PARAMS,
  result: calculate(DEFAULT_PARAMS),
  lastDelta: [],

  guidedPhase: "hook",
  guidedCompleted: {},
  reflectNotes: {},

  setMode: (mode) => set({ mode }),

  loadCase: (caseId, params) => {
    const current = get().caseId;
    if (current === caseId) return; // idempotent — don't stomp guidedPhase on re-mount
    const next = cloneParams(params);
    set({
      caseId,
      params: next,
      result: calculate(next),
      lastDelta: [],
      guidedPhase: "hook"
    });
  },

  setParams: (next) => {
    const prevResult = get().result;
    const nextParams =
      typeof next === "function" ? next(get().params) : cloneParams(next);
    const nextResult = calculate(nextParams);
    set({
      params: nextParams,
      result: nextResult,
      lastDelta: diff(prevResult, nextResult)
    });
  },

  resetCase: () => {
    const caseId = get().caseId;
    const preset = caseId ? ALL_REFERENCES[Number(caseId[0]) as 1 | 2 | 3 | 4 | 5 | 6] : DEFAULT_PARAMS;
    const p = cloneParams(preset);
    set({ params: p, result: calculate(p), lastDelta: [] });
  },

  advanceGuidedPhase: () => {
    const { guidedPhase, guidedCompleted, caseId } = get();
    if (!caseId) return;
    const order: GuidedPhase[] = ["hook", "discover", "apply", "reflect"];
    const idx = order.indexOf(guidedPhase);
    const completedForCase = guidedCompleted[caseId] ?? [];
    if (!completedForCase.includes(guidedPhase)) completedForCase.push(guidedPhase);
    const next = order[idx + 1] ?? "reflect";
    set({
      guidedPhase: next,
      guidedCompleted: { ...guidedCompleted, [caseId]: [...completedForCase] }
    });
  },

  setGuidedPhase: (phase) => set({ guidedPhase: phase }),

  recordReflection: (caseId, text) => {
    const { reflectNotes } = get();
    set({ reflectNotes: { ...reflectNotes, [caseId]: text } });
  }
}));
