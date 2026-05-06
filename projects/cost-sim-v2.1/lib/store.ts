"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { calculate } from "./cost-engine/engine";
import type { CostParams, CostResult } from "./cost-engine/types";
import { diff, type DeltaTrace } from "./cost-engine/diff";
import { cloneParams, ALL_REFERENCES } from "./cost-engine/presets";
import type { CoachMessage } from "./coach/types";

export type Mode = "sandbox" | "worksheet";

/** Per-cell grade result after worksheet grading. */
export interface CellGrade {
  correct: boolean;
  userAnswer: number;
  expected: number;
}

export interface WorksheetResult {
  /** problemId -> columnId -> cellId -> grade */
  grades: Record<string, Record<string, Record<string, CellGrade>>>;
  score: number;
  total: number;
}

export interface StoreState {
  mode: Mode;
  caseId: string | null;
  params: CostParams;
  result: CostResult;
  lastDelta: DeltaTrace[];
  /** Current slider values for the active case (used by inspector / tree-info card). */
  sliderValues: Record<string, number>;

  /** Worksheet answers: problemId -> columnId -> cellId -> user input value */
  worksheetAnswers: Record<string, Record<string, Record<string, number>>>;
  /** Worksheet grading results per problem */
  worksheetGrades: Record<string, WorksheetResult>;

  /** Coach chat conversations: problemId -> messages */
  coachConversations: Record<string, CoachMessage[]>;

  setMode: (mode: Mode) => void;
  loadCase: (caseId: string, params: CostParams) => void;
  setParams: (next: CostParams | ((prev: CostParams) => CostParams)) => void;
  setSliderValues: (values: Record<string, number>) => void;
  resetCase: () => void;

  setWorksheetAnswer: (problemId: string, columnId: string, cellId: string, value: number) => void;
  gradeWorksheet: (problemId: string, grades: WorksheetResult) => void;
  resetWorksheet: (problemId: string) => void;

  appendCoachMessage: (problemId: string, message: CoachMessage) => void;
  updateCoachMessage: (problemId: string, messageId: string, updater: (prev: string) => string) => void;
  seedCoachConversation: (problemId: string, message: CoachMessage) => void;
  clearCoachConversation: (problemId: string) => void;
}

const DEFAULT_PARAMS = cloneParams(ALL_REFERENCES[1]);

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
  mode: "sandbox",
  caseId: null,
  params: DEFAULT_PARAMS,
  result: calculate(DEFAULT_PARAMS),
  lastDelta: [],
  sliderValues: {},

  worksheetAnswers: {},
  worksheetGrades: {},
  coachConversations: {},

  setMode: (mode) => set({ mode }),

  loadCase: (caseId, params) => {
    const current = get().caseId;
    if (current === caseId) return;
    const next = cloneParams(params);
    set({
      caseId,
      params: next,
      result: calculate(next),
      lastDelta: [],
      sliderValues: {}
    });
  },

  setSliderValues: (values) => set({ sliderValues: values }),

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

  setWorksheetAnswer: (problemId, columnId, cellId, value) => {
    const { worksheetAnswers } = get();
    const problemAnswers = { ...worksheetAnswers[problemId] };
    const colAnswers = { ...(problemAnswers[columnId] ?? {}) };
    colAnswers[cellId] = value;
    problemAnswers[columnId] = colAnswers;
    set({ worksheetAnswers: { ...worksheetAnswers, [problemId]: problemAnswers } });
  },

  gradeWorksheet: (problemId, grades) => {
    const { worksheetGrades } = get();
    set({ worksheetGrades: { ...worksheetGrades, [problemId]: grades } });
  },

  resetWorksheet: (problemId) => {
    const { worksheetAnswers, worksheetGrades } = get();
    const nextAnswers = { ...worksheetAnswers };
    delete nextAnswers[problemId];
    const nextGrades = { ...worksheetGrades };
    delete nextGrades[problemId];
    set({ worksheetAnswers: nextAnswers, worksheetGrades: nextGrades });
  },

  appendCoachMessage: (problemId, message) => {
    const { coachConversations } = get();
    const existing = coachConversations[problemId] ?? [];
    set({
      coachConversations: {
        ...coachConversations,
        [problemId]: [...existing, message]
      }
    });
  },

  updateCoachMessage: (problemId, messageId, updater) => {
    const { coachConversations } = get();
    const existing = coachConversations[problemId] ?? [];
    const next = existing.map((m) =>
      m.id === messageId ? { ...m, content: updater(m.content) } : m
    );
    set({
      coachConversations: { ...coachConversations, [problemId]: next }
    });
  },

  seedCoachConversation: (problemId, message) => {
    const { coachConversations } = get();
    if ((coachConversations[problemId] ?? []).length > 0) return;
    set({
      coachConversations: {
        ...coachConversations,
        [problemId]: [message]
      }
    });
  },

  clearCoachConversation: (problemId) => {
    const { coachConversations } = get();
    const next = { ...coachConversations };
    delete next[problemId];
    set({ coachConversations: next });
  }
    }),
    {
      name: "cost-sim-v2.1:state:v1",
      storage: createJSONStorage(() => localStorage),
      version: 2,
      partialize: (state) => ({
        worksheetAnswers: state.worksheetAnswers,
        worksheetGrades: state.worksheetGrades,
        coachConversations: state.coachConversations
      })
    }
  )
);
