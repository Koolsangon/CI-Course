import type { ProblemDef, RowDef, CellDef } from "@/content/problems/types";

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
