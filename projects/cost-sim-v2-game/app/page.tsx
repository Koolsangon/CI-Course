"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { TreePine, BookOpen, ArrowRight, Zap, CalendarCheck, Skull, Lock } from "lucide-react";
import MasteryMeter from "@/components/Mastery/MasteryMeter";
import StreakBadge from "@/components/Mastery/StreakBadge";
import { useStore } from "@/lib/store";
import { isBossUnlocked, BOSS_CASE_ID, getCase, CASE_ORDER } from "@/lib/cases";

const modes = [
  {
    href: "/sandbox",
    icon: TreePine,
    label: "Sandbox",
    sublabel: "자유 탐색 모드",
    description:
      "슬라이더를 움직이며 BOM·수율·Loading·면취수·Mask·Tact의 인과관계를 실시간으로 추적합니다.",
    accent: "from-[hsl(345_100%_32%/0.08)] to-[hsl(345_100%_32%/0.02)]",
    border: "border-[hsl(345_100%_32%/0.2)] hover:border-[hsl(345_100%_32%/0.5)]",
    iconColor: "text-[hsl(var(--accent))]",
    tag: "실시간"
  },
  {
    href: "/cases/01-loading",
    icon: BookOpen,
    label: "Guided Cases",
    sublabel: "단계별 학습 모드",
    description:
      "Hook → Discover → Apply → Reflect 4단계로 원가 구조 해석력을 체계적으로 쌓습니다.",
    accent: "from-[hsl(123_46%_34%/0.08)] to-[hsl(123_46%_34%/0.02)]",
    border: "border-[hsl(123_46%_34%/0.2)] hover:border-[hsl(123_46%_34%/0.5)]",
    iconColor: "text-[hsl(var(--success))]",
    tag: "6 Cases"
  },
  {
    href: "/daily",
    icon: CalendarCheck,
    label: "오늘의 도전",
    sublabel: "데일리 챌린지",
    description:
      "매일 한 케이스를 무작위로 골라 출제합니다. 매일 들러서 연속 도전 기록을 쌓으세요.",
    accent: "from-[hsl(30_98%_47%/0.08)] to-[hsl(30_98%_47%/0.02)]",
    border: "border-[hsl(30_98%_47%/0.2)] hover:border-[hsl(30_98%_47%/0.5)]",
    iconColor: "text-[hsl(var(--warn))]",
    tag: "매일"
  }
];

export default function HomePage() {
  const caseScores = useStore((s) => s.caseScores);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const bossUnlocked = hydrated && isBossUnlocked(caseScores);
  const threeStarCount = hydrated
    ? CASE_ORDER.filter((id) => (caseScores[id]?.stars ?? 0) >= 3).length
    : 0;
  const bossCase = getCase(BOSS_CASE_ID);

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden mesh-bg">
      {/* Background blobs — subtle LG Red warmth */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/4 top-1/4 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[hsl(345_100%_32%/0.04)] blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-1/4 right-1/4 h-80 w-80 translate-x-1/2 translate-y-1/2 rounded-full bg-[hsl(349_100%_45%/0.03)] blur-3xl"
      />

      <div className="relative z-10 flex w-full max-w-3xl flex-col items-center gap-8 px-5 py-12">
        {/* Logo mark */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[hsl(var(--accent)/0.12)] ring-1 ring-[hsl(var(--accent)/0.3)]"
        >
          <Zap className="h-7 w-7 text-[hsl(var(--accent))]" />
        </motion.div>

        {/* Hero text */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center gap-3 text-center"
        >
          <h1 className="text-4xl font-extrabold tracking-tight text-[hsl(var(--fg))] sm:text-5xl">
            살아있는 원가 트리
          </h1>
          <p className="max-w-md text-base text-[hsl(var(--muted))] sm:text-lg">
            COP · COM · SGA 구조를 눈으로 추적하는
            <br className="hidden sm:block" />
            인터랙티브 원가 시뮬레이터
          </p>
          <div className="mt-1 flex items-center gap-2">
            <span className="rounded-full bg-[hsl(var(--surface-200))] px-3 py-1 text-xs font-medium text-[hsl(var(--muted))]">
              v2.0
            </span>
            <StreakBadge />
          </div>
        </motion.div>

        {/* Mode cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="grid w-full grid-cols-1 gap-4 sm:grid-cols-3"
        >
          {modes.map((mode) => {
            const Icon = mode.icon;
            return (
              <Link
                key={mode.href}
                href={mode.href}
                className={[
                  "group relative flex flex-col gap-4 overflow-hidden rounded-3xl border p-6",
                  "bg-gradient-to-br transition-all duration-300",
                  "hover:-translate-y-1 hover:shadow-elevated active:scale-[0.98]",
                  mode.accent,
                  mode.border
                ].join(" ")}
              >
                {/* Tag */}
                <span className="absolute right-4 top-4 rounded-full bg-[hsl(var(--surface-200)/0.6)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-[hsl(var(--muted))]">
                  {mode.tag}
                </span>

                <div className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-[hsl(var(--surface-200)/0.5)] ${mode.iconColor}`}>
                  <Icon className="h-5 w-5" />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-bold text-[hsl(var(--fg))]">
                      {mode.label}
                    </span>
                    <span className="text-xs text-[hsl(var(--muted))]">
                      {mode.sublabel}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-[hsl(var(--muted))]">
                    {mode.description}
                  </p>
                </div>

                <div className={`flex items-center gap-1 text-xs font-semibold ${mode.iconColor} opacity-0 transition-opacity group-hover:opacity-100`}>
                  시작하기 <ArrowRight className="h-3 w-3" />
                </div>
              </Link>
            );
          })}
        </motion.div>

        {/* Boss case card — locked until 6/6 three-stars */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.24, ease: [0.16, 1, 0.3, 1] }}
          className="w-full"
          data-test="boss-card"
          data-unlocked={bossUnlocked ? "true" : "false"}
        >
          {bossUnlocked && bossCase ? (
            <Link
              href={`/cases/${BOSS_CASE_ID}`}
              data-test="boss-link"
              className="group relative flex items-center gap-4 overflow-hidden rounded-3xl border border-[hsl(345_100%_32%/0.4)] bg-gradient-to-br from-[hsl(345_100%_32%/0.1)] to-[hsl(349_100%_45%/0.04)] p-5 transition-all hover:-translate-y-1 hover:shadow-elevated"
            >
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-[hsl(var(--surface-200)/0.5)] text-[hsl(345_100%_32%)]">
                <Skull className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[hsl(345_100%_32%)]">
                  BOSS · UNLOCKED
                </span>
                <div className="text-base font-bold text-[hsl(var(--fg))]">{bossCase.title}</div>
                <p className="mt-1 text-xs text-[hsl(var(--muted))] line-clamp-2">{bossCase.scenario}</p>
              </div>
              <ArrowRight className="h-4 w-4 flex-shrink-0 text-[hsl(345_100%_32%)] opacity-60 transition-opacity group-hover:opacity-100" />
            </Link>
          ) : (
            <div className="relative flex items-center gap-4 overflow-hidden rounded-3xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--surface-100)/0.5)] p-5">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-[hsl(var(--surface-200)/0.5)] text-[hsl(var(--muted))]">
                <Lock className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--muted))]">
                  BOSS · LOCKED
                </span>
                <div className="text-sm font-bold text-[hsl(var(--fg)/0.7)]">Q3 위기 — 3중고 동시 충격</div>
                <p className="mt-1 text-xs text-[hsl(var(--muted))]">
                  6 케이스 모두 ★★★ 달성 시 잠금 해제 · 현재{" "}
                  <span className="font-semibold tabular-nums text-[hsl(var(--fg))]" data-test="boss-progress">
                    {threeStarCount}
                  </span>
                  /6
                </p>
              </div>
            </div>
          )}
        </motion.div>

        {/* Mastery section */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="w-full"
        >
          <MasteryMeter />
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-xs text-[hsl(var(--muted)/0.5)]"
        >
          Cost Sim v2 — 개발원가 시뮬레이션 게임
        </motion.p>
      </div>
    </main>
  );
}
