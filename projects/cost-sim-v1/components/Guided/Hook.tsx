"use client";

import { motion } from "framer-motion";
import { ArrowRight, Lightbulb } from "lucide-react";
import type { CaseDef } from "@/lib/cases";
import { useStore } from "@/lib/store";
import Button from "@/components/ui/Button";

export default function Hook({ caseDef }: { caseDef: CaseDef }) {
  const advance = useStore((s) => s.advanceGuidedPhase);

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col gap-6"
    >
      {/* Big scenario card */}
      <div className="relative overflow-hidden rounded-3xl border border-[hsl(var(--border))] bg-gradient-to-br from-[hsl(var(--surface-100))] to-[hsl(var(--surface-200)/0.5)] p-7 shadow-elevated">
        {/* Decorative glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[hsl(var(--accent)/0.08)] blur-3xl"
        />

        <div className="relative flex flex-col gap-5">
          {/* Phase badge */}
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[hsl(var(--accent)/0.12)] text-[hsl(var(--accent))]">
              <Lightbulb className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-widest text-[hsl(var(--accent))]">
              Hook · 1분
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-extrabold leading-tight text-[hsl(var(--fg))]">
              {caseDef.title}
            </h2>
            <p className="text-base leading-relaxed text-[hsl(var(--muted))]">
              {caseDef.scenario}
            </p>
          </div>

          {/* Hook narrative */}
          <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-200)/0.4)] px-4 py-3">
            <p className="text-sm italic leading-relaxed text-[hsl(var(--fg)/0.75)]">
              &ldquo;{caseDef.phases.hook}&rdquo;
            </p>
          </div>
        </div>
      </div>

      {/* CTA — pinned feel */}
      <div className="flex justify-end">
        <Button variant="accent" size="lg" onClick={advance}>
          Discover로 이동 <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </motion.section>
  );
}
