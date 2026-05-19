"use client";

import { useEffect, useState } from "react";
import type { CellType } from "@/content/problems/types";
import { parseFormula } from "@/lib/formula-parser";

interface WorksheetCellProps {
  type: CellType;
  value?: number;
  blueValue?: number;
  userValue?: number;
  graded?: boolean;
  correct?: boolean;
  expected?: number;
  isActive?: boolean;
  isSelectable?: boolean;
  isRefColumn?: boolean;
  onCellClick?: () => void;
  /** Yellow cell direct keyboard input. parseFormula 로 평가된 결과만 호출됨. */
  onAnswer?: (value: number) => void;
}

const cellStyles: Record<CellType, string> = {
  yellow: "bg-[hsl(var(--warn)/0.10)] border-[hsl(var(--warn)/0.35)]",
  blue: "bg-[hsl(123_46%_34%/0.07)] border-[hsl(123_46%_34%/0.25)]",
  purple: "bg-[hsl(var(--accent)/0.06)] border-[hsl(var(--accent)/0.18)]",
  label: ""
};

function fmt(n: number): string {
  return n.toFixed(2);
}

export default function WorksheetCell({
  type,
  value,
  blueValue,
  userValue,
  graded,
  correct,
  expected,
  isActive,
  isSelectable,
  isRefColumn,
  onCellClick,
  onAnswer
}: WorksheetCellProps) {
  const [inputVal, setInputVal] = useState(
    userValue !== undefined ? userValue.toFixed(2) : ""
  );

  useEffect(() => {
    setInputVal(userValue !== undefined ? userValue.toFixed(2) : "");
  }, [userValue]);

  function commitInput() {
    if (!onAnswer) return;
    const parsed = parseFormula(inputVal);
    if (parsed !== null && parsed !== userValue) {
      onAnswer(parsed);
    } else if (inputVal === "" && userValue !== undefined) {
      // Intentional blank — leave as-is to avoid accidental data loss (use handleReset).
    } else if (parsed === null && userValue !== undefined) {
      // Failed parse — revert to last committed value.
      setInputVal(userValue.toFixed(2));
    }
  }

  if (type === "label") return null;

  const refBg = isRefColumn ? "bg-[hsl(var(--surface-200)/0.4)]" : "";
  const selectableCursor = isSelectable ? "cursor-pointer hover:ring-2 hover:ring-[hsl(var(--accent)/0.3)]" : "";
  const activeRing = isActive ? "ring-2 ring-[hsl(var(--warn))]" : "";

  if (type === "purple") {
    return (
      <td
        className={`border border-[hsl(var(--border))] px-3 py-2 text-right tabular-nums text-sm ${cellStyles.purple} ${refBg} ${selectableCursor}`}
        onClick={onCellClick}
      >
        {value !== undefined ? fmt(value) : "—"}
      </td>
    );
  }

  if (type === "blue") {
    return (
      <td
        className={`border border-[hsl(var(--border))] px-3 py-2 text-right tabular-nums text-sm ${cellStyles.blue} ${refBg} ${selectableCursor}`}
        onClick={onCellClick}
      >
        {blueValue !== undefined ? fmt(blueValue) : "—"}
      </td>
    );
  }

  // Yellow — input cell
  const gradeBorder = graded
    ? correct
      ? "ring-2 ring-[hsl(var(--success))]"
      : "ring-2 ring-[hsl(var(--danger))]"
    : "";

  return (
    <td
      data-test={userValue !== undefined ? "yellow-filled" : "yellow-empty"}
      className={`relative border border-[hsl(var(--border))] px-3 py-2 text-right tabular-nums text-sm ${cellStyles.yellow} ${gradeBorder} ${activeRing} cursor-pointer select-none`}
      onClick={onCellClick}
    >
      {onAnswer ? (
        <input
          type="text"
          inputMode="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitInput();
              (e.target as HTMLInputElement).blur();
            }
          }}
          onBlur={commitInput}
          onClick={(e) => e.stopPropagation()}
          placeholder="?"
          aria-label="셀 값 입력 (수식 가능, 예: 21.3*70%)"
          className="w-full bg-transparent text-right font-medium tabular-nums text-[hsl(var(--fg))] placeholder:text-[hsl(var(--muted)/0.4)] outline-none focus:ring-1 focus:ring-[hsl(var(--accent)/0.5)] rounded"
        />
      ) : userValue !== undefined ? (
        <span className="font-medium text-[hsl(var(--fg))]">{fmt(userValue)}</span>
      ) : (
        <span className="text-[hsl(var(--muted)/0.4)]">?</span>
      )}
      {graded && !correct && (
        <div className="text-[11px] font-bold text-[hsl(var(--danger))]">X</div>
      )}
      {graded && correct && (
        <div className="text-[11px] font-bold text-[hsl(var(--success))]">O</div>
      )}
    </td>
  );
}
