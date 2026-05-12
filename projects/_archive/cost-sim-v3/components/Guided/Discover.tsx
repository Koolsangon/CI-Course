"use client";

import { motion } from "framer-motion";
import { ArrowRight, Search } from "lucide-react";
import type { CaseDef } from "@/lib/cases";
import { useStore } from "@/lib/store";
import Button from "@/components/ui/Button";
import ParamPanel from "@/components/ParamPanel/ParamPanel";
import CostTreeView from "@/components/CostTree/CostTreeView";
import FormulaInspector from "@/components/FormulaInspector/FormulaInspector";

export default function Discover({ caseDef }: { caseDef: CaseDef }) {
  const advance   = useStore((s) => s.advanceGuidedPhase);
  const result    = useStore((s) => s.result);
  const params    = useStore((s) => s.params);
  const lastDelta = useStore((s) => s.lastDelta);

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col gap-4"
    >
      {/* Phase header */}
      <div className="flex items-center gap-3 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-100))] px-4 py-3">
        <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--accent)/0.12)] text-[hsl(var(--accent))]">
          <Search className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <span className="block text-xs font-bold uppercase tracking-widest text-[hsl(var(--accent))]">
            Discover · 3분
          </span>
          <p className="mt-0.5 text-sm text-[hsl(var(--muted))] leading-snug">
            {caseDef.phases.discover}
          </p>
        </div>
      </div>

      {/* Three-column layout */}
      <div className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-[280px_1fr_272px]">
        <ParamPanel key={caseDef.id} caseId={caseDef.id} />

        <div className="min-h-[480px] overflow-hidden rounded-2xl border border-[hsl(var(--border))] shadow-card">
          <CostTreeView result={result} params={params} changedPaths={lastDelta} />
        </div>

        <FormulaInspector />
      </div>

      <div className="flex justify-end">
        <Button variant="accent" size="md" onClick={advance}>
          이해했어요 <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </motion.section>
  );
}
