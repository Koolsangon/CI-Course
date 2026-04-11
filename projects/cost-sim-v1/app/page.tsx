"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { TreePine, BookOpen, ArrowRight, Zap } from "lucide-react";

const modes = [
  {
    href: "/sandbox",
    icon: TreePine,
    label: "Sandbox",
    sublabel: "자유 탐색 모드",
    description:
      "슬라이더를 움직이며 BOM·수율·Loading·면취수·Mask·Tact의 인과관계를 실시간으로 추적합니다.",
    accent: "from-[hsl(189_96%_43%/0.15)] to-[hsl(189_96%_43%/0.04)]",
    border: "border-[hsl(189_96%_43%/0.25)] hover:border-[hsl(189_96%_43%/0.6)]",
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
    accent: "from-[hsl(160_72%_40%/0.15)] to-[hsl(160_72%_40%/0.04)]",
    border: "border-[hsl(160_72%_40%/0.25)] hover:border-[hsl(160_72%_40%/0.6)]",
    iconColor: "text-[hsl(var(--success))]",
    tag: "6 Cases"
  }
];

export default function HomePage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden mesh-bg">
      {/* Background blobs */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/4 top-1/4 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[hsl(189_96%_43%/0.06)] blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-1/4 right-1/4 h-80 w-80 translate-x-1/2 translate-y-1/2 rounded-full bg-[hsl(250_80%_60%/0.05)] blur-3xl"
      />

      <div className="relative z-10 flex w-full max-w-2xl flex-col items-center gap-10 px-5 py-16">
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
          <span className="mt-1 rounded-full bg-[hsl(var(--surface-200))] px-3 py-1 text-xs font-medium text-[hsl(var(--muted))]">
            v1.0
          </span>
        </motion.div>

        {/* Mode cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2"
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

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-xs text-[hsl(var(--muted)/0.5)]"
        >
          Cost Sim v1 — 개발원가 시뮬레이션 학습 도구
        </motion.p>
      </div>
    </main>
  );
}
