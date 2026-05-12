"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, CalendarCheck, Flame } from "lucide-react";
import { CASE_ORDER, getCase } from "@/lib/cases";
import { useStore } from "@/lib/store";

/**
 * Phase C — Daily Challenge.
 *
 * Picks one case per day via a deterministic seed (today's YYYY-MM-DD).
 * The seed is computed client-side; the same date always yields the same case
 * during a 24-hour window.
 *
 * The case itself isn't perturbed (Phase C is a minimal slice — perturbing
 * the engine values would require new fixtures). Instead, the daily wraps the
 * existing case with a "오늘의 도전" framing and links to /cases/{caseId}.
 */

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** xfnv1a — fast deterministic 32-bit hash. Same string → same output. */
function hashString(input: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pickCaseForDate(dateISO: string): string {
  const idx = hashString(dateISO) % CASE_ORDER.length;
  return CASE_ORDER[idx]!;
}

export default function DailyPage() {
  const streak = useStore((s) => s.profile.streak);
  const [hydrated, setHydrated] = useState(false);
  const [today, setToday] = useState("");
  const [caseId, setCaseId] = useState<string>(CASE_ORDER[0]!);

  useEffect(() => {
    const iso = todayISO();
    setToday(iso);
    setCaseId(pickCaseForDate(iso));
    setHydrated(true);
  }, []);

  const caseDef = getCase(caseId);

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden mesh-bg px-5 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/4 top-1/4 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[hsl(45_92%_55%/0.06)] blur-3xl"
      />

      <div className="relative z-10 flex w-full max-w-xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-[hsl(var(--muted))] transition-colors hover:bg-[hsl(var(--surface-200))] hover:text-[hsl(var(--fg))]"
            aria-label="홈으로"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div
            className="flex items-center gap-1.5 rounded-full border border-[hsl(45_92%_55%/0.4)] bg-[hsl(45_92%_55%/0.08)] px-3 py-1.5 text-xs font-semibold text-[hsl(45_92%_60%)]"
            data-test="daily-streak"
          >
            <Flame className="h-3.5 w-3.5" />
            {hydrated ? (
              streak > 0 ? `${streak}일 연속` : "오늘 첫 도전"
            ) : "..."}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="relative overflow-hidden rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-100))] p-7 shadow-elevated"
          data-test="daily-card"
        >
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[hsl(45_92%_55%/0.12)] text-[hsl(45_92%_60%)]">
                <CalendarCheck className="h-4 w-4" />
              </span>
              <span className="text-xs font-bold uppercase tracking-widest text-[hsl(45_92%_60%)]">
                오늘의 도전 · {hydrated ? today : "··"}
              </span>
            </div>

            <h1 className="text-2xl font-extrabold leading-tight text-[hsl(var(--fg))]" data-test="daily-title">
              {hydrated && caseDef ? caseDef.title : "···"}
            </h1>

            <p className="text-sm leading-relaxed text-[hsl(var(--muted))]" data-test="daily-scenario">
              {hydrated && caseDef ? caseDef.scenario : ""}
            </p>

            <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-200)/0.4)] px-4 py-3">
              <p className="text-xs leading-relaxed text-[hsl(var(--fg)/0.7)]">
                매일 다른 케이스가 한 개씩 출제됩니다. 케이스를 풀면 연속 도전 기록이 1일 늘어납니다.
              </p>
            </div>

            <Link
              href={`/cases/${caseId}`}
              data-test="daily-start"
              className="flex items-center justify-center gap-1.5 rounded-xl bg-[hsl(var(--accent))] px-5 py-3 text-sm font-bold text-white transition-all hover:bg-[hsl(var(--accent-dim))] active:scale-[0.98]"
            >
              오늘의 도전 시작
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
