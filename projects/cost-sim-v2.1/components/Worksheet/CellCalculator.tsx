"use client";

import { useState } from "react";
import { Calculator, X, Delete } from "lucide-react";
import Button from "@/components/ui/Button";

export interface FormulaToken {
  type: "value" | "op" | "paren";
  value: number | string;
  label?: string;
}

interface CellCalculatorProps {
  targetLabel: string;
  tokens: FormulaToken[];
  onAddOp: (op: string) => void;
  onAddParen: (p: string) => void;
  onAddNumber: (n: number) => void;
  onDeleteLast: () => void;
  onClear: () => void;
  onCalculate: () => void;
  onClose: () => void;
}

function renderToken(t: FormulaToken, i: number) {
  if (t.type === "value") {
    return (
      <span
        key={i}
        className="inline-flex items-center gap-0.5 rounded-md bg-[hsl(var(--accent)/0.1)] px-1.5 py-0.5 text-xs font-medium text-[hsl(var(--accent))]"
      >
        {t.label && <span className="text-[10px] text-[hsl(var(--muted))]">{t.label}:</span>}
        <span className="tabular-nums">{typeof t.value === "number" ? t.value.toFixed(2) : t.value}</span>
      </span>
    );
  }
  if (t.type === "op") {
    const opDisplay: Record<string, string> = { "+": "+", "-": "−", "*": "×", "/": "÷" };
    return (
      <span key={i} className="inline-block px-1 text-sm font-bold text-[hsl(var(--fg)/0.7)]">
        {opDisplay[t.value as string] ?? t.value}
      </span>
    );
  }
  return (
    <span key={i} className="inline-block px-0.5 text-sm font-bold text-[hsl(var(--fg)/0.5)]">
      {t.value as string}
    </span>
  );
}

export function evaluateTokens(tokens: FormulaToken[]): number | null {
  if (tokens.length === 0) return null;
  const expr = tokens
    .map((t) => {
      if (t.type === "value") return String(t.value);
      if (t.type === "op") return t.value as string;
      return t.value as string;
    })
    .join(" ");

  try {
    const result = safeEval(expr);
    if (!isFinite(result)) return null;
    return Math.round(result * 100) / 100;
  } catch {
    return null;
  }
}

function safeEval(expr: string): number {
  const tokens = tokenize(expr);
  const { result } = parseExpression(tokens, 0);
  return result;
}

function tokenize(expr: string): string[] {
  return expr.match(/(\d+\.?\d*|[+\-*/()])/g) ?? [];
}

function parseExpression(tokens: string[], pos: number): { result: number; pos: number } {
  let { result, pos: p } = parseTerm(tokens, pos);
  while (p < tokens.length && (tokens[p] === "+" || tokens[p] === "-")) {
    const op = tokens[p]!;
    p++;
    const right = parseTerm(tokens, p);
    p = right.pos;
    result = op === "+" ? result + right.result : result - right.result;
  }
  return { result, pos: p };
}

function parseTerm(tokens: string[], pos: number): { result: number; pos: number } {
  let { result, pos: p } = parseFactor(tokens, pos);
  while (p < tokens.length && (tokens[p] === "*" || tokens[p] === "/")) {
    const op = tokens[p]!;
    p++;
    const right = parseFactor(tokens, p);
    p = right.pos;
    result = op === "*" ? result * right.result : result / right.result;
  }
  return { result, pos: p };
}

function parseFactor(tokens: string[], pos: number): { result: number; pos: number } {
  if (tokens[pos] === "(") {
    const inner = parseExpression(tokens, pos + 1);
    return { result: inner.result, pos: inner.pos + 1 };
  }
  return { result: parseFloat(tokens[pos] ?? "0"), pos: pos + 1 };
}

export default function CellCalculator({
  targetLabel,
  tokens,
  onAddOp,
  onAddParen,
  onAddNumber,
  onDeleteLast,
  onClear,
  onCalculate,
  onClose
}: CellCalculatorProps) {
  const preview = evaluateTokens(tokens);
  const [numInput, setNumInput] = useState("");

  function handleNumSubmit() {
    const v = parseFloat(numInput);
    if (!isNaN(v)) {
      onAddNumber(v);
      setNumInput("");
    }
  }

  return (
    <div className="rounded-2xl border border-[hsl(var(--warn)/0.4)] bg-[hsl(var(--surface-100))] shadow-elevated overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[hsl(var(--border))] bg-[hsl(var(--surface-200)/0.5)] px-4 py-2.5">
        <Calculator className="h-3.5 w-3.5 text-[hsl(var(--warn))]" />
        <span className="text-xs font-bold text-[hsl(var(--fg))]">
          {targetLabel} 계산하기
        </span>
        <button
          onClick={onClose}
          className="ml-auto flex h-6 w-6 items-center justify-center rounded-lg text-[hsl(var(--muted))] hover:bg-[hsl(var(--surface-300)/0.5)] hover:text-[hsl(var(--fg))]"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Guide — shown only when no tokens yet */}
      {tokens.length === 0 && (
        <div className="flex flex-col gap-1.5 px-4 py-3 border-b border-[hsl(var(--border)/0.5)] bg-[hsl(var(--warn)/0.04)]">
          <p className="text-xs font-semibold text-[hsl(var(--fg)/0.8)]">사용 방법</p>
          <ol className="flex flex-col gap-1 text-[11px] text-[hsl(var(--muted))] list-decimal list-inside">
            <li><span className="font-medium text-[hsl(var(--fg)/0.7)]">위 테이블에서 참조할 셀을 클릭</span>하면 해당 값이 수식에 추가됩니다</li>
            <li>또는 아래 입력란에 <span className="font-medium text-[hsl(var(--fg)/0.7)]">숫자를 직접 입력</span>하고 "추가"를 누르세요</li>
            <li><span className="font-medium text-[hsl(var(--fg)/0.7)]">연산 버튼(+, −, ×, ÷)</span>으로 사칙연산을 조합하세요</li>
            <li>수식이 완성되면 <span className="font-medium text-[hsl(var(--fg)/0.7)]">"계산하기"</span>를 눌러 결과를 셀에 입력합니다</li>
          </ol>
          <p className="text-[10px] text-[hsl(var(--muted)/0.6)]">
            예시: Panel 노무비(21.30) × ( 0.70 ÷ 0.50 ) → 계산하기 → 29.82
          </p>
        </div>
      )}

      {/* Formula display */}
      <div className="min-h-[40px] flex flex-wrap items-center gap-1 px-4 py-3 border-b border-[hsl(var(--border)/0.5)]">
        {tokens.length === 0 ? (
          <span className="text-xs text-[hsl(var(--muted)/0.5)]">아래 버튼이나 테이블 셀을 클릭하세요...</span>
        ) : (
          <>
            {tokens.map((t, i) => renderToken(t, i))}
            {preview !== null && (
              <span className="ml-2 text-xs text-[hsl(var(--muted))]">
                = <span className="font-bold tabular-nums text-[hsl(var(--fg))]">{preview.toFixed(2)}</span>
              </span>
            )}
          </>
        )}
      </div>

      {/* Buttons */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-3">
        {/* Manual number input */}
        <div className="flex items-center gap-1">
          <input
            type="number"
            step="any"
            value={numInput}
            onChange={(e) => setNumInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleNumSubmit()}
            placeholder="숫자"
            className="w-20 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface-200)/0.5)] px-2 py-1.5 text-right text-xs tabular-nums text-[hsl(var(--fg))] outline-none focus:ring-1 focus:ring-[hsl(var(--accent)/0.5)]"
          />
          <button
            onClick={handleNumSubmit}
            className="flex h-8 items-center justify-center rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface-200)/0.5)] px-2 text-[10px] font-bold text-[hsl(var(--fg)/0.7)] transition-colors hover:bg-[hsl(var(--surface-300))]"
          >
            추가
          </button>
        </div>

        <div className="mx-1 h-6 w-px bg-[hsl(var(--border))]" />

        {["+", "-", "*", "/"].map((op) => (
          <button
            key={op}
            onClick={() => onAddOp(op)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface-200)/0.5)] text-sm font-bold text-[hsl(var(--fg))] transition-colors hover:bg-[hsl(var(--surface-300))]"
          >
            {{ "+": "+", "-": "−", "*": "×", "/": "÷" }[op]}
          </button>
        ))}

        <div className="mx-1 h-6 w-px bg-[hsl(var(--border))]" />

        <button
          onClick={() => onAddParen("(")}
          className="flex h-8 w-7 items-center justify-center rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface-200)/0.5)] text-sm font-bold text-[hsl(var(--fg)/0.7)] transition-colors hover:bg-[hsl(var(--surface-300))]"
        >
          (
        </button>
        <button
          onClick={() => onAddParen(")")}
          className="flex h-8 w-7 items-center justify-center rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface-200)/0.5)] text-sm font-bold text-[hsl(var(--fg)/0.7)] transition-colors hover:bg-[hsl(var(--surface-300))]"
        >
          )
        </button>

        <button
          onClick={onDeleteLast}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface-200)/0.5)] text-[hsl(var(--muted))] transition-colors hover:bg-[hsl(var(--surface-300))] hover:text-[hsl(var(--fg))]"
          title="마지막 삭제"
        >
          <Delete className="h-3.5 w-3.5" />
        </button>

        <button
          onClick={onClear}
          className="flex h-8 px-2.5 items-center justify-center rounded-lg border border-[hsl(var(--danger)/0.3)] text-xs font-bold text-[hsl(var(--danger))] transition-colors hover:bg-[hsl(var(--danger)/0.08)]"
        >
          C
        </button>

        <div className="ml-auto">
          <Button variant="accent" size="sm" onClick={onCalculate} disabled={tokens.length === 0}>
            계산하기
          </Button>
        </div>
      </div>
    </div>
  );
}
