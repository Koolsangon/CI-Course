"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { calculate } from "./cost-engine/engine";
import type { CostParams, CostResult } from "./cost-engine/types";
import { diff, type DeltaTrace } from "./cost-engine/diff";
import { cloneParams, ALL_REFERENCES } from "./cost-engine/presets";

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

  /** Worksheet answers: problemId -> columnId -> cellId -> user input value */
  worksheetAnswers: Record<string, Record<string, Record<string, number>>>;
  /** Worksheet grading results per problem */
  worksheetGrades: Record<string, WorksheetResult>;

  setMode: (mode: Mode) => void;
  loadCase: (caseId: string, params: CostParams) => void;
  setParams: (next: CostParams | ((prev: CostParams) => CostParams)) => void;
  resetCase: () => void;

  setWorksheetAnswer: (problemId: string, columnId: string, cellId: string, value: number) => void;
  gradeWorksheet: (problemId: string, grades: WorksheetResult) => void;
  resetWorksheet: (problemId: string) => void;
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

  worksheetAnswers: {},
  worksheetGrades: {},

  setMode: (mode) => set({ mode }),

  loadCase: (caseId, params) => {
    const current = get().caseId;
    if (current === caseId) return;
    const next = cloneParams(params);
    set({
      caseId,
      params: next,
      result: calculate(next),
      lastDelta: []
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
  }
    }),
    {
      name: "cost-sim-v2.1:state:v1",
      storage: createJSONStorage(() => localStorage),
      version: 1,
      partialize: (state) => ({
        worksheetAnswers: state.worksheetAnswers,
        worksheetGrades: state.worksheetGrades
      })
    }
  )
);
