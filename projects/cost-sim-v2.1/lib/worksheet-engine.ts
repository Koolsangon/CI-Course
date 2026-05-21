import type { ProblemDef, RowDef, CellFormat } from "@/content/problems/types";
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
  // resolve: if cell is blue, compute recursively; otherwise read static/user value.
  // Avoids re-computing yellow user inputs or overwriting purple static values.
  const resolve = (rid: string): number | undefined => {
    const row = problem.rows.find((r) => r.id === rid);
    const cell = row?.cells[colId];
    if (cell?.type === "blue") {
      return computeBlue(problem, colId, rid, answers);
    }
    return get(rid);
  };

  switch (rowId) {
    case "yield_total": {
      const yt = get("yield_tft");
      const yc = get("yield_cf");
      const ycl = get("yield_cell");
      const ym = get("yield_module");
      if ([yt, yc, ycl, ym].some((v) => v === undefined)) return undefined;
      return yt! * yc! * ycl! * ym!;
    }
    case "bom_total": {
      const bt = get("bom_tft");
      const bc = get("bom_cf");
      const bcl = get("bom_cell");
      const bm = get("bom_module");
      if ([bt, bc, bcl, bm].some((v) => v === undefined)) return undefined;
      return bt! + bc! + bcl! + bm!;
    }
    case "material_cost": {
      const bt = get("bom_tft");
      const bc = get("bom_cf");
      const bcl = get("bom_cell");
      const bm = get("bom_module");
      const yt = get("yield_tft");
      const yc = get("yield_cf");
      const ycl = get("yield_cell");
      const ym = get("yield_module");
      if ([bt, bc, bcl, bm, yt, yc, ycl, ym].some((v) => v === undefined)) return undefined;
      const s1 = bt! / yt!;
      const s2 = (s1 + bc!) / yc!;
      const s3 = (s2 + bcl!) / ycl!;
      const s4 = (s3 + bm!) / ym!;
      return s4;
    }
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
      const mat = resolve("material_cost");
      const proc = resolve("processing_cost");
      if (mat === undefined || proc === undefined) return undefined;
      return mat + proc;
    }
    case "sga": {
      const dd = get("sga_direct_dev");
      const tr = get("sga_transport");
      const bu = get("sga_business_unit");
      const op = get("sga_operation");
      const co = get("sga_corporate_oh");
      if ([dd, tr, bu, op, co].some((v) => v === undefined)) return undefined;
      return dd! + tr! + bu! + op! + co!;
    }
    case "cop": {
      const com = resolve("com");
      const sga = resolve("sga");
      if (com === undefined || sga === undefined) return undefined;
      return com + sga;
    }
    case "operating_profit": {
      const price = get("price");
      const cop = resolve("cop");
      if (price === undefined || cop === undefined) return undefined;
      return price - cop;
    }
    case "operating_profit_rate": {
      const profit = resolve("operating_profit");
      const price = get("price");
      if (profit === undefined || price === undefined || price === 0) return undefined;
      return profit / price;
    }
    default:
      return undefined;
  }
}

// 표기 단위에 맞춘 채점 정밀도.
//   percent (수율 / 이익률): 1 decimal of % = 3 decimals of decimal (e.g., 0.932 → 93.2%)
//   dollar  (비용): 1 decimal of $ (e.g., 29.82 → $29.8)
//   number  (기타): 1 decimal
function roundForGrade(n: number, format?: CellFormat): number {
  if (format === "percent") return Math.round(n * 1000) / 1000;
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
      const rounded = roundForGrade(userVal, row.format);
      const expected = roundForGrade(cell.answer, row.format);
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
