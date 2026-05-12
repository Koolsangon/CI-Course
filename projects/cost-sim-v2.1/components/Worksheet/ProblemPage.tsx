"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ProblemDef } from "@/content/problems/types";
import {
  gradeYellowCells,
  computeWeightedScore,
  resolveHints,
  type GradeResult,
  type HintLevel,
  type HintLevelMap,
  type WeightedScore
} from "@/lib/worksheet-engine";
import WorksheetTable from "./WorksheetTable";
import GradingPanel from "./GradingPanel";
import CellCalculator, { evaluateTokens, type FormulaToken } from "./CellCalculator";
import WorksheetGuide from "./WorksheetGuide";
import { getYellowCount } from "@/lib/worksheet-engine";
import FloatingCoach from "@/components/Coach/FloatingCoach";
import CellHintModal from "./CellHintModal";
import { getCase } from "@/lib/cases";

interface ProblemPageProps {
  problem: ProblemDef;
  caseId: string;
}

export default function ProblemPage({ problem, caseId }: ProblemPageProps) {
  const caseDef = getCase(caseId);
  const [answers, setAnswers] = useState<Record<string, Record<string, number>>>({});
  const [grades, setGrades] = useState<GradeResult[] | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [hintLevels, setHintLevels] = useState<HintLevelMap>({});
  const [weighted, setWeighted] = useState<WeightedScore | null>(null);

  const [showGuide, setShowGuide] = useState(true);
  const [activeCell, setActiveCell] = useState<{ colId: string; rowId: string } | null>(null);
  const [calculatorMode, setCalculatorMode] = useState(false);
  const [formulaTokens, setFormulaTokens] = useState<FormulaToken[]>([]);
  const [activeCellLabel, setActiveCellLabel] = useState("");
  const [hintCell, setHintCell] = useState<{ colId: string; rowId: string } | null>(null);

  // Refs to avoid stale closures in callbacks
  const activeCellRef = useRef(activeCell);
  activeCellRef.current = activeCell;
  const formulaTokensRef = useRef(formulaTokens);
  formulaTokensRef.current = formulaTokens;

  const yellowCount = getYellowCount(problem);

  function handleAnswer(colId: string, rowId: string, value: number) {
    setAnswers((prev) => {
      const colAnswers = { ...(prev[colId] ?? {}) };
      colAnswers[rowId] = value;
      return { ...prev, [colId]: colAnswers };
    });
  }

  function handleGrade() {
    const result = gradeYellowCells(problem, answers);
    setGrades(result.grades);
    setScore(result.score);
    setWeighted(computeWeightedScore(result.grades, hintLevels));
  }

  function handleReset() {
    setAnswers({});
    setGrades(null);
    setScore(null);
    setActiveCell(null);
    setCalculatorMode(false);
    setFormulaTokens([]);
    setHintLevels({});
    setWeighted(null);
  }

  function bumpHintLevel(colId: string, rowId: string) {
    setHintLevels((prev) => {
      const cur = prev[colId]?.[rowId] ?? 0;
      if (cur >= 3) return prev;
      const next = (cur + 1) as HintLevel;
      return {
        ...prev,
        [colId]: { ...(prev[colId] ?? {}), [rowId]: next }
      };
    });
  }

  function handleCellClick(
    colId: string,
    rowId: string,
    value: number | undefined,
    label: string,
    type: string
  ) {
    if (!calculatorMode) {
      if (type === "yellow") {
        setActiveCell({ colId, rowId });
        setCalculatorMode(true);
        setFormulaTokens([]);
        setActiveCellLabel(label);
      }
    } else {
      const ac = activeCellRef.current;
      if (ac?.colId === colId && ac?.rowId === rowId) return;
      if (value === undefined) return;
      setFormulaTokens((prev) => [
        ...prev,
        { type: "value", value, label }
      ]);
    }
  }

  function handleAddOp(op: string) {
    setFormulaTokens((prev) => [...prev, { type: "op", value: op }]);
  }

  function handleAddParen(p: string) {
    setFormulaTokens((prev) => [...prev, { type: "paren", value: p }]);
  }

  function handleAddNumber(n: number) {
    setFormulaTokens((prev) => [...prev, { type: "value", value: n }]);
  }

  function handleDeleteLast() {
    setFormulaTokens((prev) => prev.slice(0, -1));
  }

  function handleClearFormula() {
    setFormulaTokens([]);
  }

  function handleCalculate() {
    const ac = activeCellRef.current;
    const tokens = formulaTokensRef.current;
    if (!ac) return;
    const result = evaluateTokens(tokens);
    if (result === null) return;
    handleAnswer(ac.colId, ac.rowId, result);
    setActiveCell(null);
    setCalculatorMode(false);
    setFormulaTokens([]);
  }

  function handleCloseCalculator() {
    setActiveCell(null);
    setCalculatorMode(false);
    setFormulaTokens([]);
  }

  return (
    <div className="flex min-h-screen flex-col bg-[hsl(var(--bg))]">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-[hsl(var(--border))] bg-[hsl(var(--surface-100)/0.85)] px-4 py-3 backdrop-blur-md">
        <Link
          href="/cases"
          className="flex h-8 w-8 items-center justify-center rounded-xl text-[hsl(var(--muted))] transition-colors hover:bg-[hsl(var(--surface-200))] hover:text-[hsl(var(--fg))]"
          aria-label="문제 목록"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-sm font-bold text-[hsl(var(--fg))]">{problem.title}</h1>
          <p className="text-xs text-[hsl(var(--muted))] truncate">{problem.scenario}</p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        <div className="flex flex-col gap-6">
          <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-100))] px-6 py-4">
            <p className="text-sm leading-relaxed text-[hsl(var(--fg)/0.9)]">
              {problem.scenario}
            </p>
            <div className="mt-2 flex gap-4 text-xs text-[hsl(var(--muted))]">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded border border-[hsl(var(--warn)/0.35)] bg-[hsl(var(--warn)/0.10)]" />
                입력 ({yellowCount}셀)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded border border-[hsl(123_46%_34%/0.25)] bg-[hsl(123_46%_34%/0.07)]" />
                자동 계산
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded border border-[hsl(var(--accent)/0.18)] bg-[hsl(var(--accent)/0.06)]" />
                고정값
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-dashed border-[hsl(var(--accent)/0.4)] bg-[hsl(var(--accent)/0.04)] px-4 py-3">
            <div className="text-lg" aria-hidden>💡</div>
            <div className="min-w-0 flex-1 text-xs text-[hsl(var(--muted))]">
              화면 오른쪽에서 마우스를 따라 움직이는 <span className="font-semibold text-[hsl(var(--accent))]">AI 코치</span> 버튼을 클릭하면, 답을 직접 주지 않고 한 단계 앞의 사고 단서로 도와드립니다.
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-2xl border border-[hsl(var(--warn)/0.35)] bg-[hsl(var(--warn)/0.06)] px-4 py-3">
            <div className="text-lg" aria-hidden>🔆</div>
            <div className="min-w-0 flex-1 text-xs text-[hsl(var(--fg)/0.85)]">
              <span className="font-semibold text-[hsl(var(--warn))]">셀 힌트는 3단계로 제공됩니다.</span>{" "}
              노란 셀의 <span className="font-mono">?</span> 버튼을 누르면 단계별로 더 구체적인 단서를 볼 수 있어요. 단계가 올라갈수록 그 셀의 정답 배점이 줄어듭니다 — {" "}
              <span className="font-mono tabular-nums">100% → 70% → 40% → 20%</span>. 먼저 직접 풀어보고 막힐 때 사용해 주세요.
            </div>
          </div>

          <WorksheetTable
            problem={problem}
            answers={answers}
            grades={grades}
            activeCell={activeCell}
            calculatorMode={calculatorMode}
            hintLevels={hintLevels}
            onAnswer={handleAnswer}
            onCellClick={handleCellClick}
            onHintClick={(colId, rowId) => setHintCell({ colId, rowId })}
          />

          {calculatorMode && activeCell && (
            <CellCalculator
              targetLabel={activeCellLabel}
              tokens={formulaTokens}
              onAddOp={handleAddOp}
              onAddParen={handleAddParen}
              onAddNumber={handleAddNumber}
              onDeleteLast={handleDeleteLast}
              onClear={handleClearFormula}
              onCalculate={handleCalculate}
              onClose={handleCloseCalculator}
            />
          )}

          {showGuide && (
            <WorksheetGuide
              problemId={problem.id}
              onClose={() => setShowGuide(false)}
            />
          )}

          <GradingPanel
            onGrade={handleGrade}
            onReset={handleReset}
            score={score}
            total={yellowCount}
            graded={grades !== null}
            weighted={weighted}
          />
        </div>
      </main>

      <FloatingCoach
        caseId={caseId}
        problem={problem}
        answers={answers}
        grades={grades}
        score={score}
      />

      {hintCell && (() => {
        const row = problem.rows.find((r) => r.id === hintCell.rowId);
        const refValue = row?.cells["ref"]?.value;
        const hints = resolveHints(problem, caseDef, hintCell.colId, hintCell.rowId);
        const level = hintLevels[hintCell.colId]?.[hintCell.rowId] ?? 0;
        return (
          <CellHintModal
            open
            title={row?.label ?? "셀"}
            refValue={refValue}
            hints={hints}
            level={level}
            onAdvance={() => bumpHintLevel(hintCell.colId, hintCell.rowId)}
            onClose={() => setHintCell(null)}
          />
        );
      })()}
    </div>
  );
}
