"use client";

import { useEffect, useState } from "react";
import { MessageCircle, X, RotateCcw } from "lucide-react";
import type { CostParams, CostResult } from "@/lib/cost-engine/types";
import type { DeltaTrace } from "@/lib/cost-engine/diff";
import { useCoach } from "@/lib/coach/use-coach";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import SuggestionChips from "./SuggestionChips";

interface SandboxCoachProps {
  caseId: string;
  params: CostParams;
  result: CostResult;
  lastDelta: DeltaTrace[];
}

const PANEL_WIDTH = 380;
const PANEL_HEIGHT = 520;

export default function SandboxCoach({
  caseId,
  params,
  result,
  lastDelta
}: SandboxCoachProps) {
  const [open, setOpen] = useState(false);

  const { messages, streamingId, error, sendMessage, clear } = useCoach({
    problemId: caseId,
    mode: "sandbox",
    sandbox: { params, result, lastDelta }
  });

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="AI 코치 열기"
          className="fixed right-5 bottom-6 z-50 flex h-14 w-14 items-center justify-center rounded-full border-2 border-white/30 bg-[hsl(var(--accent))] text-white shadow-2xl shadow-[hsl(var(--accent)/0.4)] transition-transform hover:scale-110 active:scale-95"
        >
          <MessageCircle className="h-6 w-6" />
          <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[hsl(var(--accent))] opacity-70" />
            <span className="relative inline-flex h-3.5 w-3.5 rounded-full border-2 border-white bg-[hsl(var(--accent))]" />
          </span>
          <span className="absolute -top-7 right-0 whitespace-nowrap rounded-md bg-[hsl(var(--fg))] px-2 py-0.5 text-[10px] font-semibold text-[hsl(var(--bg))] opacity-90">
            실험실 코치
          </span>
        </button>
      )}

      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]"
            aria-hidden
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="AI 코치"
            className="fixed right-5 bottom-6 z-50 flex flex-col overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-100))] shadow-2xl"
            style={{ width: PANEL_WIDTH, height: PANEL_HEIGHT }}
          >
            <header className="flex items-center justify-between border-b border-[hsl(var(--border))] bg-[hsl(var(--surface-100))] px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[hsl(var(--accent))/0.12] text-[hsl(var(--accent))]">
                  <MessageCircle className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[hsl(var(--fg))]">
                    실험실 코치
                  </h2>
                  <p className="text-xs text-[hsl(var(--muted))]">
                    슬라이더를 움직이며 함께 탐색해요
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={clear}
                  className="flex h-8 w-8 items-center justify-center rounded-xl text-[hsl(var(--muted))] transition-colors hover:bg-[hsl(var(--surface-200))] hover:text-[hsl(var(--fg))]"
                  aria-label="대화 초기화"
                  title="대화 초기화"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-xl text-[hsl(var(--muted))] transition-colors hover:bg-[hsl(var(--surface-200))] hover:text-[hsl(var(--fg))]"
                  aria-label="닫기"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </header>

            <MessageList messages={messages} streamingMessageId={streamingId} />

            {messages.length <= 1 && streamingId === null && (
              <SandboxSuggestionChips
                onPick={sendMessage}
                disabled={streamingId !== null}
              />
            )}

            {streamingId !== null && (
              <div className="border-t border-[hsl(var(--border))] bg-[hsl(var(--accent)/0.06)] px-4 py-2 text-xs text-[hsl(var(--accent))]">
                코치가 답변을 작성하는 중...
              </div>
            )}

            {error && (
              <div className="border-t border-[hsl(var(--border))] bg-[hsl(var(--warn)/0.10)] px-4 py-2 text-xs text-[hsl(var(--warn))]">
                오류: {error}
              </div>
            )}

            <MessageInput
              onSend={sendMessage}
              disabled={streamingId !== null}
            />
          </aside>
        </>
      )}
    </>
  );
}

const SANDBOX_SUGGESTIONS = [
  "이 케이스에서 가장 영향이 큰 변수는 뭐예요?",
  "지금 무엇부터 움직여보면 좋을까요?",
  "방금 슬라이더를 움직였는데 왜 이렇게 변하죠?",
  "트리에서 어떤 노드부터 봐야 하나요?"
];

function SandboxSuggestionChips({
  onPick,
  disabled
}: {
  onPick: (text: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="border-t border-[hsl(var(--border))] bg-[hsl(var(--surface-50))] px-3 py-2">
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted))]">
        시작 제안
      </div>
      <div className="flex flex-wrap gap-1.5">
        {SANDBOX_SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            disabled={disabled}
            onClick={() => onPick(s)}
            className="rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--surface-100))] px-2.5 py-1 text-xs text-[hsl(var(--fg)/0.85)] transition-colors hover:border-[hsl(var(--accent)/0.4)] hover:bg-[hsl(var(--accent)/0.05)] hover:text-[hsl(var(--accent))] disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
