"use client";

import { useStore } from "@/lib/store";
import { CAMPAIGN, REFERENCE_TOTAL_PROFIT, SURVIVAL_FLOOR, getMonthForCase } from "@/lib/campaign";

/**
 * Thin campaign progress bar — shown in the case-page header.
 * Displays cumulativeProfit vs survivalFloor on a 0..REFERENCE_TOTAL scale,
 * with month markers showing which months have been committed.
 *
 * Survival floor is **advisory** in v2.0 (not a hard gate). The bar colors
 * red below the floor; the player still progresses normally.
 */
export default function QuarterBar({ caseId }: { caseId: string }) {
  const cumulative = useStore((s) => s.campaign.cumulativeProfit);
  const caseScores = useStore((s) => s.caseScores);

  const month = getMonthForCase(caseId);
  if (!month) return null;

  const total = REFERENCE_TOTAL_PROFIT;
  const cumPct = total > 0 ? Math.max(0, Math.min(1, cumulative / total)) : 0;
  const floorPct = total > 0 ? Math.max(0, Math.min(1, SURVIVAL_FLOOR / total)) : 0;
  const aboveFloor = cumulative >= SURVIVAL_FLOOR;
  const committedCount = Object.keys(caseScores).length;

  return (
    <div
      className="flex flex-col gap-1.5"
      data-test="campaign-bar"
      data-progress={cumPct.toFixed(3)}
      data-committed-count={committedCount}
      data-cumulative-raw={cumulative.toFixed(2)}
    >
      <div className="flex items-baseline justify-between gap-2 text-[10px]">
        <span className="font-semibold uppercase tracking-wider text-[hsl(var(--muted))]">
          분기 누적
        </span>
        <span className="tabular-nums">
          <span className={aboveFloor ? "font-bold text-[hsl(var(--success))]" : "font-bold text-[hsl(var(--danger))]"}>
            ${cumulative.toFixed(1)}
          </span>
          <span className="text-[hsl(var(--muted)/0.6)]"> / 생존선 ${SURVIVAL_FLOOR.toFixed(1)}</span>
        </span>
      </div>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-[hsl(var(--surface-300)/0.4)]">
        {/* Survival floor marker */}
        <div
          aria-hidden
          className="absolute top-0 h-full w-px bg-[hsl(var(--warn)/0.8)]"
          style={{ left: `${floorPct * 100}%` }}
        />
        {/* Cumulative profit fill */}
        <div
          className={[
            "absolute top-0 h-full rounded-full transition-all duration-500",
            aboveFloor
              ? "bg-gradient-to-r from-[hsl(var(--success)/0.6)] to-[hsl(var(--success))]"
              : "bg-gradient-to-r from-[hsl(var(--danger)/0.5)] to-[hsl(var(--danger)/0.85)]"
          ].join(" ")}
          style={{ width: `${cumPct * 100}%` }}
        />
        {/* Month markers */}
        {CAMPAIGN.months.map((m, i) => {
          const x = ((i + 1) / CAMPAIGN.months.length) * 100;
          const completed = !!caseScores[m.caseId];
          return (
            <div
              key={m.month}
              aria-hidden
              className={[
                "absolute top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full",
                completed ? "bg-[hsl(var(--accent))]" : "bg-[hsl(var(--surface-300))]"
              ].join(" ")}
              style={{ left: `${x}%` }}
            />
          );
        })}
      </div>
    </div>
  );
}
