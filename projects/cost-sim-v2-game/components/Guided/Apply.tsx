"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import { CheckCircle, AlertCircle, HelpCircle, ArrowRight, PenLine, Sparkles } from "lucide-react";
import type { CaseDef } from "@/lib/cases";
import { useStore } from "@/lib/store";
import { tagsForCase } from "@/lib/variables";
import Button from "@/components/ui/Button";
import ConfettiBurst from "@/components/ui/ConfettiBurst";
import { ding, vibrate } from "@/lib/sound";

export default function Apply({ caseDef }: { caseDef: CaseDef }) {
  const advance = useStore((s) => s.advanceGuidedPhase);
  const markHintUsed = useStore((s) => s.markHintUsed);
  const recordCaseAttempt = useStore((s) => s.recordCaseAttempt);
  const caseScore = useStore((s) => s.caseScores[caseDef.id]);
  const currentProfit = useStore((s) => s.result.operating_profit);

  const [answer, setAnswer] = useState<string>("");
  const [feedback, setFeedback] = useState<"idle" | "try-again" | "correct">("idle");
  const [showHint, setShowHint] = useState(false);
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Count-up motion value bound to the input on correct
  const countMV = useMotionValue(0);
  const countDisplay = useTransform(countMV, (v) => v.toFixed(2));

  const q = caseDef.phases.apply;

  function check() {
    const parsed = Number(answer.replace(/[^\d.\-]/g, ""));
    if (Number.isNaN(parsed)) {
      setFeedback("try-again");
      return;
    }
    const diff = Math.abs(parsed - q.answer_key);
    const correct = diff <= q.tolerance;
    if (correct) {
      setFeedback("correct");
      // Score = 1 - (distance / tolerance), clamped 0..1
      const accuracy = Math.max(0, 1 - diff / Math.max(q.tolerance, 1e-6));
      recordCaseAttempt(caseDef.id, accuracy, caseDef.variables.length, currentProfit, tagsForCase(caseDef.id));
      setConfettiTrigger((t) => t + 1);
      ding();
      vibrate(12);

      // Count-up on the answer input from current parsed value down to 0 then up,
      // creating a "settling" feel that tells the user "yes, this number"
      countMV.set(0);
      animate(countMV, parsed, {
        duration: 0.6,
        ease: [0.22, 1, 0.36, 1]
      });
    } else {
      setFeedback("try-again");
    }
  }

  function openHint() {
    setShowHint(true);
    markHintUsed();
  }

  // Sync the input display from count-up motion value while the count-up runs
  useEffect(() => {
    if (feedback !== "correct") return;
    const unsub = countDisplay.on("change", (v) => {
      if (inputRef.current) inputRef.current.value = v;
    });
    return unsub;
  }, [feedback, countDisplay]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col gap-4"
    >
      <div className="relative overflow-visible rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-100))] p-7 shadow-elevated">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-12 -top-12 h-40 w-40 rounded-full bg-[hsl(var(--warn)/0.06)] blur-3xl"
        />

        {/* Confetti is positioned absolute relative to this card */}
        <ConfettiBurst trigger={confettiTrigger} />

        <div className="relative flex flex-col gap-6">
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

          <div className="flex gap-3">
            <input
              ref={inputRef}
              type="text"
              inputMode="decimal"
              value={feedback === "correct" ? undefined : answer}
              defaultValue={feedback === "correct" ? "0.00" : undefined}
              onChange={(e) => {
                if (feedback === "correct") return;
                setAnswer(e.target.value);
                setFeedback("idle");
              }}
              onKeyDown={(e) => e.key === "Enter" && feedback !== "correct" && check()}
              placeholder="답을 입력하세요"
              data-test="apply-answer"
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
            <Button
              variant="accent"
              size="md"
              onClick={check}
              disabled={feedback === "correct"}
            >
              확인
            </Button>
          </div>

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
                      onClick={openHint}
                    >
                      <HelpCircle className="h-3 w-3" /> 힌트 보기
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            {feedback === "correct" && caseScore && (
              <motion.div
                key="correct"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col gap-3 rounded-2xl border border-[hsl(var(--success)/0.4)] bg-[hsl(var(--success)/0.08)] px-4 py-3"
                data-test="apply-correct"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 flex-shrink-0 text-[hsl(var(--success))]" />
                  <span className="text-sm font-bold text-[hsl(var(--success))]">
                    정답입니다
                  </span>
                  <span className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-[hsl(var(--success))]">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span data-test="apply-score">{caseScore.score}</span>
                    <span className="opacity-60">/ 135</span>
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-[hsl(var(--muted))]">
                  <span>정확도 {(caseScore.accuracy * 100).toFixed(0)}%</span>
                  <span className="opacity-40">·</span>
                  <span>슬라이더 {caseScore.moves}회</span>
                  <span className="opacity-40">·</span>
                  <span>{caseScore.hintUsed ? "힌트 사용" : "힌트 없음"}</span>
                </div>
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
