"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, AlertCircle, HelpCircle, ArrowRight, PenLine } from "lucide-react";
import type { CaseDef } from "@/lib/cases";
import { useStore } from "@/lib/store";
import Button from "@/components/ui/Button";

export default function Apply({ caseDef }: { caseDef: CaseDef }) {
  const advance  = useStore((s) => s.advanceGuidedPhase);
  const [answer, setAnswer]   = useState<string>("");
  const [feedback, setFeedback] = useState<"idle" | "try-again" | "correct">("idle");
  const [showHint, setShowHint] = useState(false);

  const q = caseDef.phases.apply;

  function check() {
    const parsed = Number(answer.replace(/[^\d.\-]/g, ""));
    if (Number.isNaN(parsed)) { setFeedback("try-again"); return; }
    const diff = Math.abs(parsed - q.answer_key);
    setFeedback(diff <= q.tolerance ? "correct" : "try-again");
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col gap-4"
    >
      <div className="relative overflow-hidden rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-100))] p-7 shadow-elevated">
        {/* Decorative */}
        <div
          aria-hidden
          className="pointer-events-none absolute -left-12 -top-12 h-40 w-40 rounded-full bg-[hsl(var(--warn)/0.06)] blur-3xl"
        />

        <div className="relative flex flex-col gap-6">
          {/* Phase badge */}
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[hsl(var(--warn)/0.12)] text-[hsl(var(--warn))]">
              <PenLine className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-widest text-[hsl(var(--warn))]">
              Apply · 4분
            </span>
          </div>

          <h2 className="text-xl font-bold leading-snug text-[hsl(var(--fg))]">
            {q.question}
          </h2>

          {/* Input row */}
          <div className="flex gap-3">
            <input
              type="text"
              inputMode="decimal"
              value={answer}
              onChange={(e) => { setAnswer(e.target.value); setFeedback("idle"); }}
              onKeyDown={(e) => e.key === "Enter" && check()}
              placeholder="답을 입력하세요"
              className={[
                "flex-1 rounded-xl border bg-[hsl(var(--surface-200)/0.5)] px-4 py-3",
                "text-base font-semibold text-[hsl(var(--fg))] placeholder:text-[hsl(var(--muted))]",
                "outline-none transition-all duration-150",
                "focus:ring-2 focus:ring-[hsl(var(--accent))] focus:border-[hsl(var(--accent))]",
                feedback === "correct"
                  ? "border-[hsl(var(--success)/0.6)]"
                  : feedback === "try-again"
                  ? "border-[hsl(var(--warn)/0.6)]"
                  : "border-[hsl(var(--border))]"
              ].join(" ")}
            />
            <Button variant="accent" size="md" onClick={check}>
              확인
            </Button>
          </div>

          {/* Feedback messages */}
          <AnimatePresence mode="wait">
            {feedback === "try-again" && (
              <motion.div
                key="try-again"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-start gap-3 rounded-2xl border border-[hsl(var(--warn)/0.3)] bg-[hsl(var(--warn)/0.08)] px-4 py-3"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-[hsl(var(--warn))]" />
                <div className="flex flex-col gap-1">
                  <span className="text-sm text-[hsl(var(--warn))]">
                    조금 다른 결과가 나왔네요.
                  </span>
                  {!showHint && (
                    <button
                      className="flex items-center gap-1 text-xs font-semibold text-[hsl(var(--warn))] underline underline-offset-2"
                      onClick={() => setShowHint(true)}
                    >
                      <HelpCircle className="h-3 w-3" /> 힌트 보기
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            {feedback === "correct" && (
              <motion.div
                key="correct"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-3 rounded-2xl border border-[hsl(var(--success)/0.3)] bg-[hsl(var(--success)/0.08)] px-4 py-3"
              >
                <CheckCircle className="h-4 w-4 flex-shrink-0 text-[hsl(var(--success))]" />
                <span className="text-sm font-medium text-[hsl(var(--success))]">
                  잘 따라오고 있어요. 다음 단계로 이동해볼까요?
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showHint && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-200)/0.5)] px-4 py-3 font-mono text-xs text-[hsl(var(--fg)/0.8)]">
                  {q.hint}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          variant="accent"
          size="md"
          onClick={advance}
          disabled={feedback !== "correct"}
        >
          다음: Reflect <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </motion.section>
  );
}
