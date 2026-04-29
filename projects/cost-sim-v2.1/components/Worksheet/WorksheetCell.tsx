"use client";

import type { CellType } from "@/content/problems/types";

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
  onCellClick
}: WorksheetCellProps) {
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
      className={`border border-[hsl(var(--border))] px-3 py-2 text-right tabular-nums text-sm ${cellStyles.yellow} ${gradeBorder} ${activeRing} cursor-pointer select-none`}
      onClick={onCellClick}
    >
      {userValue !== undefined ? (
        <span className="font-medium text-[hsl(var(--fg))]">{fmt(userValue)}</span>
      ) : (
        <span className="text-[hsl(var(--muted)/0.4)]">?</span>
      )}
      {graded && !correct && expected !== undefined && (
        <div className="text-[10px] text-[hsl(var(--danger))]">
          정답: {fmt(expected)}
        </div>
      )}
      {graded && correct && (
        <div className="text-[10px] text-[hsl(var(--success))]">O</div>
      )}
    </td>
  );
}
