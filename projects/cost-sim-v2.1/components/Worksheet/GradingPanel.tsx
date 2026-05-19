"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import Button from "@/components/ui/Button";
import type { WeightedScore } from "@/lib/worksheet-engine";

interface GradingPanelProps {
  onGrade: () => void;
  onReset: () => void;
  score: number | null;
  total: number;
  graded: boolean;
  weighted?: WeightedScore | null;
}

export default function GradingPanel({
  onGrade,
  onReset,
  score,
  total,
  graded,
  weighted
}: GradingPanelProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-100))] px-6 py-4 shadow-card md:flex-row md:items-center">
      {graded ? (
        <>
          <div className="flex flex-1 items-center gap-3">
            {score === total ? (
              <CheckCircle2 className="h-6 w-6 flex-shrink-0 text-[hsl(var(--success))]" />
            ) : (
              <XCircle className="h-6 w-6 flex-shrink-0 text-[hsl(var(--danger))]" />
            )}
            <div className="flex flex-col">
              <div className="flex items-baseline gap-2">
                {weighted ? (
                  <>
                    <span className="text-lg font-bold tabular-nums text-[hsl(var(--fg))]">
                      {weighted.weightedScore.toFixed(1)} / {total}
                    </span>
                    <span className="text-xs text-[hsl(var(--muted))] tabular-nums">
                      (정답 {weighted.rawScore}/{total}
                      {weighted.hintPenalty > 0
                        ? ` · 힌트 차감 −${weighted.hintPenalty.toFixed(1)}`
                        : ""}
                      )
                    </span>
                  </>
                ) : (
                  <span className="text-lg font-bold tabular-nums text-[hsl(var(--fg))]">
                    {score}/{total}
                  </span>
                )}
              </div>
              <span className="text-xs text-[hsl(var(--muted))]">
                {score === total
                  ? weighted && weighted.hintPenalty === 0
                    ? "완벽합니다! 힌트 없이 풀었어요."
                    : "전부 정답입니다."
                  : "X 표시된 셀을 다시 풀어보세요 (정답 셀은 유지됩니다)"}
              </span>
            </div>
          </div>
          <div className="md:ml-auto">
            <Button variant="ghost" size="sm" onClick={onReset}>
              다시 풀기
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-[hsl(var(--muted))]">
            Yellow 셀에 답을 입력한 후 채점 버튼을 누르세요 (소수점 첫째 자리까지).
            <span className="ml-1 text-[hsl(var(--warn))]">
              힌트를 본 셀은 배점이 줄어듭니다.
            </span>
          </p>
          <div className="md:ml-auto">
            <Button variant="accent" size="md" onClick={onGrade}>
              채점하기
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
