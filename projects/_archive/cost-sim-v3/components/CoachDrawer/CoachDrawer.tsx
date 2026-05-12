"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Bot, Sparkles, AlertTriangle } from "lucide-react";
import { getStaticCoaching } from "@/lib/coach/static-coach";
import type { GuidedPhase } from "@/lib/store";
import Button from "@/components/ui/Button";

const AI_ENABLED = process.env.NEXT_PUBLIC_AI_COACH_ENABLED === "true";

interface CoachDrawerProps {
  caseId: string;
  phase: GuidedPhase;
  open: boolean;
  onClose: () => void;
}

export default function CoachDrawer({ caseId, phase, open, onClose }: CoachDrawerProps) {
  const staticText = getStaticCoaching({ caseId, phase });
  const [aiText, setAiText]   = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setAiText(null);
    setAiError(null);
  }, [caseId, phase]);

  async function askAI() {
    if (!AI_ENABLED) return;
    setLoading(true);
    setAiError(null);
    try {
      const res = await fetch("/api/ai/coach", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ caseId, phase })
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = await res.json();
      setAiText(typeof data.text === "string" ? data.text : staticText);
    } catch {
      setAiError("AI 코치에 접속할 수 없어 정적 코치로 표시합니다.");
      setAiText(staticText);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop (mobile) */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-20 bg-black/40 backdrop-blur-sm md:hidden"
            onClick={onClose}
            aria-hidden
          />

          <motion.aside
            key="drawer"
            initial={{ x: 340, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 340, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className={[
              "fixed right-0 top-0 z-30 flex h-full w-[320px] flex-col",
              "border-l border-[hsl(var(--border))]",
              "bg-[hsl(var(--surface-100))] shadow-elevated"
            ].join(" ")}
            role="complementary"
            aria-label="코치 패널"
          >
            {/* Header */}
            <header className="flex items-center gap-3 border-b border-[hsl(var(--border))] bg-[hsl(var(--surface-200)/0.5)] px-4 py-4">
              {/* Avatar circle */}
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[hsl(var(--accent)/0.12)] ring-1 ring-[hsl(var(--accent)/0.3)]">
                <Bot className="h-4 w-4 text-[hsl(var(--accent))]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[hsl(var(--fg))]">코치</p>
                <p className="text-xs text-[hsl(var(--muted))]">
                  {phase.charAt(0).toUpperCase() + phase.slice(1)} 단계
                </p>
              </div>
              <button
                onClick={onClose}
                aria-label="닫기"
                className="flex h-8 w-8 items-center justify-center rounded-xl text-[hsl(var(--muted))] transition-colors hover:bg-[hsl(var(--surface-300)/0.5)] hover:text-[hsl(var(--fg))]"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            {/* Chat bubble content */}
            <div className="flex-1 overflow-y-auto px-4 py-5">
              <div className="flex flex-col gap-3">
                {/* Coach message bubble */}
                <div className="flex gap-2.5 items-start">
                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[hsl(var(--accent)/0.1)]">
                    <Bot className="h-3.5 w-3.5 text-[hsl(var(--accent))]" />
                  </div>
                  <div className="rounded-2xl rounded-tl-sm border border-[hsl(var(--border))] bg-[hsl(var(--surface-200)/0.5)] px-4 py-3">
                    <p className="text-sm leading-relaxed text-[hsl(var(--fg)/0.9)]">
                      {aiText ?? staticText}
                    </p>
                  </div>
                </div>

                {aiError && (
                  <div className="flex items-start gap-2 rounded-xl border border-[hsl(var(--warn)/0.3)] bg-[hsl(var(--warn)/0.08)] px-3 py-2">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[hsl(var(--warn))]" />
                    <p className="text-xs text-[hsl(var(--warn))]">{aiError}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer actions */}
            {AI_ENABLED && (
              <div className="border-t border-[hsl(var(--border))] px-4 py-4">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={loading}
                  onClick={askAI}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[hsl(var(--accent)/0.3)] border-t-[hsl(var(--accent))]" />
                      AI 호출 중...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      더 자세한 설명 (AI)
                    </>
                  )}
                </Button>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
