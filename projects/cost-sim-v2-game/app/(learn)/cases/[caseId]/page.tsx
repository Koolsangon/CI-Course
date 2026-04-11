"use client";

import { notFound, useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, MessageCircle } from "lucide-react";
import { getCase, CASE_ORDER } from "@/lib/cases";
import { useStore } from "@/lib/store";
import { getMonthForCase, CAMPAIGN } from "@/lib/campaign";
import ProgressBar from "@/components/Guided/ProgressBar";
import Hook from "@/components/Guided/Hook";
import Discover from "@/components/Guided/Discover";
import Apply from "@/components/Guided/Apply";
import Reflect from "@/components/Guided/Reflect";
import CoachDrawer from "@/components/CoachDrawer/CoachDrawer";
import QuarterBar from "@/components/Campaign/QuarterBar";
import IntroModal from "@/components/Campaign/IntroModal";

export default function CasePage() {
  const params  = useParams<{ caseId: string }>();
  const caseId  = params?.caseId;
  const phase   = useStore((s) => s.guidedPhase);
  const loadCase = useStore((s) => s.loadCase);
  const setGuidedPhase = useStore((s) => s.setGuidedPhase);
  const [coachOpen, setCoachOpen] = useState(false);

  const caseDef = caseId ? getCase(caseId) : undefined;

  // Prime the store so Hook phase can call advanceGuidedPhase() without waiting
  // for ParamPanel to mount. Also reset to "hook" whenever the caseId changes
  // so a fresh visit always begins at phase 1.
  useEffect(() => {
    if (!caseDef) return;
    loadCase(caseDef.id, caseDef.reference);
    setGuidedPhase("hook");
  }, [caseDef, loadCase, setGuidedPhase]);

  if (!caseId) return notFound();
  if (!caseDef) return notFound();

  const idx        = CASE_ORDER.indexOf(caseId as (typeof CASE_ORDER)[number]);
  const nextCaseId = idx >= 0 && idx < CASE_ORDER.length - 1 ? CASE_ORDER[idx + 1] : null;
  const month      = getMonthForCase(caseId);

  return (
    <div className="flex min-h-screen flex-col bg-[hsl(var(--bg))]">
      <header className="sticky top-0 z-10 flex flex-shrink-0 items-center gap-3 border-b border-[hsl(var(--border))] bg-[hsl(var(--surface-100)/0.85)] px-4 py-3 backdrop-blur-md">
        <Link
          href="/"
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl text-[hsl(var(--muted))] transition-colors hover:bg-[hsl(var(--surface-200))] hover:text-[hsl(var(--fg))]"
          aria-label="홈으로"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>

        <div className="min-w-0 flex-1">
          <p className="text-xs text-[hsl(var(--muted))]" data-test="case-month-label">
            {month ? `${month.label} · ${CAMPAIGN.id.toUpperCase()}` : `Case ${idx + 1}`}
          </p>
          <h1 className="truncate text-sm font-bold text-[hsl(var(--fg))]">
            {caseDef.title}
          </h1>
        </div>

        <div className="hidden sm:block">
          <ProgressBar caseId={caseDef.id} />
        </div>

        <button
          onClick={() => setCoachOpen(true)}
          aria-label="코치 열기"
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border border-[hsl(var(--border))] text-[hsl(var(--muted))] transition-colors hover:bg-[hsl(var(--surface-200))] hover:text-[hsl(var(--accent))]"
        >
          <MessageCircle className="h-4 w-4" />
        </button>
      </header>

      <div className="border-b border-[hsl(var(--border))] bg-[hsl(var(--surface-100)/0.5)] px-4 py-2.5 sm:hidden">
        <ProgressBar caseId={caseDef.id} />
      </div>

      <div className="border-b border-[hsl(var(--border))] bg-[hsl(var(--surface-100)/0.4)] px-4 py-2">
        <div className="mx-auto max-w-5xl">
          <QuarterBar caseId={caseDef.id} />
        </div>
      </div>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={phase}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          >
            {phase === "hook"     && <Hook     caseDef={caseDef} />}
            {phase === "discover" && <Discover caseDef={caseDef} />}
            {phase === "apply"    && <Apply    caseDef={caseDef} />}
            {phase === "reflect"  && <Reflect  caseDef={caseDef} />}
          </motion.div>
        </AnimatePresence>
      </main>

      {nextCaseId && (
        <footer className="border-t border-[hsl(var(--border))] bg-[hsl(var(--surface-100)/0.5)] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto flex max-w-5xl justify-end">
            <Link
              href={`/cases/${nextCaseId}`}
              className="flex items-center gap-1.5 text-sm text-[hsl(var(--muted))] transition-colors hover:text-[hsl(var(--fg))]"
            >
              다음: {getCase(nextCaseId)?.title}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </footer>
      )}

      <CoachDrawer
        caseId={caseId}
        phase={phase}
        open={coachOpen}
        onClose={() => setCoachOpen(false)}
      />

      <IntroModal caseId={caseId} />
    </div>
  );
}
