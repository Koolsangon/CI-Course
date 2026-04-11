"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { BookMarked, Check, ArrowRight, Trophy, Star, Mail } from "lucide-react";
import type { CaseDef } from "@/lib/cases";
import { useStore } from "@/lib/store";
import { CASE_ORDER, getCase } from "@/lib/cases";
import { getMonthForCase, reactionForStars } from "@/lib/campaign";
import Button from "@/components/ui/Button";
import { fanfare } from "@/lib/sound";

// R9 (PIPA): Reflect freeform text is stored in the Zustand store only.
// It is NEVER transmitted to any /api route. See plan §4 Layer 2 + §7 R9.
export default function Reflect({ caseDef }: { caseDef: CaseDef }) {
  const recordReflection = useStore((s) => s.recordReflection);
  const stored           = useStore((s) => s.reflectNotes[caseDef.id] ?? "");
  const advance          = useStore((s) => s.advanceGuidedPhase);
  const caseScore        = useStore((s) => s.caseScores[caseDef.id]);
  const stars = caseScore?.stars ?? 0;
  const score = caseScore?.score ?? 0;

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
    fanfare();
    advance();
  }

  // Restore the in-memory `saved` flag if the user navigates back to a Reflect
  // they already completed (advance pushed phase to "reflect" but the local
  // flag would be false on re-mount). The presence of a recorded reflection +
  // a stored case score is the persistent signal.
  useEffect(() => {
    if (stored.trim().length > 0 && caseScore) setSaved(true);
  }, [stored, caseScore]);

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
          className="flex flex-col gap-4 rounded-2xl border border-[hsl(var(--success)/0.3)] bg-[hsl(var(--success)/0.08)] p-5"
          data-test="reflect-success"
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
            {caseScore && (
              <span className="ml-auto text-xs font-semibold text-[hsl(var(--success))]">
                {score}<span className="opacity-60"> / 135</span>
              </span>
            )}
          </div>

          {/* Stars cascade */}
          {(() => {
            const month = getMonthForCase(caseDef.id);
            if (!month) return null;
            return (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45, duration: 0.3 }}
                className="rounded-2xl border border-[hsl(var(--accent)/0.25)] bg-[hsl(var(--surface-200)/0.4)] px-4 py-3"
                data-test="cfo-reaction"
              >
                <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--accent))]">
                  <Mail className="h-3 w-3" /> CFO · 회신
                </div>
                <p className="text-sm leading-relaxed text-[hsl(var(--fg)/0.9)]">
                  {reactionForStars(month, stars)}
                </p>
              </motion.div>
            );
          })()}

          <motion.div
            data-test="case-stars"
            className="flex items-center gap-2"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } }
            }}
          >
            {[0, 1, 2].map((i) => {
              const filled = i < stars;
              return (
                <motion.div
                  key={i}
                  variants={{
                    hidden: { opacity: 0, scale: 0.4, rotate: -25 },
                    visible: { opacity: 1, scale: 1, rotate: 0 }
                  }}
                  transition={{ type: "spring", stiffness: 240, damping: 14 }}
                  data-filled={filled ? "true" : "false"}
                  className={[
                    "flex h-10 w-10 items-center justify-center rounded-xl",
                    filled
                      ? "bg-[hsl(45_92%_55%/0.18)] text-[hsl(45_92%_60%)] shadow-[0_0_14px_hsl(45_92%_60%/0.4)]"
                      : "bg-[hsl(var(--surface-300)/0.3)] text-[hsl(var(--muted)/0.45)]"
                  ].join(" ")}
                >
                  <Star className="h-5 w-5" fill={filled ? "currentColor" : "none"} strokeWidth={filled ? 0 : 2} />
                </motion.div>
              );
            })}
            <div className="ml-1 text-xs text-[hsl(var(--muted))]">
              {stars === 3 && "완벽! ★★★"}
              {stars === 2 && "거의 다 왔어요"}
              {stars === 1 && "정답 도착"}
              {stars === 0 && "다시 도전해보세요"}
            </div>
          </motion.div>

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
