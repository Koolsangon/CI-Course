"use client";

import { useStore, type GuidedPhase } from "@/lib/store";
import PhaseChip from "@/components/ui/PhaseChip";

const PHASES: { id: GuidedPhase; label: string }[] = [
  { id: "hook",     label: "Hook" },
  { id: "discover", label: "Discover" },
  { id: "apply",    label: "Apply" },
  { id: "reflect",  label: "Reflect" }
];

export default function ProgressBar({ caseId }: { caseId: string }) {
  const current   = useStore((s) => s.guidedPhase);
  const completed = useStore((s) => s.guidedCompleted[caseId] ?? []);
  const setPhase  = useStore((s) => s.setGuidedPhase);

  return (
    <nav
      className="flex items-center gap-2 flex-wrap"
      aria-label="진행 단계"
    >
      {PHASES.map((p, i) => {
        const isDone    = completed.includes(p.id);
        const isCurrent = current === p.id;
        const state     = isCurrent ? "active" : isDone ? "done" : "locked";

        return (
          <PhaseChip
            key={p.id}
            label={p.label}
            index={i + 1}
            state={state}
            onClick={() => (isDone || isCurrent) && setPhase(p.id)}
          />
        );
      })}
    </nav>
  );
}
