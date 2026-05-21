"use client";

import { useEffect, useRef, useState } from "react";
import type { CellType, CellFormat } from "@/content/problems/types";
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
  format?: CellFormat;
  onCellClick?: () => void;
  /** Yellow 셀 직접 입력. parseFormula 평가 결과만 호출 (계산기와 병행 사용 가능). */
  onAnswer?: (value: number) => void;
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

/** Yellow 입력값 표시. percent 는 % 환산 (사용자가 93.2 로 입력). */
function toInputText(n: number | undefined, format?: CellFormat): string {
  if (n === undefined) return "";
  if (format === "percent") return (n * 100).toFixed(1);
  return n.toFixed(1);
}

/** 입력 문자열을 저장 단위로 변환. percent 행은 ÷100 (사용자가 "%" 없이 93.2 입력했을 때). */
function fromInputText(raw: string, format?: CellFormat): number | null {
  const parsed = parseFormula(raw);
  if (parsed === null) return null;
  if (format === "percent") {
    // parseFormula 가 "93.2%" → 0.932 로 변환했으면 1 미만으로 들어옴 → 그대로 사용.
    // 사용자가 "%" 없이 93.2 만 입력했으면 → ÷100 으로 보정 (백분율 1 초과는 사실상 100% 넘는 수율 등 없음).
    if (raw.includes("%")) return parsed;
    return parsed / 100;
  }
  return parsed;
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
  format,
  onCellClick,
  onAnswer
}: WorksheetCellProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputVal, setInputVal] = useState(toInputText(userValue, format));

  useEffect(() => {
    setInputVal(toInputText(userValue, format));
  }, [userValue, format]);

  // Active 상태가 되면 직접 키인할 수 있도록 input 자동 포커스 + 전체 선택.
  useEffect(() => {
    if (isActive && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isActive]);

  function commitInput() {
    if (!onAnswer) return;
    const parsed = fromInputText(inputVal, format);
    if (parsed !== null && parsed !== userValue) {
      onAnswer(parsed);
    } else if (inputVal === "" && userValue !== undefined) {
      // 의도적 공백 — 우발적 손실 방지를 위해 그대로 유지 (리셋 버튼 사용 권장).
    } else if (parsed === null && userValue !== undefined) {
      // 파싱 실패 → 마지막 커밋 값으로 롤백.
      setInputVal(toInputText(userValue, format));
    }
  }

  if (type === "label") return null;

  const refBg = isRefColumn ? "bg-[hsl(var(--surface-200)/0.4)]" : "";
  const selectableCursor = isSelectable ? "cursor-pointer hover:ring-2 hover:ring-[hsl(var(--accent)/0.3)]" : "";

  if (type === "purple") {
    return (
      <td
        className={`border border-[hsl(var(--border))] px-3 py-2 text-right tabular-nums text-sm ${cellStyles.purple} ${refBg} ${selectableCursor}`}
        onClick={onCellClick}
      >
        {value !== undefined ? fmt(value, format) : "—"}
      </td>
    );
  }

  if (type === "blue") {
    return (
      <td
        className={`border border-[hsl(var(--border))] px-3 py-2 text-right tabular-nums text-sm ${cellStyles.blue} ${refBg} ${selectableCursor}`}
        onClick={onCellClick}
      >
        {blueValue !== undefined ? fmt(blueValue, format) : "—"}
      </td>
    );
  }

  // Yellow — input cell (계산기 + 직접 키인 병행)
  const gradeBorder = graded
    ? correct
      ? "ring-2 ring-[hsl(var(--success))]"
      : "ring-2 ring-[hsl(var(--danger))]"
    : "";

  // 활성 셀: 굵은 노란 ring + offset 으로 선택 상태를 또렷하게 표시.
  const activeRing = isActive
    ? "ring-4 ring-[hsl(var(--warn))] ring-offset-2 ring-offset-[hsl(var(--bg))] z-10"
    : "hover:ring-2 hover:ring-[hsl(var(--warn)/0.5)]";

  // percent 행은 input 우측에 % 기호 표시.
  const unitSuffix = format === "percent" ? "%" : "";
  const unitPrefix = format === "dollar" ? "$" : "";

  return (
    <td
      data-test={userValue !== undefined ? "yellow-filled" : "yellow-empty"}
      className={`relative border border-[hsl(var(--border))] px-3 py-2 text-right tabular-nums text-sm ${cellStyles.yellow} ${gradeBorder} ${activeRing} cursor-pointer select-none`}
      onClick={onCellClick}
    >
      {onAnswer ? (
        <div className="flex items-baseline justify-end gap-0.5">
          {unitPrefix && (
            <span className="text-[hsl(var(--muted))]">{unitPrefix}</span>
          )}
          <input
            ref={inputRef}
            type="text"
            inputMode="decimal"
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
            /* stopPropagation 안 함 — 클릭이 td 로 버블되어 계산기도 함께 열림. */
            placeholder="?"
            aria-label="셀 값 입력 (직접 키인 또는 계산기 사용)"
            className="min-w-0 flex-1 bg-transparent text-right font-medium tabular-nums text-[hsl(var(--fg))] placeholder:text-[hsl(var(--muted)/0.4)] outline-none cursor-text"
          />
          {unitSuffix && (
            <span className="text-[hsl(var(--muted))]">{unitSuffix}</span>
          )}
        </div>
      ) : userValue !== undefined ? (
        <span className="font-medium text-[hsl(var(--fg))]">{fmt(userValue, format)}</span>
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
