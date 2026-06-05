"use client";

import { useEffect, useRef } from "react";
import type { CellType, CellFormat } from "@/content/problems/types";
import NumberBadge from "./NumberBadge";

interface WorksheetCellProps {
  type: CellType;
  value?: number;
  blueValue?: number;
  userValue?: number;
  graded?: boolean;
  correct?: boolean;
  isActive?: boolean;
  isRefColumn?: boolean;
  format?: CellFormat;
  /** 노란 셀 문항 번호 (①②…) — 셀 좌측에 표시. yellow 셀에만 전달된다. */
  number?: number;
  /** active yellow 셀에서 부모가 소유하는 입력 수식 텍스트. */
  draft?: string;
  onDraftChange?: (v: string) => void;
  /** Enter / blur 시 draft 평가 후 확정. */
  onCommit?: () => void;
  /** 셀 클릭 — yellow: 입력 대상 전환, purple/blue: active 셀 수식에 값 추가. */
  onCellClick?: () => void;
}

const cellStyles: Record<CellType, string> = {
  yellow: "bg-[hsl(var(--warn)/0.10)] border-[hsl(var(--warn)/0.35)]",
  blue: "bg-[hsl(123_46%_34%/0.07)] border-[hsl(123_46%_34%/0.25)]",
  purple: "bg-[hsl(var(--accent)/0.06)] border-[hsl(var(--accent)/0.18)]",
  label: ""
};

/** 표기 단위 적용. percent = ×100 + "%", dollar = "$" + value, number = raw. 1 decimal. */
function fmt(n: number, format?: CellFormat): string {
  if (format === "percent") return (n * 100).toFixed(1) + "%";
  if (format === "dollar") return "$" + n.toFixed(1);
  return n.toFixed(1);
}

export default function WorksheetCell({
  type,
  value,
  blueValue,
  userValue,
  graded,
  correct,
  isActive,
  isRefColumn,
  format,
  number,
  draft,
  onDraftChange,
  onCommit,
  onCellClick
}: WorksheetCellProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // active 가 되면 입력란 자동 포커스 + 전체 선택 (바로 키인 가능).
  useEffect(() => {
    if (isActive && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isActive]);

  if (type === "label") return null;

  const refBg = isRefColumn ? "bg-[hsl(var(--surface-200)/0.4)]" : "";

  // purple / blue — 참조 전용. 클릭하면 active 셀의 수식에 값이 더해진다.
  // onMouseDown preventDefault: active 입력란의 포커스를 빼앗지 않아 (blur 미발생)
  //   값 추가 후에도 키보드 입력을 이어서 할 수 있다.
  if (type === "purple" || type === "blue") {
    const display = type === "purple" ? value : blueValue;
    return (
      <td
        className={`border border-[hsl(var(--border))] px-3 py-2 text-right tabular-nums text-sm ${
          type === "purple" ? cellStyles.purple : cellStyles.blue
        } ${refBg} cursor-pointer transition-shadow hover:ring-2 hover:ring-[hsl(var(--accent)/0.35)]`}
        onMouseDown={(e) => e.preventDefault()}
        onClick={onCellClick}
      >
        {display !== undefined ? fmt(display, format) : "—"}
      </td>
    );
  }

  // yellow — 입력 셀. 좌측에 문항 번호(①…), 우측에 값/입력란.
  const gradeBorder = graded
    ? correct
      ? "ring-2 ring-[hsl(var(--success))]"
      : "ring-2 ring-[hsl(var(--danger))]"
    : "";

  // 활성 셀: 굵은 노란 ring + offset 으로 선택 상태를 또렷하게 표시.
  const activeRing = isActive
    ? "ring-4 ring-[hsl(var(--warn))] ring-offset-2 ring-offset-[hsl(var(--bg))] z-10"
    : "hover:ring-2 hover:ring-[hsl(var(--warn)/0.5)]";

  const unitSuffix = format === "percent" ? "%" : "";
  const unitPrefix = format === "dollar" ? "$" : "";

  return (
    <td
      data-test={userValue !== undefined ? "yellow-filled" : "yellow-empty"}
      className={`relative border border-[hsl(var(--border))] px-2 py-2 tabular-nums text-sm ${cellStyles.yellow} ${gradeBorder} ${activeRing} cursor-pointer select-none`}
      onClick={onCellClick}
    >
      <div className="flex items-center gap-1.5">
        {number !== undefined && <NumberBadge n={number} size="md" />}
        <div className="min-w-0 flex-1 text-right">
          {isActive ? (
            <div className="flex items-baseline justify-end gap-0.5">
              {unitPrefix && <span className="text-[hsl(var(--muted))]">{unitPrefix}</span>}
              <input
                ref={inputRef}
                type="text"
                inputMode="text"
                value={draft ?? ""}
                onChange={(e) => onDraftChange?.(e.target.value)}
                /* input 내부 클릭은 td 로 버블되지 않게 — 자기 자신을 참조 추가하지 않음. */
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onCommit?.();
                  }
                }}
                onBlur={() => onCommit?.()}
                placeholder="예: 6*25/29"
                aria-label="셀 값 입력 — 직접 입력하거나 다른 셀을 클릭해 값을 더하세요"
                className="w-full min-w-0 bg-transparent text-right font-medium tabular-nums text-[hsl(var(--fg))] placeholder:text-[hsl(var(--muted)/0.4)] outline-none cursor-text"
              />
              {unitSuffix && <span className="text-[hsl(var(--muted))]">{unitSuffix}</span>}
            </div>
          ) : userValue !== undefined ? (
            <span className="font-medium text-[hsl(var(--fg))]">{fmt(userValue, format)}</span>
          ) : (
            <span className="text-[hsl(var(--muted)/0.4)]">?</span>
          )}
        </div>
      </div>
      {graded && !correct && (
        <div className="text-right text-[11px] font-bold text-[hsl(var(--danger))]">X</div>
      )}
      {graded && correct && (
        <div className="text-right text-[11px] font-bold text-[hsl(var(--success))]">O</div>
      )}
    </td>
  );
}
