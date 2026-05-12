"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { calculate } from "./cost-engine/engine";
import type { CostParams, CostResult } from "./cost-engine/types";
import { diff, type DeltaTrace } from "./cost-engine/diff";
import { cloneParams, ALL_REFERENCES } from "./cost-engine/presets";

export type Mode = "sandbox" | "guided";

/** Guided 4-phase progression. */
export type GuidedPhase = "hook" | "discover" | "apply" | "reflect";

export interface CaseScore {
  /** 0..3, derived from accuracy / move efficiency / hint-free */
  stars: number;
  /** 0..1 — how close the Apply answer was to the key (1 = bullseye) */
  accuracy: number;
  /** Slider movements counted (debounced — see Discover/ParamPanel) */
  moves: number;
  /** True if the player opened the hint card */
  hintUsed: boolean;
  /** Raw score 0..135 — see plan §5 */
  score: number;
  /** Number of Apply attempts (correct or otherwise) */
  attempts: number;
  /** The operating_profit captured at the moment Apply went correct. Used for campaign cumulativeProfit. */
  committedProfit: number;
}

export interface CampaignSlice {
  /** 1..6, last month entered (highest unlocked). */
  highestMonth: number;
  /** Sum of committedProfit across all completed months. */
  cumulativeProfit: number;
}

export interface Profile {
  name: string;
  createdAt: number;
  /** Has the intro premise modal been seen and dismissed? */
  introSeen: boolean;
  /** YYYY-MM-DD of the last day the player completed any case. */
  lastPlayedDate: string;
  /** Consecutive-day streak of days with at least one case committed. */
  streak: number;
}

/** Phase C — per-variable mastery 0..5, persisted. */
export type VariableMasterySlice = Record<string, number>;

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

  // Per-case score state. Persisted via zustand persist middleware (Phase B).
  caseScores: Record<string, CaseScore>;
  /** Slider moves observed for the currently-active case (resets on case change). NOT persisted. */
  currentMoves: number;
  /** Whether the current case has had its hint opened (resets on case change). NOT persisted. */
  currentHintUsed: boolean;

  // Phase B — campaign + profile (both persisted)
  campaign: CampaignSlice;
  profile: Profile;

  // Phase C — variable mastery (persisted)
  variableMastery: VariableMasterySlice;

  setMode: (mode: Mode) => void;
  loadCase: (caseId: string, params: CostParams) => void;
  setParams: (next: CostParams | ((prev: CostParams) => CostParams)) => void;
  resetCase: () => void;
  advanceGuidedPhase: () => void;
  setGuidedPhase: (phase: GuidedPhase) => void;
  recordReflection: (caseId: string, text: string) => void;

  // Phase A scoring actions
  countSliderMove: () => void;
  markHintUsed: () => void;
  recordCaseAttempt: (caseId: string, accuracy: number, variableCount: number, currentProfit: number, variableTags?: string[]) => CaseScore;

  // Phase B campaign + profile actions
  setProfileName: (name: string) => void;
  markIntroSeen: () => void;
  resetProgress: () => void;
}

const DEFAULT_PARAMS = cloneParams(ALL_REFERENCES[1]);

// Auto-claim the profile on first load so the ProfileGate modal never blocks
// the very first interaction. Players can later set a custom name from the
// (Phase C) profile settings panel. This keeps Phase B / earlier specs unblocked.
const DEFAULT_PROFILE: Profile = {
  name: "신임 엔지니어",
  createdAt: 1, // > 0 → ProfileGate stays hidden by default
  introSeen: false,
  lastPlayedDate: "",
  streak: 0
};

const DEFAULT_CAMPAIGN: CampaignSlice = {
  highestMonth: 1,
  cumulativeProfit: 0
};

const DEFAULT_VARIABLE_MASTERY: VariableMasterySlice = {
  loading: 0,
  labor: 0,
  yield: 0,
  cuts: 0,
  mask: 0,
  tact: 0
};

const MASTERY_CAP_VALUE = 5;

function todayISO(): string {
  if (typeof Date === "undefined") return "";
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function diffDays(prevISO: string, nextISO: string): number {
  if (!prevISO || !nextISO) return Infinity;
  const a = new Date(prevISO + "T00:00:00").getTime();
  const b = new Date(nextISO + "T00:00:00").getTime();
  return Math.round((b - a) / 86400000);
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
  mode: "sandbox",
  caseId: null,
  params: DEFAULT_PARAMS,
  result: calculate(DEFAULT_PARAMS),
  lastDelta: [],

  guidedPhase: "hook",
  guidedCompleted: {},
  reflectNotes: {},

  caseScores: {},
  currentMoves: 0,
  currentHintUsed: false,

  campaign: DEFAULT_CAMPAIGN,
  profile: DEFAULT_PROFILE,
  variableMastery: DEFAULT_VARIABLE_MASTERY,

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
      guidedPhase: "hook",
      // Reset per-case scoring counters on every fresh case load
      currentMoves: 0,
      currentHintUsed: false
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
  },

  // Phase A scoring — see plan §5 for the formula derivation.
  countSliderMove: () => {
    set((s) => ({ currentMoves: s.currentMoves + 1 }));
  },

  markHintUsed: () => {
    set({ currentHintUsed: true });
  },

  recordCaseAttempt: (caseId, accuracy, variableCount, currentProfit, variableTags = []) => {
    const { currentMoves, currentHintUsed, caseScores, campaign, profile, variableMastery } = get();
    const movePar = Math.max(1, variableCount * 4);
    const moveBonus = Math.max(0, Math.min(1, (movePar - currentMoves) / movePar));
    const hintClean = currentHintUsed ? 0 : 1;
    const score = Math.round(100 * accuracy + 20 * moveBonus + 15 * hintClean);
    const star1 = accuracy >= 0.9 ? 1 : 0;
    const star2 = moveBonus >= 0.5 ? 1 : 0;
    const star3 = hintClean === 1 && accuracy >= 0.95 ? 1 : 0;
    const stars = star1 + star2 + star3;
    const previous = caseScores[caseId];
    const next: CaseScore = {
      stars: Math.max(stars, previous?.stars ?? 0),
      accuracy: Math.max(accuracy, previous?.accuracy ?? 0),
      moves: currentMoves,
      hintUsed: currentHintUsed,
      score: Math.max(score, previous?.score ?? 0),
      attempts: (previous?.attempts ?? 0) + 1,
      committedProfit: currentProfit
    };

    // Recompute cumulativeProfit from scratch over all caseScores so re-attempts overwrite
    // the previous month's commit cleanly instead of double-counting.
    const updatedScores = { ...caseScores, [caseId]: next };
    const cumulativeProfit = Object.values(updatedScores).reduce(
      (sum, s) => sum + (s.committedProfit ?? 0),
      0
    );

    // Highest month unlocked = max(previous, current case month). Derive month from caseId prefix.
    const monthFromCaseId = Number(caseId.slice(0, 2)) || campaign.highestMonth;
    const highestMonth = Math.max(campaign.highestMonth, monthFromCaseId + 1, monthFromCaseId);

    // Phase C — bump variable mastery (cap 5) for each tag this case touches.
    // Only bump on the FIRST star1 of a case (so re-attempts don't farm mastery).
    const updatedMastery: VariableMasterySlice = { ...variableMastery };
    if (star1 === 1 && (previous?.stars ?? 0) === 0) {
      for (const tag of variableTags) {
        const current = updatedMastery[tag] ?? 0;
        if (current < MASTERY_CAP_VALUE) updatedMastery[tag] = current + 1;
      }
    }

    // Phase C — streak update. If today's date == lastPlayedDate, no change.
    // If today is exactly 1 day after lastPlayedDate, streak += 1. Otherwise reset to 1.
    const today = todayISO();
    let streak = profile.streak;
    let lastPlayedDate = profile.lastPlayedDate;
    if (today && today !== profile.lastPlayedDate) {
      const gap = diffDays(profile.lastPlayedDate, today);
      streak = gap === 1 ? profile.streak + 1 : 1;
      lastPlayedDate = today;
    } else if (!profile.lastPlayedDate && today) {
      // First-ever play — start streak at 1
      streak = 1;
      lastPlayedDate = today;
    }

    set({
      caseScores: updatedScores,
      campaign: { ...campaign, cumulativeProfit, highestMonth },
      variableMastery: updatedMastery,
      profile: { ...profile, streak, lastPlayedDate }
    });
    return next;
  },

  setProfileName: (name) => {
    const { profile } = get();
    set({
      profile: {
        ...profile,
        name: name.trim() || "신임 엔지니어",
        createdAt: profile.createdAt || Date.now()
      }
    });
  },

  markIntroSeen: () => {
    const { profile } = get();
    set({
      profile: {
        ...profile,
        introSeen: true,
        createdAt: profile.createdAt || Date.now()
      }
    });
  },

  resetProgress: () => {
    set({
      caseScores: {},
      guidedCompleted: {},
      reflectNotes: {},
      campaign: { ...DEFAULT_CAMPAIGN },
      profile: { ...DEFAULT_PROFILE },
      variableMastery: { ...DEFAULT_VARIABLE_MASTERY },
      currentMoves: 0,
      currentHintUsed: false
    });
  }
    }),
    {
      name: "cost-sim-v2-game:profile:v1",
      storage: createJSONStorage(() => localStorage),
      version: 1,
      // R9 / PIPA: localStorage stays client-side. We persist only what user-progress needs;
      // params/result/lastDelta/currentMoves/currentHintUsed are derived and re-compute on mount.
      partialize: (state) => ({
        caseScores: state.caseScores,
        guidedCompleted: state.guidedCompleted,
        reflectNotes: state.reflectNotes,
        campaign: state.campaign,
        profile: state.profile,
        variableMastery: state.variableMastery
      })
    }
  )
);
