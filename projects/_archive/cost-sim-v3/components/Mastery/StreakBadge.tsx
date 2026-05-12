"use client";

import { useEffect, useState } from "react";
import { Flame } from "lucide-react";
import { useStore } from "@/lib/store";

/**
 * Phase C — daily streak badge. Shows the consecutive-day streak from the
 * persisted profile. Renders compactly inline; useful in the home header.
 *
 * Streak = 0 → "오늘 첫 도전" placeholder.
 * Streak ≥ 1 → 🔥 + number badge.
 */
export default function StreakBadge() {
  const streak = useStore((s) => s.profile.streak);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const value = hydrated ? streak : 0;

  return (
    <div
      data-test="streak-badge"
      data-streak={value}
      className="flex items-center gap-1.5 rounded-full border border-[hsl(var(--accent)/0.3)] bg-[hsl(var(--accent)/0.08)] px-3 py-1.5 text-xs font-semibold text-[hsl(var(--accent))]"
    >
      <Flame className="h-3.5 w-3.5" />
      {value > 0 ? (
        <span>
          <span className="tabular-nums">{value}</span>일 연속
        </span>
      ) : (
        <span>오늘 첫 도전</span>
      )}
    </div>
  );
}
