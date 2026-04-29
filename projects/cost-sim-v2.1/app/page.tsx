"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { TreePine, ClipboardList, ArrowRight, Zap } from "lucide-react";

const cards = [
  {
    href: "/sandbox",
    icon: TreePine,
    label: "자유 실험실",
    sublabel: "Sandbox",
    description:
      "슬라이더를 움직이며 Loading·재료비·수율·면취수·Mask·Tact의 인과관계를 실시간으로 추적합니다. COP·COM·SGA 원가 트리가 즉시 반응합니다.",
    features: [
      "4개 케이스 시나리오 전환",
      "실시간 원가 트리 시각화",
      "수식 인스펙터 — 변화율 추적",
      "변수별 종속관계 설명"
    ],
    accent: "from-[hsl(345_100%_32%/0.08)] to-[hsl(345_100%_32%/0.02)]",
    border: "border-[hsl(345_100%_32%/0.2)] hover:border-[hsl(345_100%_32%/0.5)]",
    iconColor: "text-[hsl(var(--accent))]",
    btnClass: "bg-[hsl(var(--accent))] text-white hover:bg-[hsl(var(--accent)/0.9)]"
  },
  {
    href: "/cases",
    icon: ClipboardList,
    label: "원가 계산 워크시트",
    sublabel: "Worksheet",
    description:
      "엑셀 워크시트처럼 빈 셀에 직접 값을 입력하고 채점합니다. 시뮬레이션에서 관찰한 원리를 수식으로 검증하세요.",
    features: [
      "4개 문제 — Loading, 재료비·수율, 면취수·Mask, Tact·투자",
      "Yellow 셀 입력 → Blue 셀 자동 계산",
      "즉시 채점 — O/X 판정 + 점수",
      "기준값 → 시뮬레이션 비교"
    ],
    accent: "from-[hsl(123_46%_34%/0.08)] to-[hsl(123_46%_34%/0.02)]",
    border: "border-[hsl(123_46%_34%/0.2)] hover:border-[hsl(123_46%_34%/0.5)]",
    iconColor: "text-[hsl(var(--success))]",
    btnClass: "bg-[hsl(var(--success))] text-white hover:bg-[hsl(var(--success)/0.9)]"
  }
];

export default function HomePage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden mesh-bg">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/4 top-1/4 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[hsl(345_100%_32%/0.04)] blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-1/4 right-1/4 h-80 w-80 translate-x-1/2 translate-y-1/2 rounded-full bg-[hsl(349_100%_45%/0.03)] blur-3xl"
      />

      <div className="relative z-10 flex w-full max-w-4xl flex-col items-center gap-10 px-5 py-12">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[hsl(var(--accent)/0.12)] ring-1 ring-[hsl(var(--accent)/0.3)]"
        >
          <Zap className="h-7 w-7 text-[hsl(var(--accent))]" />
        </motion.div>

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center gap-3 text-center"
        >
          <h1 className="text-4xl font-extrabold tracking-tight text-[hsl(var(--fg))] sm:text-5xl">
            살아있는 원가 트리
          </h1>
          <p className="max-w-lg text-base text-[hsl(var(--muted))] sm:text-lg">
            COP · COM · SGA 구조를 눈으로 추적하는
            <br className="hidden sm:block" />
            인터랙티브 원가 시뮬레이터
          </p>
          <span className="mt-1 rounded-full bg-[hsl(var(--surface-200))] px-3 py-1 text-xs font-medium text-[hsl(var(--muted))]">
            v2.1
          </span>
        </motion.div>

        {/* 2-card grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="grid w-full grid-cols-1 gap-8 md:grid-cols-2"
        >
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.href}
                href={card.href}
                className={[
                  "group relative flex flex-col gap-5 overflow-hidden rounded-3xl border p-8",
                  "bg-gradient-to-br transition-all duration-300 min-h-[320px]",
                  "hover:-translate-y-1 hover:shadow-elevated active:scale-[0.98]",
                  card.accent,
                  card.border
                ].join(" ")}
              >
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-[hsl(var(--surface-200)/0.5)] ${card.iconColor}`}>
                  <Icon className="h-6 w-6" />
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-bold text-[hsl(var(--fg))]">
                      {card.label}
                    </span>
                    <span className="text-xs text-[hsl(var(--muted))]">
                      {card.sublabel}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-[hsl(var(--muted))]">
                    {card.description}
                  </p>
                </div>

                <ul className="flex flex-col gap-1.5">
                  {card.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-[hsl(var(--muted)/0.9)]">
                      <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-[hsl(var(--muted)/0.4)]" />
                      {f}
                    </li>
                  ))}
                </ul>

                <div className="mt-auto">
                  <span
                    className={[
                      "inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors",
                      card.btnClass
                    ].join(" ")}
                  >
                    시작하기 <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </Link>
            );
          })}
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-xs text-[hsl(var(--muted)/0.5)]"
        >
          Cost Sim v2.1 — 개발원가 시뮬레이션
        </motion.p>
      </div>
    </main>
  );
}
