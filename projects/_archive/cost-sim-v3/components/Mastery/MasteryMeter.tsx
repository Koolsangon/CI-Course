"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { VARIABLES, MASTERY_CAP } from "@/lib/variables";

/**
 * Phase C — Variable Mastery Meter.
 *
 * Six-row 5-dot meter shown on the home page. Each row = one cost variable.
 * A dot lights up when the player has solved a tagged case correctly.
 * Cap = 5; future Phase C+ may extend to crown tier at 5.
 */
export default function MasteryMeter() {
  const mastery = useStore((s) => s.variableMastery);
  const [hydrated, setHydrated] = useState(false);

  // Defer first paint until zustand persist has rehydrated to avoid an SSR
  // mismatch where the meter shows 0 then jumps to the persisted value.
  useEffect(() => setHydrated(true), []);

  return (
    <section
      data-test="mastery-meter"
      className="rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-100))] p-5 shadow-card"
    >
      <header className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-bold text-[hsl(var(--fg))]">내 원가 감각</h3>
        <span className="text-[10px] text-[hsl(var(--muted))]">변수별 마스터리 · {MASTERY_CAP}점 만점</span>
      </header>
      <ul className="flex flex-col gap-2">
        {VARIABLES.map((v) => {
          const level = (hydrated ? mastery[v.id] : 0) ?? 0;
          return (
            <li
              key={v.id}
              className="flex items-center justify-between gap-3"
              data-test={`mastery-row-${v.id}`}
              data-level={level}
            >
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-[hsl(var(--fg)/0.9)]">{v.ko}</div>
                <div className="text-[10px] text-[hsl(var(--muted)/0.7)]">{v.hint}</div>
              </div>
              <div className="flex items-center gap-1.5">
                {Array.from({ length: MASTERY_CAP }, (_, i) => {
                  const filled = i < level;
                  return (
                    <span
                      key={i}
                      className={[
                        "h-2.5 w-2.5 rounded-full transition-all duration-300",
                        filled
                          ? "bg-[hsl(var(--accent))] shadow-[0_0_8px_hsl(var(--accent)/0.6)]"
                          : "bg-[hsl(var(--surface-300)/0.4)]"
                      ].join(" ")}
                      aria-hidden
                    />
                  );
                })}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
