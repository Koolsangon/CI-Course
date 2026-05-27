"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Calculator, Lightbulb, Timer, Trophy } from "lucide-react";
import type { ProblemDef } from "@/content/problems/types";
import {
  gradeYellowCells,
  computeWeightedScore,
  resolveHints,
  HINT_PENALTY,
  type GradeResult,
  type HintLevel,
  type WeightedScore
} from "@/lib/worksheet-engine";
import WorksheetTable from "./WorksheetTable";
import GradingPanel from "./GradingPanel";
import CellCalculator, { evaluateTokens, type FormulaToken } from "./CellCalculator";
import WorksheetGuide from "./WorksheetGuide";
import { getYellowCount } from "@/lib/worksheet-engine";
import CellHintModal from "./CellHintModal";
import { getCase } from "@/lib/cases";
import { useStore } from "@/lib/store";
import { useRoomState } from "@/lib/hooks/useRoomState";
import { loadRoomContext, type RoomContext } from "@/lib/player";
import RoomBadge from "@/components/Room/RoomBadge";

interface ProblemPageProps {
  problem: ProblemDef;
  caseId: string;
  /** 게임 모드 — 룸 입장 + 강사 신호로 진입한 라운드. 타이머·미니 리더보드·자동 종료 활성화. */
  gameMode?: boolean;
  roomCode?: string;
  roundN?: number;
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function ProblemPage({
  problem,
  caseId,
  gameMode = false,
  roomCode,
  roundN
}: ProblemPageProps) {
  const router = useRouter();
  const caseDef = getCase(caseId);
  const hintPenaltyEnabled = useStore((s) => s.hintPenaltyEnabled);
  const storeHintLevel = useStore((s) => s.getHintLevel(problem.id));
  const storeSetHintLevel = useStore((s) => s.setHintLevel);
  const storeResetHintLevel = useStore((s) => s.resetHintLevel);
  const [elapsed, setElapsed] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [roomCtx, setRoomCtx] = useState<RoomContext | null>(null);

  // 룸 컨텍스트 로드 — 게임 모드일 때만 사용.
  useEffect(() => {
    if (gameMode) setRoomCtx(loadRoomContext());
  }, [gameMode]);

  // 게임 모드 폴링 — settings.timeCapSec + 미니 리더보드용 submissions.
  const { snapshot } = useRoomState(gameMode ? roomCode ?? null : null);
  const timeCapSec = snapshot?.meta.settings.timeCapSec ?? 600;

  // 1초마다 타이머 카운트.
  useEffect(() => {
    if (!gameMode || submitted) return;
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [gameMode, submitted]);
  const [answers, setAnswers] = useState<Record<string, Record<string, number>>>({});
  const [grades, setGrades] = useState<GradeResult[] | null>(null);
  const [score, setScore] = useState<number | null>(null);
  // hintLevel은 store에서 복원 → 뒤로갔다 재진입해도 차감 유지
  const [hintLevel, setHintLevelLocal] = useState<HintLevel>(storeHintLevel);
  const [weighted, setWeighted] = useState<WeightedScore | null>(null);

  // storeHintLevel이 외부에서 바뀌면 동기화 (마운트 시 복원)
  useEffect(() => {
    setHintLevelLocal(storeHintLevel);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [showGuide, setShowGuide] = useState(true);
  const [activeCell, setActiveCell] = useState<{ colId: string; rowId: string } | null>(null);
  const [calculatorMode, setCalculatorMode] = useState(false);
  const [formulaTokens, setFormulaTokens] = useState<FormulaToken[]>([]);
  const [activeCellLabel, setActiveCellLabel] = useState("");
  const [hintOpen, setHintOpen] = useState(false);

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

  // 게임 모드 자동 종료 검사 — 100% 정답 또는 cap 도달 시 submission.
  const autoGrade = useMemo(() => {
    if (!gameMode) return null;
    return gradeYellowCells(problem, answers);
  }, [gameMode, problem, answers]);

  async function submitRound(completed: boolean) {
    if (submitted || !gameMode || !roomCode || !roundN || !roomCtx) return;
    setSubmitted(true);
    try {
      await fetch(`/api/rooms/${roomCode}/rounds/${roundN}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: roomCtx.playerId,
          completionTimeSec: completed ? elapsed : timeCapSec,
          completed,
          hintLevel
        })
      });
    } catch {
      /* 폴링 hook 이 ended 상태 감지하면 자동 navigate — 본 catch 는 silent */
    }
    router.push("/menu");
  }

  // 100% 정답 자동 감지.
  useEffect(() => {
    if (!gameMode || submitted || !autoGrade) return;
    if (autoGrade.total > 0 && autoGrade.score === autoGrade.total) {
      submitRound(true);
    }
    // 의도적으로 submitRound 를 deps 에서 제외 — autoGrade 변화로 trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoGrade, gameMode, submitted]);

  // 캡 도달 자동 종료.
  useEffect(() => {
    if (!gameMode || submitted) return;
    if (elapsed >= timeCapSec) {
      submitRound(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed, gameMode, submitted, timeCapSec]);

  function handleGrade() {
    const result = gradeYellowCells(problem, answers);
    setGrades(result.grades);
    setScore(result.score);
    setWeighted(computeWeightedScore(result.grades, hintLevel, hintPenaltyEnabled));
  }

  function handleReset() {
    // 부분 초기화 — 틀린 셀만 비움. 정답 셀은 보존하여 학습자가 틀린 부분만 다시 풀게 한다.
    if (grades) {
      const next: Record<string, Record<string, number>> = {};
      for (const colId of Object.keys(answers)) {
        const colAnswers = { ...answers[colId] };
        next[colId] = colAnswers;
      }
      for (const g of grades) {
        if (!g.correct && next[g.colId]) {
          const colNext = { ...next[g.colId] };
          delete colNext[g.rowId];
          next[g.colId] = colNext;
        }
      }
      setAnswers(next);
    } else {
      setAnswers({});
    }
    setGrades(null);
    setScore(null);
    setActiveCell(null);
    setCalculatorMode(false);
    setFormulaTokens([]);
    setHintLevelLocal(0);
    storeResetHintLevel(problem.id);
    setWeighted(null);
  }

  function bumpHintLevel() {
    const next = hintLevel >= 3 ? hintLevel : ((hintLevel + 1) as HintLevel);
    setHintLevelLocal(next);
    storeSetHintLevel(problem.id, next);
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
          <h1 className="text-sm font-bold text-[hsl(var(--fg))]">
            {problem.title}
            {gameMode && roundN !== undefined && (
              <span className="ml-2 rounded-md bg-[hsl(var(--accent)/0.15)] px-1.5 py-0.5 text-[10px] font-bold text-[hsl(var(--accent))] tabular-nums">
                R{roundN}
              </span>
            )}
          </h1>
        </div>
        {gameMode ? (
          <div className="flex items-center gap-1.5 rounded-xl border border-[hsl(var(--accent)/0.4)] bg-[hsl(var(--accent)/0.08)] px-3 py-1.5 text-xs font-mono font-bold tabular-nums text-[hsl(var(--accent))]">
            <Timer className="h-3.5 w-3.5" />
            {formatElapsed(elapsed)}
          </div>
        ) : (
          <RoomBadge />
        )}
        <button
          type="button"
          onClick={() => setHintOpen(true)}
          aria-label="힌트 보기"
          className="ml-2 flex items-center gap-1.5 rounded-xl border border-[hsl(var(--warn)/0.4)] bg-[hsl(var(--warn)/0.08)] px-3 py-1.5 text-xs font-semibold text-[hsl(var(--warn))] transition-colors hover:bg-[hsl(var(--warn)/0.15)]"
        >
          <Lightbulb className="h-3.5 w-3.5" />
          <span>힌트</span>
          {hintLevel > 0 && (
            <span className="rounded-md bg-[hsl(var(--warn))] px-1 text-[10px] font-bold text-white tabular-nums">
              {hintLevel}/3
              {hintPenaltyEnabled && ` · ${Math.round(HINT_PENALTY[hintLevel] * 100)}%`}
            </span>
          )}
        </button>
      </header>

      <main
        className={
          calculatorMode && activeCell
            ? "mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-80"
            : "mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-24"
        }
      >
        <div className="flex flex-col gap-6">
          {/* 문항별 질문 카드 — 섹션별 시각 분리로 가독성 강조. */}
          <div className="mx-auto w-full max-w-3xl rounded-2xl border-2 border-[hsl(var(--accent)/0.35)] bg-[hsl(var(--accent)/0.06)] px-6 py-5 shadow-card">
            {/* 헤더: 문제 배지 + 제목 (큼) */}
            <div className="mb-4 flex items-center gap-2 border-b border-[hsl(var(--accent)/0.2)] pb-3">
              <span className="rounded-md bg-[hsl(var(--accent)/0.18)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--accent))]">
                문제
              </span>
              <h2 className="text-base font-bold text-[hsl(var(--fg))]">{problem.title}</h2>
            </div>

            {problem.scenarioSections ? (
              <div className="flex flex-col gap-4">
                {/* 상황 — 본문 텍스트 */}
                <div className="flex gap-3">
                  <span className="mt-0.5 flex-shrink-0 rounded-md bg-[hsl(var(--surface-200))] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted))]">
                    상황
                  </span>
                  <p className="flex-1 text-sm leading-relaxed text-[hsl(var(--fg)/0.85)]">
                    {problem.scenarioSections.situation}
                  </p>
                </div>

                {/* 과제 — 상황과 동일한 스타일 */}
                {problem.scenarioSections.task && (
                  <div className="flex gap-3">
                    <span className="mt-0.5 flex-shrink-0 rounded-md bg-[hsl(var(--surface-200))] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted))]">
                      과제
                    </span>
                    <p className="flex-1 text-sm leading-relaxed text-[hsl(var(--fg)/0.85)]">
                      {problem.scenarioSections.task}
                    </p>
                  </div>
                )}

                {/* 공식은 힌트 3단계에서 제공 — 여기서는 표시 안 함 */}

                {/* 가정 — chip pills */}
                {problem.scenarioSections.assumptions && problem.scenarioSections.assumptions.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex-shrink-0 rounded-md bg-[hsl(var(--surface-200))] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted))]">
                      가정
                    </span>
                    {problem.scenarioSections.assumptions.map((a, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--surface-100))] px-2.5 py-0.5 text-xs text-[hsl(var(--fg)/0.8)]"
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Fallback — 단일 문자열 시나리오 */
              <p className="text-sm leading-relaxed text-[hsl(var(--fg)/0.9)] whitespace-pre-line">
                {problem.scenario}
              </p>
            )}
          </div>

          {/* 셀 색상 범례 삭제됨 — 피드백 반영 */}

          {gameMode && (() => {
            // 현재 라운드의 미니 리더보드 — submission 시간 오름차순.
            const roundSubs = (snapshot?.submissions ?? [])
              .filter((s) => s.roundN === roundN)
              .sort((a, b) => a.completionTimeSec - b.completionTimeSec);
            const myIdx = roundSubs.findIndex((s) => s.playerId === roomCtx?.playerId);
            const playerLabel = (id: string) =>
              snapshot?.players.find((p) => p.id === id)?.name ?? id.slice(0, 6);
            // 자기 위 1명 + 자기 + 아래 1명 (자기가 미제출이면 top 3).
            let visible: typeof roundSubs;
            if (myIdx === -1) {
              visible = roundSubs.slice(0, 3);
            } else {
              const from = Math.max(0, myIdx - 1);
              visible = roundSubs.slice(from, from + 3);
            }
            return (
              <div className="rounded-2xl border border-[hsl(var(--accent)/0.3)] bg-[hsl(var(--accent)/0.04)] px-4 py-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-[hsl(var(--accent))]">
                    <Trophy className="h-3.5 w-3.5" />
                    실시간 순위 ({roundSubs.length}명 제출)
                    {roomCode && (
                      <span className="ml-1 font-mono text-[10px] text-[hsl(var(--muted))]">· 룸 {roomCode}</span>
                    )}
                  </span>
                  <span className="text-[10px] text-[hsl(var(--muted))]">
                    100% 정답 또는 {Math.floor(timeCapSec / 60)}분 캡 시 자동 종료
                  </span>
                </div>
                {visible.length === 0 ? (
                  <p className="text-[11px] text-[hsl(var(--muted))]">아직 제출자가 없습니다 — 가장 먼저 풀이를 완료해 보세요.</p>
                ) : (
                  <ul className="flex flex-col gap-0.5">
                    {visible.map((s) => {
                      const idx = roundSubs.indexOf(s);
                      const isMe = s.playerId === roomCtx?.playerId;
                      const mm = Math.floor(s.completionTimeSec / 60);
                      const ss = s.completionTimeSec % 60;
                      return (
                        <li
                          key={s.playerId}
                          className={`flex items-center justify-between gap-2 rounded-lg px-2 py-1 text-xs ${
                            isMe ? "bg-[hsl(var(--accent)/0.18)] font-semibold" : ""
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span className="w-6 text-center font-mono tabular-nums text-[hsl(var(--muted))]">
                              {idx + 1}
                            </span>
                            <span className="text-[hsl(var(--fg))]">{playerLabel(s.playerId)}</span>
                            {isMe && <span className="text-[10px] text-[hsl(var(--accent))]">(나)</span>}
                            {!s.completed && <span className="text-[10px] text-[hsl(var(--warn))]">(캡)</span>}
                          </span>
                          <span className="font-mono tabular-nums text-[hsl(var(--fg)/0.8)]">
                            {mm.toString().padStart(2, "0")}:{ss.toString().padStart(2, "0")}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })()}

          <WorksheetTable
            problem={problem}
            answers={answers}
            grades={grades}
            activeCell={activeCell}
            calculatorMode={calculatorMode}
            onAnswer={handleAnswer}
            onCellClick={handleCellClick}
          />

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

          {/* 하단 힌트 안내 박스 삭제됨 — 피드백 반영 */}
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-[hsl(var(--border))] bg-[hsl(var(--surface-100)/0.92)] pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
        <div className="mx-auto w-full max-w-5xl px-4 py-3">
          {calculatorMode && activeCell ? (
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
          ) : (
            <div className="flex items-center justify-center rounded-2xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--surface-200)/0.4)] px-4 py-3">
              <Calculator className="h-3.5 w-3.5 text-[hsl(var(--muted))]" />
            </div>
          )}
        </div>
      </div>

      <CellHintModal
        open={hintOpen}
        title={problem.title}
        hints={resolveHints(caseDef)}
        level={hintLevel}
        hintPenaltyEnabled={hintPenaltyEnabled}
        onAdvance={bumpHintLevel}
        onClose={() => setHintOpen(false)}
      />
    </div>
  );
}
