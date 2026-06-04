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
  /** CostTree 강조용 — 직전 params 대비 변동된 bom/yield 노드 id (절대 비교가 아니라 누적 방지). */
  lastParamDelta: string[];
  /** Current slider values for the active case (used by inspector / tree-info card). */
  sliderValues: Record<string, number>;

  /** Worksheet answers: problemId -> columnId -> cellId -> user input value */
  worksheetAnswers: Record<string, Record<string, Record<string, number>>>;
  /** Worksheet grading results per problem */
  worksheetGrades: Record<string, WorksheetResult>;

  setMode: (mode: Mode) => void;
  loadCase: (caseId: string, params: CostParams) => void;
  setParams: (next: CostParams | ((prev: CostParams) => CostParams)) => void;
  setSliderValues: (values: Record<string, number>) => void;
  resetCase: () => void;
  /** lastDelta 만 비움 — params/result 는 유지. 변수 기본값 복귀 시 CostTree 강조 제거용. */
  clearDelta: () => void;

  setWorksheetAnswer: (problemId: string, columnId: string, cellId: string, value: number) => void;
  gradeWorksheet: (problemId: string, grades: WorksheetResult) => void;
  resetWorksheet: (problemId: string) => void;

  /** 강사 설정 — 힌트 차감 (false 시 모든 정답 100% 배점). */
  hintPenaltyEnabled: boolean;
  setHintPenaltyEnabled: (enabled: boolean) => void;

  /** 문제별 힌트 레벨 저장 — 뒤로갔다 재진입해도 차감 유지. */
  hintLevels: Record<string, 0 | 1 | 2 | 3>;
  setHintLevel: (problemId: string, level: 0 | 1 | 2 | 3) => void;
  getHintLevel: (problemId: string) => 0 | 1 | 2 | 3;
  resetHintLevel: (problemId: string) => void;
}

/**
 * CostTree 강조용 — 직전 params 대비 변동된 bom/yield 노드 id.
 * diff() 는 CostResult 만 보므로 params.bom / yields.module 변동은 여기서 직접 비교한다.
 * 절대(reference) 비교가 아닌 *직전 대비* 라서, 다른 슬라이더를 움직이면 이전 파라미터의
 * 강조가 누적되지 않고 해제된다 (예: Mask 변경 후 Tact 를 움직이면 BOM TFT 강조 해제).
 */
function paramNodeDelta(prev: CostParams, next: CostParams): string[] {
  const out: string[] = [];
  const eps = 1e-6;
  if (Math.abs(prev.bom.tft - next.bom.tft) > eps) out.push("bom_tft");
  if (Math.abs(prev.bom.cf - next.bom.cf) > eps) out.push("bom_cf");
  if (Math.abs(prev.bom.cell - next.bom.cell) > eps) out.push("bom_cell");
  if (Math.abs(prev.bom.module - next.bom.module) > eps) out.push("bom_module");
  if (Math.abs(prev.yields.module - next.yields.module) > eps) out.push("material");
  return out;
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
  lastParamDelta: [],
  sliderValues: {},

  worksheetAnswers: {},
  worksheetGrades: {},
  hintPenaltyEnabled: true,
  hintLevels: {} as Record<string, 0 | 1 | 2 | 3>,

  setMode: (mode) => set({ mode }),
  setHintPenaltyEnabled: (enabled) => set({ hintPenaltyEnabled: enabled }),

  setHintLevel: (problemId, level) => {
    const { hintLevels } = get();
    set({ hintLevels: { ...hintLevels, [problemId]: level } });
  },

  getHintLevel: (problemId) => {
    return get().hintLevels[problemId] ?? 0;
  },

  resetHintLevel: (problemId) => {
    const { hintLevels } = get();
    const next = { ...hintLevels };
    delete next[problemId];
    set({ hintLevels: next });
  },

  loadCase: (caseId, params) => {
    const current = get().caseId;
    if (current === caseId) return;
    const next = cloneParams(params);
    set({
      caseId,
      params: next,
      result: calculate(next),
      lastDelta: [],
      lastParamDelta: [],
      sliderValues: {}
    });
  },

  setSliderValues: (values) => set({ sliderValues: values }),

  setParams: (next) => {
    const prevResult = get().result;
    const prevParams = get().params;
    const nextParams =
      typeof next === "function" ? next(get().params) : cloneParams(next);
    const nextResult = calculate(nextParams);
    set({
      params: nextParams,
      result: nextResult,
      lastDelta: diff(prevResult, nextResult),
      lastParamDelta: paramNodeDelta(prevParams, nextParams)
    });
  },

  resetCase: () => {
    const caseId = get().caseId;
    const preset = caseId ? ALL_REFERENCES[Number(caseId[0]) as 1 | 2 | 3 | 4 | 5 | 6] : DEFAULT_PARAMS;
    const p = cloneParams(preset);
    set({ params: p, result: calculate(p), lastDelta: [], lastParamDelta: [] });
  },

  clearDelta: () => set({ lastDelta: [], lastParamDelta: [] }),

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
      version: 2,
      partialize: (state) => ({
        worksheetAnswers: state.worksheetAnswers,
        worksheetGrades: state.worksheetGrades,
        hintPenaltyEnabled: state.hintPenaltyEnabled,
        hintLevels: state.hintLevels
      })
    }
  )
);
