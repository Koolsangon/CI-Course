"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";
import { CAMPAIGN } from "@/lib/campaign";
import Button from "@/components/ui/Button";

/**
 * Intro premise modal — shown once per profile on the very first /cases/01-loading visit.
 * Reads `profile.introSeen` from the persisted store. Dismiss = `markIntroSeen()`.
 *
 * Only renders on /cases/01-loading. Other case pages skip it (assume the user
 * either saw it on case 1 or jumped in mid-quarter intentionally).
 */
export default function IntroModal({ caseId }: { caseId: string }) {
  const introSeen = useStore((s) => s.profile.introSeen);
  const markIntroSeen = useStore((s) => s.markIntroSeen);
  const [hydrated, setHydrated] = useState(false);

  // zustand/persist hydrates client-side; defer rendering until we know real state
  useEffect(() => setHydrated(true), []);

  if (!hydrated) return null;
  if (caseId !== "01-loading") return null;
  if (introSeen) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="intro-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-6"
      >
        <motion.div
          key="intro-card"
          initial={{ y: 40, opacity: 0, scale: 0.96 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: "spring", stiffness: 220, damping: 28 }}
          className="relative w-full max-w-xl overflow-hidden rounded-t-3xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-100))] p-7 shadow-elevated sm:rounded-3xl"
          data-test="intro-modal"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-[hsl(var(--accent)/0.08)] blur-3xl"
          />
          <div className="relative flex flex-col gap-5">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[hsl(var(--accent))]">
                {CAMPAIGN.id.toUpperCase()}
              </span>
              <h2 className="text-2xl font-extrabold leading-tight text-[hsl(var(--fg))]">
                {CAMPAIGN.title}
              </h2>
              <p className="text-sm text-[hsl(var(--muted))]">{CAMPAIGN.tagline}</p>
            </div>
            <div className="flex flex-col gap-2.5 text-sm leading-relaxed text-[hsl(var(--fg)/0.85)]">
              {CAMPAIGN.premise.map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
            <Button
              variant="accent"
              size="lg"
              onClick={markIntroSeen}
              className="w-full"
              data-test="intro-dismiss"
            >
              1월을 시작합니다
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
