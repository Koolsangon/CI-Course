"use client";

import { useEffect } from "react";
import { X, Lightbulb } from "lucide-react";

interface CellHintModalProps {
  open: boolean;
  title: string;
  refValue?: number;
  expected?: number;
  formulaHint: string;
  onClose: () => void;
}

function fmt(n: number): string {
  return n.toFixed(2);
}

export default function CellHintModal({
  open,
  title,
  refValue,
  expected,
  formulaHint,
  onClose
}: CellHintModalProps) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const ratio =
    refValue !== undefined && expected !== undefined && refValue !== 0
      ? expected / refValue
      : undefined;

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        className="fixed left-1/2 top-1/2 z-[70] w-[min(92vw,420px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-100))] p-5 shadow-2xl"
      >
        <header className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[hsl(var(--warn)/0.18)] text-[hsl(var(--warn))]">
              <Lightbulb className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[hsl(var(--fg))]">힌트</h3>
              <p className="text-xs text-[hsl(var(--muted))]">{title}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="flex h-8 w-8 items-center justify-center rounded-xl text-[hsl(var(--muted))] transition-colors hover:bg-[hsl(var(--surface-200))] hover:text-[hsl(var(--fg))]"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="space-y-3 text-sm">
          {(refValue !== undefined || expected !== undefined) && (
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-200)/0.4)] p-3 text-xs">
              {refValue !== undefined && (
                <div>
                  <div className="text-[hsl(var(--muted))]">Reference 값</div>
                  <div className="mt-0.5 font-mono text-[hsl(var(--fg))] tabular-nums">
                    {fmt(refValue)}
                  </div>
                </div>
              )}
              {expected !== undefined && (
                <div>
                  <div className="text-[hsl(var(--muted))]">정답</div>
                  <div className="mt-0.5 font-mono text-[hsl(var(--fg))] tabular-nums">
                    {fmt(expected)}
                  </div>
                </div>
              )}
              {ratio !== undefined && (
                <div className="col-span-2 border-t border-[hsl(var(--border))] pt-2">
                  <div className="text-[hsl(var(--muted))]">변화율 (정답 ÷ Reference)</div>
                  <div className="mt-0.5 font-mono text-[hsl(var(--accent))] tabular-nums">
                    × {ratio.toFixed(4)}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="rounded-xl border border-[hsl(var(--accent)/0.25)] bg-[hsl(var(--accent)/0.05)] p-3">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--accent))]">
              이론적 도출
            </div>
            <p className="whitespace-pre-wrap text-xs leading-relaxed text-[hsl(var(--fg)/0.9)]">
              {formulaHint}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
