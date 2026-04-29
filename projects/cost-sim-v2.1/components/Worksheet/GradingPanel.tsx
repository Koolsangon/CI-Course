"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import Button from "@/components/ui/Button";

interface GradingPanelProps {
  onGrade: () => void;
  onReset: () => void;
  score: number | null;
  total: number;
  graded: boolean;
}

export default function GradingPanel({ onGrade, onReset, score, total, graded }: GradingPanelProps) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-100))] px-6 py-4 shadow-card">
      {graded ? (
        <>
          <div className="flex items-center gap-2">
            {score === total ? (
              <CheckCircle2 className="h-6 w-6 text-[hsl(var(--success))]" />
            ) : (
              <XCircle className="h-6 w-6 text-[hsl(var(--danger))]" />
            )}
            <span className="text-lg font-bold tabular-nums text-[hsl(var(--fg))]">
              {score}/{total}
            </span>
            <span className="text-sm text-[hsl(var(--muted))]">
              {score === total ? "완벽합니다!" : "틀린 셀을 확인하세요"}
            </span>
          </div>
          <div className="ml-auto">
            <Button variant="ghost" size="sm" onClick={onReset}>
              다시 풀기
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-[hsl(var(--muted))]">
            Yellow 셀에 답을 입력한 후 채점 버튼을 누르세요 (소수점 첫째 자리까지)
          </p>
          <div className="ml-auto">
            <Button variant="accent" size="md" onClick={onGrade}>
              채점하기
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
