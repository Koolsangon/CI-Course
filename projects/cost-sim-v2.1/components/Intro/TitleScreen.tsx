"use client";

import { motion } from "framer-motion";
import { Play, FastForward } from "lucide-react";

interface TitleScreenProps {
  onStart: () => void;
  onSkip: () => void;
  reducedMotion: boolean;
}

const PARTICLES = Array.from({ length: 16 }, (_, i) => ({
  id: i,
  left: (i * 53) % 100,
  delay: (i * 0.37) % 6,
  duration: 7 + ((i * 1.3) % 6)
}));

export function TitleScreen({ onStart, onSkip, reducedMotion }: TitleScreenProps) {
  return (
    <div className="relative flex w-full max-w-3xl flex-col items-center gap-7 text-center">
      {/* Floating particles — subtle LG-red glow on light bg */}
      {!reducedMotion && (
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          {PARTICLES.map((p) => (
            <span
              key={p.id}
              className="absolute bottom-[-10px] h-1 w-1 rounded-full"
              style={{
                left: `${p.left}%`,
                background: "hsl(345 100% 32% / 0.45)",
                animation: `intro-float ${p.duration}s linear ${p.delay}s infinite`,
                boxShadow: "0 0 8px hsl(349 100% 45% / 0.4)"
              }}
            />
          ))}
        </div>
      )}

      <motion.div
        initial={reducedMotion ? false : { opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reducedMotion ? 0 : 0.5 }}
        className="text-xs font-mono uppercase tracking-[0.4em] text-[hsl(var(--accent))]"
      >
        Cost Operations · 2026
      </motion.div>

      <motion.h1
        initial={reducedMotion ? false : { opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: reducedMotion ? 0 : 0.6, delay: reducedMotion ? 0 : 0.1 }}
        className="text-5xl font-black leading-tight tracking-tight text-[hsl(var(--fg))] sm:text-7xl"
        style={{
          textShadow: "0 1px 0 rgba(255,255,255,0.6), 0 0 30px hsl(345 100% 32% / 0.18)"
        }}
      >
        살아있는 원가 트리
      </motion.h1>

      <motion.p
        initial={reducedMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reducedMotion ? 0 : 0.5, delay: reducedMotion ? 0 : 0.25 }}
        className="max-w-md text-sm leading-relaxed text-[hsl(var(--muted))] sm:text-base"
      >
        신입 사원 — 자네의 임무는 공장의 원가 흐름을 추적하고,
        <br className="hidden sm:block" />
        COP · COM · SGA의 비밀을 풀어내는 것이다.
      </motion.p>

      <motion.div
        initial={reducedMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reducedMotion ? 0 : 0.5, delay: reducedMotion ? 0 : 0.4 }}
        className="flex flex-wrap items-center justify-center gap-3"
      >
        <button
          type="button"
          onClick={onStart}
          className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--accent))] px-7 py-3 text-sm font-bold text-white shadow-elevated transition hover:scale-[1.02] hover:bg-[hsl(var(--accent)/0.9)] active:scale-[0.98]"
        >
          <Play className="h-4 w-4" /> 출근하기
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--surface-100))] px-5 py-3 text-sm font-medium text-[hsl(var(--muted))] transition hover:border-[hsl(var(--accent)/0.4)] hover:text-[hsl(var(--accent))]"
        >
          <FastForward className="h-4 w-4" /> 인트로 건너뛰기
        </button>
      </motion.div>

      <motion.p
        initial={reducedMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reducedMotion ? 0 : 0.5, delay: reducedMotion ? 0 : 0.6 }}
        className="text-[11px] font-mono uppercase tracking-widest text-[hsl(var(--muted)/0.7)]"
      >
        ESC · 언제든 건너뛰기
      </motion.p>
    </div>
  );
}
