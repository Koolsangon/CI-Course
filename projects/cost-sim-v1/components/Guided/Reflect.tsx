"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { BookMarked, Check, ArrowRight, Trophy } from "lucide-react";
import type { CaseDef } from "@/lib/cases";
import { useStore } from "@/lib/store";
import { CASE_ORDER, getCase } from "@/lib/cases";
import Button from "@/components/ui/Button";

// R9 (PIPA): Reflect freeform text is stored in the Zustand store only.
// It is NEVER transmitted to any /api route. See plan §4 Layer 2 + §7 R9.
export default function Reflect({ caseDef }: { caseDef: CaseDef }) {
  const recordReflection = useStore((s) => s.recordReflection);
  const stored           = useStore((s) => s.reflectNotes[caseDef.id] ?? "");
  const advance          = useStore((s) => s.advanceGuidedPhase);
  const [text, setText]  = useState(stored);
  const [saved, setSaved] = useState(false);
  const router = useRouter();

  const idx = CASE_ORDER.indexOf(caseDef.id as (typeof CASE_ORDER)[number]);
  const nextCaseId = idx >= 0 && idx < CASE_ORDER.length - 1 ? CASE_ORDER[idx + 1] : null;
  const nextCaseTitle = nextCaseId ? getCase(nextCaseId)?.title : null;
  const isLastCase = !nextCaseId;

  function save() {
    recordReflection(caseDef.id, text);
    setSaved(true);
    advance();
  }

  function goNext() {
    if (nextCaseId) router.push(`/cases/${nextCaseId}`);
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col gap-4"
    >
      <div className="relative overflow-hidden rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-100))] p-7 shadow-elevated">
        {/* Paper-texture tint */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-3xl opacity-[0.03]"
          style={{
            backgroundImage: `repeating-linear-gradient(
              0deg,
              hsl(220 60% 60%) 0px,
              transparent 1px,
              transparent 28px
            )`
          }}
        />

        <div className="relative flex flex-col gap-5">
          {/* Phase badge */}
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[hsl(250_80%_60%/0.12)] text-[hsl(250_80%_72%)]">
              <BookMarked className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-widest text-[hsl(250_80%_72%)]">
              Reflect · 2분
            </span>
          </div>

          <h2 className="text-xl font-bold leading-snug text-[hsl(var(--fg))]">
            {caseDef.phases.reflect}
          </h2>

          <p className="text-xs text-[hsl(var(--muted)/0.6)]">
            이 메모는 브라우저 내에만 저장되며 서버로 전송되지 않습니다.
          </p>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="한 문장으로 정리해보세요..."
            rows={5}
            className={[
              "w-full resize-none rounded-2xl border bg-[hsl(var(--surface-200)/0.4)] p-4",
              "text-sm leading-relaxed text-[hsl(var(--fg))] placeholder:text-[hsl(var(--muted)/0.5)]",
              "outline-none transition-all duration-150",
              "focus:ring-2 focus:ring-[hsl(250_80%_60%/0.5)] focus:border-[hsl(250_80%_60%/0.4)]",
              "border-[hsl(var(--border))]"
            ].join(" ")}
          />
        </div>
      </div>

      {!saved ? (
        <div className="flex justify-end">
          <Button
            variant="accent"
            size="md"
            onClick={save}
            disabled={text.trim().length === 0}
          >
            저장하고 완료
          </Button>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col gap-3 rounded-2xl border border-[hsl(var(--success)/0.3)] bg-[hsl(var(--success)/0.08)] p-5"
        >
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))]">
              {isLastCase ? <Trophy className="h-5 w-5" /> : <Check className="h-5 w-5" />}
            </span>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-[hsl(var(--success))]">
                {isLastCase ? "모든 케이스 완료!" : `Case ${idx + 1} 완료`}
              </span>
              <span className="text-xs text-[hsl(var(--muted))]">
                {isLastCase
                  ? "6개 케이스 모두 완주했습니다. 수고하셨어요."
                  : `다음: ${nextCaseTitle}`}
              </span>
            </div>
          </div>
          {nextCaseId ? (
            <Button variant="accent" size="lg" onClick={goNext} className="w-full">
              다음 케이스로 <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button variant="secondary" size="md" onClick={() => router.push("/")} className="w-full">
              홈으로
            </Button>
          )}
        </motion.div>
      )}
    </motion.section>
  );
}
