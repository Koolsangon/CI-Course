"use client";

import { Lightbulb } from "lucide-react";

interface SuggestionChipsProps {
  onPick: (text: string) => void;
  disabled?: boolean;
}

const SUGGESTIONS = [
  "이 문제에서 무엇부터 볼까요?",
  "왜 이 셀의 값이 변하나요?",
  "수식을 어떻게 세워야 할까요?",
  "힌트 한 단계만 주세요"
];

export default function SuggestionChips({ onPick, disabled }: SuggestionChipsProps) {
  return (
    <div className="border-t border-[hsl(var(--border))] bg-[hsl(var(--surface-100))] px-4 py-3">
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--muted))]">
        <Lightbulb className="h-3 w-3" />
        이렇게 물어볼 수 있어요
      </div>
      <div className="flex flex-wrap gap-1.5">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onPick(s)}
            disabled={disabled}
            className="rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--surface-50,var(--bg)))] px-3 py-1.5 text-xs text-[hsl(var(--fg)/0.85)] transition-colors hover:border-[hsl(var(--accent)/0.5)] hover:bg-[hsl(var(--accent)/0.06)] hover:text-[hsl(var(--accent))] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
