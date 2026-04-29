"use client";

import type { ProblemDef } from "@/content/problems/types";
import type { GradeResult } from "@/lib/worksheet-engine";
import { computeBlue } from "@/lib/worksheet-engine";
import WorksheetCell from "./WorksheetCell";

interface WorksheetTableProps {
  problem: ProblemDef;
  answers: Record<string, Record<string, number>>;
  grades: GradeResult[] | null;
  activeCell: { colId: string; rowId: string } | null;
  calculatorMode: boolean;
  onAnswer: (colId: string, rowId: string, value: number) => void;
  onCellClick: (colId: string, rowId: string, value: number | undefined, label: string, type: string) => void;
}

function getCellDisplayValue(
  problem: ProblemDef,
  colId: string,
  rowId: string,
  answers: Record<string, Record<string, number>>
): number | undefined {
  const row = problem.rows.find((r) => r.id === rowId);
  if (!row) return undefined;
  const cell = row.cells[colId];
  if (!cell) return undefined;
  if (cell.type === "purple") return cell.value;
  if (cell.type === "blue") return computeBlue(problem, colId, rowId, answers);
  // yellow: check user answer
  return answers[colId]?.[rowId];
}

export default function WorksheetTable({
  problem,
  answers,
  grades,
  activeCell,
  calculatorMode,
  onAnswer,
  onCellClick
}: WorksheetTableProps) {
  const findGrade = (rowId: string, colId: string) =>
    grades?.find((g) => g.rowId === rowId && g.colId === colId);

  return (
    <div className="overflow-x-auto rounded-2xl border border-[hsl(var(--border))] shadow-card">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-[hsl(var(--surface-200)/0.7)]">
            <th className="border border-[hsl(var(--border))] px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted))]">
              항목
            </th>
            {problem.columns.map((col) => {
              const isRef = col.id === "ref";
              return (
                <th
                  key={col.id}
                  className={[
                    "border border-[hsl(var(--border))] px-4 py-2 text-center min-w-[120px]",
                    isRef ? "bg-[hsl(var(--surface-300)/0.4)]" : ""
                  ].join(" ")}
                >
                  <div className="text-xs font-bold text-[hsl(var(--fg))]">{col.header}</div>
                  {col.subheader && (
                    <div className="text-[10px] font-normal text-[hsl(var(--muted))]">{col.subheader}</div>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {problem.rows.map((row) => (
            <tr
              key={row.id}
              className={row.isSummary ? "bg-[hsl(var(--surface-200)/0.2)] font-semibold" : ""}
            >
              <td
                className="border border-[hsl(var(--border))] px-4 py-2 text-[hsl(var(--fg)/0.9)] whitespace-nowrap"
                style={{ paddingLeft: `${(row.indent ?? 0) * 16 + 16}px` }}
              >
                {row.label}
              </td>
              {problem.columns.map((col) => {
                const cell = row.cells[col.id];
                if (!cell) {
                  return <td key={col.id} className="border border-[hsl(var(--border))] px-3 py-2" />;
                }

                const grade = findGrade(row.id, col.id);
                const blueValue = cell.type === "blue"
                  ? computeBlue(problem, col.id, row.id, answers)
                  : undefined;
                const isRef = col.id === "ref";
                const isActive = activeCell?.colId === col.id && activeCell?.rowId === row.id;
                const isSelectable = calculatorMode && !isActive;

                const displayValue = getCellDisplayValue(problem, col.id, row.id, answers);

                return (
                  <WorksheetCell
                    key={col.id}
                    type={cell.type}
                    value={cell.value}
                    blueValue={blueValue}
                    userValue={cell.type === "yellow" ? answers[col.id]?.[row.id] : undefined}
                    graded={!!grade}
                    correct={grade?.correct}
                    expected={grade?.expected}
                    isActive={isActive}
                    isSelectable={isSelectable}
                    isRefColumn={isRef}
                    onCellClick={() => onCellClick(col.id, row.id, displayValue, row.label, cell.type)}
                  />
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
