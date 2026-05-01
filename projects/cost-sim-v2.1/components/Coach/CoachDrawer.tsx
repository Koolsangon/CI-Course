"use client";

import { useEffect } from "react";
import { MessageCircle, X, RotateCcw } from "lucide-react";
import type { ProblemDef } from "@/content/problems/types";
import type { GradeResult } from "@/lib/worksheet-engine";
import { useCoach } from "@/lib/coach/use-coach";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import SuggestionChips from "./SuggestionChips";

interface CoachDrawerProps {
  problem: ProblemDef;
  answers: Record<string, Record<string, number>>;
  grades: GradeResult[] | null;
  score: number | null;
  open: boolean;
  onClose: () => void;
}

function buildLastGrade(grades: GradeResult[] | null, score: number | null) {
  if (!grades) return null;
  const correctCells = grades.filter((g) => g.correct).map((g) => g.cellId);
  const incorrectCells = grades.filter((g) => !g.correct).map((g) => g.cellId);
  return {
    score,
    total: grades.length,
    correctCells,
    incorrectCells
  };
}

export default function CoachDrawer({
  problem,
  answers,
  grades,
  score,
  open,
  onClose
}: CoachDrawerProps) {
  const { messages, streamingId, error, sendMessage, clear } = useCoach({
    problemId: problem.id,
    answers,
    lastGrade: buildLastGrade(grades, score)
  });

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <>
      {/* Backdrop (mobile) */}
      <div
        onClick={onClose}
        className={[
          "fixed inset-0 z-30 bg-black/40 backdrop-blur-sm transition-opacity md:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        ].join(" ")}
        aria-hidden
      />

      <aside
        className={[
          "fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col border-l border-[hsl(var(--border))] bg-[hsl(var(--surface-100))] shadow-2xl transition-transform duration-300 md:w-[400px]",
          open ? "translate-x-0" : "translate-x-full"
        ].join(" ")}
        aria-label="코치 챗"
        role="dialog"
        aria-modal="false"
      >
        <header className="flex items-center justify-between border-b border-[hsl(var(--border))] bg-[hsl(var(--surface-100))] px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[hsl(var(--accent))/0.12] text-[hsl(var(--accent))]">
              <MessageCircle className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[hsl(var(--fg))]">코치</h2>
              <p className="text-xs text-[hsl(var(--muted))]">소크라테스식 학습 도우미</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={clear}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-[hsl(var(--muted))] transition-colors hover:bg-[hsl(var(--surface-200))] hover:text-[hsl(var(--fg))]"
              aria-label="대화 초기화"
              title="대화 초기화"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-[hsl(var(--muted))] transition-colors hover:bg-[hsl(var(--surface-200))] hover:text-[hsl(var(--fg))]"
              aria-label="닫기"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <MessageList messages={messages} streamingMessageId={streamingId} />

        {messages.length <= 1 && streamingId === null && (
          <SuggestionChips onPick={sendMessage} disabled={streamingId !== null} />
        )}

        {error && (
          <div className="border-t border-[hsl(var(--border))] bg-[hsl(var(--warn)/0.10)] px-4 py-2 text-xs text-[hsl(var(--warn))]">
            오류: {error}
          </div>
        )}

        <MessageInput onSend={sendMessage} disabled={streamingId !== null} />
      </aside>
    </>
  );
}
