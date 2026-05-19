import type { ProblemDef, RowDef } from "@/content/problems/types";
import type { CaseDef, CaseHints } from "./cases";

export type { CaseHints };

type CellValues = Record<string, Record<string, number>>;

function getCellValue(
  rows: RowDef[],
  colId: string,
  rowId: string,
  answers: CellValues
): number | undefined {
  const userVal = answers[colId]?.[rowId];
  if (userVal !== undefined) return userVal;
  const row = rows.find((r) => r.id === rowId);
  if (!row) return undefined;
  const cell = row.cells[colId];
  if (!cell) return undefined;
  if (cell.type === "purple" && cell.value !== undefined) return cell.value;
  return undefined;
}

export function computeBlue(
  problem: ProblemDef,
  colId: string,
  rowId: string,
  answers: CellValues
): number | undefined {
  const get = (rid: string) => getCellValue(problem.rows, colId, rid, answers);

  switch (rowId) {
    case "processing_cost": {
      const pl = get("panel_labor");
      const pe = get("panel_expense");
      const pd = get("panel_depreciation");
      const ml = get("module_labor");
      const me = get("module_expense");
      const md = get("module_depreciation");
      if ([pl, pe, pd, ml, me, md].some((v) => v === undefined)) return undefined;
      return pl! + pe! + pd! + ml! + me! + md!;
    }
    case "com": {
      const mat = get("material_cost");
      const proc = computeBlue(problem, colId, "processing_cost", answers) ?? get("processing_cost");
      if (mat === undefined || proc === undefined) return undefined;
      return mat + proc;
    }
    case "cop": {
      const com = computeBlue(problem, colId, "com", answers) ?? get("com");
      const sga = get("sga");
      if (com === undefined || sga === undefined) return undefined;
      return com + sga;
    }
    case "operating_profit": {
      const price = get("price");
      const cop = computeBlue(problem, colId, "cop", answers) ?? get("cop");
      if (price === undefined || cop === undefined) return undefined;
      return price - cop;
    }
    default:
      return undefined;
  }
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export interface GradeResult {
  cellId: string;
  rowId: string;
  colId: string;
  correct: boolean;
  userAnswer: number;
  expected: number;
}

export function gradeYellowCells(
  problem: ProblemDef,
  answers: CellValues
): { grades: GradeResult[]; score: number; total: number } {
  const grades: GradeResult[] = [];

  for (const row of problem.rows) {
    for (const col of problem.columns) {
      const cell = row.cells[col.id];
      if (!cell || cell.type !== "yellow" || cell.answer === undefined) continue;
      const userVal = answers[col.id]?.[row.id];
      if (userVal === undefined) {
        grades.push({
          cellId: cell.id,
          rowId: row.id,
          colId: col.id,
          correct: false,
          userAnswer: 0,
          expected: cell.answer
        });
        continue;
      }
      const rounded = round1(userVal);
      const expected = round1(cell.answer);
      const correct = rounded === expected;
      grades.push({
        cellId: cell.id,
        rowId: row.id,
        colId: col.id,
        correct,
        userAnswer: rounded,
        expected
      });
    }
  }

  const score = grades.filter((g) => g.correct).length;
  return { grades, score, total: grades.length };
}

export function getYellowCount(problem: ProblemDef): number {
  let count = 0;
  for (const row of problem.rows) {
    for (const col of problem.columns) {
      const cell = row.cells[col.id];
      if (cell?.type === "yellow") count++;
    }
  }
  return count;
}

// Hint penalty — index = highest hint level revealed for the cell.
//   level 0: no hint used → full credit (1.0)
//   level 1: first (conceptual) hint → 70%
//   level 2: mechanism hint → 40%
//   level 3: formula hint → 20%
// Wrong answers always score 0 regardless of hints used.
export const HINT_PENALTY = [1.0, 0.7, 0.4, 0.2] as const;
export type HintLevel = 0 | 1 | 2 | 3;

export interface WeightedScore {
  rawScore: number;          // count of correct cells (integer)
  weightedScore: number;     // sum of HINT_PENALTY[level] over correct cells
  total: number;             // total yellow cells
  hintPenalty: number;       // rawScore − weightedScore (>= 0)
}

/**
 * Hint resolver — case 레벨 단일 lookup.
 *
 *   1. caseDef.phases.apply.hints  (케이스 전체 단일 3-level 세트)
 *   2. caseDef.phases.apply.hint   (legacy 단일 문자열 → 3 레벨 모두에 동일 텍스트로 fallback)
 *
 * 정의된 값이 하나도 없으면 placeholder 문자열로 채워 모달이 깨지지 않게 한다.
 */
export function resolveHints(caseDef: CaseDef | undefined): CaseHints {
  if (caseDef?.phases.apply.hints) return caseDef.phases.apply.hints;

  const fallback =
    caseDef?.phases.apply.hint ??
    "이 셀의 힌트가 아직 등록되지 않았습니다.";
  return { l1: fallback, l2: fallback, l3: fallback };
}

/**
 * 문제 단위 hint level + 강사 토글 (hintPenaltyEnabled) 을 받아 가중 점수 계산.
 *
 *   - 모든 정답 셀에 같은 hintLevel 적용 (S6 — 문제 단위 힌트)
 *   - hintPenaltyEnabled=false 시 차감 없음 (모든 정답 100% 배점)
 */
export function computeWeightedScore(
  grades: GradeResult[],
  hintLevel: HintLevel,
  hintPenaltyEnabled: boolean = true
): WeightedScore {
  const penalty = hintPenaltyEnabled ? HINT_PENALTY[hintLevel] : 1.0;
  let raw = 0;
  let weighted = 0;
  for (const g of grades) {
    if (!g.correct) continue;
    raw += 1;
    weighted += penalty;
  }
  const weightedRounded = Math.round(weighted * 10) / 10;
  return {
    rawScore: raw,
    weightedScore: weightedRounded,
    total: grades.length,
    hintPenalty: Math.round((raw - weightedRounded) * 10) / 10
  };
}
