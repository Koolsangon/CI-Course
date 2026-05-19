"use client";

import { useEffect } from "react";
import { X, Lightbulb, Lock } from "lucide-react";
import { HINT_PENALTY, type HintLevel } from "@/lib/worksheet-engine";

interface CellHintModalProps {
  open: boolean;
  title: string;
  refValue?: number;
  hints: { l1: string; l2: string; l3: string };
  level: HintLevel;
  /** 강사 설정 — 차감 OFF 시 모달의 배점 안내 문구가 변경된다. */
  hintPenaltyEnabled?: boolean;
  onAdvance: () => void;
  onClose: () => void;
}

const LEVEL_LABELS = ["힌트 사용 안 함", "1단계 (개념)", "2단계 (메커니즘)", "3단계 (공식)"] as const;

function fmt(n: number): string {
  return n.toFixed(2);
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

export default function CellHintModal({
  open,
  title,
  refValue,
  hints,
  level,
  hintPenaltyEnabled = true,
  onAdvance,
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

  const unlocked: { idx: 1 | 2 | 3; label: string; body: string }[] = [];
  if (level >= 1) unlocked.push({ idx: 1, label: "1단계 — 개념", body: hints.l1 });
  if (level >= 2) unlocked.push({ idx: 2, label: "2단계 — 메커니즘", body: hints.l2 });
  if (level >= 3) unlocked.push({ idx: 3, label: "3단계 — 공식", body: hints.l3 });

  const canAdvance = level < 3;
  const nextLevel = (level + 1) as HintLevel;
  const currentRate = HINT_PENALTY[level];
  const nextRate = canAdvance ? HINT_PENALTY[nextLevel] : currentRate;

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
        className="fixed left-1/2 top-1/2 z-[70] flex max-h-[85vh] w-[min(92vw,460px)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-100))] shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-[hsl(var(--border))] px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[hsl(var(--warn)/0.18)] text-[hsl(var(--warn))]">
              <Lightbulb className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[hsl(var(--fg))]">단계별 힌트</h3>
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

        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4 text-sm">
          {/* Scoring policy notice — user-visible */}
          <div className="rounded-xl border border-[hsl(var(--accent)/0.25)] bg-[hsl(var(--accent)/0.05)] p-3 text-xs leading-relaxed text-[hsl(var(--fg)/0.85)]">
            <div className="mb-1 font-semibold text-[hsl(var(--accent))]">
              점수 안내
            </div>
            {hintPenaltyEnabled ? (
              <>
                힌트는 단계가 올라갈수록 더 구체적으로 알려주는 대신, 정답을 맞혔을 때 *모든 정답 셀*의 배점이 같이 줄어듭니다 (이 문제 전체에 한 단계 적용) — {" "}
                <span className="font-mono tabular-nums">
                  0단계 100% → 1단계 70% → 2단계 40% → 3단계 20%
                </span>.
                <span className="mt-1 block text-[hsl(var(--muted))]">
                  현재 이 문제의 배점: <span className="font-mono font-semibold text-[hsl(var(--fg))] tabular-nums">{pct(currentRate)}</span>
                  {" — "}
                  <span className="font-semibold">{LEVEL_LABELS[level]}</span>
                </span>
              </>
            ) : (
              <>
                강사 설정: <span className="font-semibold">힌트 차감 OFF</span> — 단계 상관없이 모든 정답은 100% 배점입니다.
              </>
            )}
          </div>

          {refValue !== undefined && (
            <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-200)/0.4)] p-3 text-xs">
              <div className="text-[hsl(var(--muted))]">Reference 값</div>
              <div className="mt-0.5 font-mono text-[hsl(var(--fg))] tabular-nums">
                {fmt(refValue)}
              </div>
            </div>
          )}

          {unlocked.length === 0 ? (
            <div className="flex items-start gap-2 rounded-xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--surface-200)/0.3)] p-3 text-xs text-[hsl(var(--muted))]">
              <Lock className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
              <p>아직 힌트를 사용하지 않았습니다. 아래 버튼으로 1단계 힌트를 받을 수 있어요. 단계를 올릴수록 셀의 배점이 줄어드니, 먼저 직접 풀어보고 막힐 때 사용해 주세요.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {unlocked.map((h) => (
                <div
                  key={h.idx}
                  className="rounded-xl border border-[hsl(var(--accent)/0.25)] bg-[hsl(var(--accent)/0.05)] p-3"
                >
                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--accent))]">
                    {h.label}
                  </div>
                  <p className="whitespace-pre-wrap text-xs leading-relaxed text-[hsl(var(--fg)/0.9)]">
                    {h.body}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-[hsl(var(--border))] px-5 py-3">
          <div className="text-[11px] text-[hsl(var(--muted))]">
            {canAdvance
              ? hintPenaltyEnabled
                ? `다음 단계로 가면 배점이 ${pct(currentRate)} → ${pct(nextRate)}로 줄어듭니다.`
                : `다음 단계는 더 구체적인 힌트입니다 (차감 OFF — 배점 변동 없음).`
              : "모든 힌트를 사용했습니다."}
          </div>
          {canAdvance ? (
            <button
              type="button"
              onClick={onAdvance}
              className="flex-shrink-0 rounded-xl border border-[hsl(var(--accent))] bg-[hsl(var(--accent))] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[hsl(var(--accent))/0.9]"
            >
              {level === 0 ? "1단계 힌트 보기" : `${level + 1}단계 힌트 보기`}
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="flex-shrink-0 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-100))] px-3 py-2 text-xs font-semibold text-[hsl(var(--fg))] transition-colors hover:bg-[hsl(var(--surface-200))]"
            >
              닫기
            </button>
          )}
        </footer>
      </div>
    </>
  );
}
