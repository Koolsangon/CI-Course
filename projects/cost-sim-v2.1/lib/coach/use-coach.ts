"use client";

import { useCallback, useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { getCase } from "@/lib/cases";
import type {
  CoachLastGrade,
  CoachMessage,
  CoachRequestBody,
  CoachSandboxState,
  CoachStreamEvent
} from "./types";

type WorksheetArgs = {
  problemId: string;
  mode?: "worksheet";
  answers: Record<string, Record<string, number>>;
  lastGrade: CoachLastGrade | null;
};

type SandboxArgs = {
  problemId: string;
  mode: "sandbox";
  sandbox: CoachSandboxState;
};

type UseCoachArgs = WorksheetArgs | SandboxArgs;

function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function buildGreeting(problemId: string, mode: "worksheet" | "sandbox"): string {
  const caseDef = getCase(problemId);
  if (!caseDef) {
    return "안녕하세요. 함께 살펴볼게요. 어떤 부분이 가장 헷갈리세요?";
  }
  if (mode === "sandbox") {
    return `안녕하세요. 자유 실험실에서 ${caseDef.title}을(를) 탐색하는군요.\n\n${caseDef.coach.hook}\n\n어떤 슬라이더를 움직이며 무엇을 확인해보고 싶으세요?`;
  }
  return `안녕하세요. ${caseDef.title} 문제를 함께 풀어볼게요.\n\n${caseDef.coach.hook}\n\n어떤 부분부터 같이 살펴볼까요?`;
}

// Sandbox conversations are stored under a distinct key so they don't
// collide with worksheet conversations for the same case.
function storageKey(problemId: string, mode: "worksheet" | "sandbox"): string {
  return mode === "sandbox" ? `sandbox:${problemId}` : problemId;
}

async function streamCoachResponse(
  body: CoachRequestBody,
  onText: (chunk: string) => void
): Promise<void> {
  const res = await fetch("/api/coach", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!res.ok || !res.body) {
    let detail = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      if (data?.error) detail = data.error;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let idx: number;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const rawEvent = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const dataLine = rawEvent
        .split("\n")
        .find((l) => l.startsWith("data: "));
      if (!dataLine) continue;
      const payload = dataLine.slice("data: ".length);
      let parsed: CoachStreamEvent;
      try {
        parsed = JSON.parse(payload) as CoachStreamEvent;
      } catch {
        continue;
      }
      if (parsed.type === "text") {
        onText(parsed.text);
      } else if (parsed.type === "error") {
        throw new Error(parsed.message);
      }
      // "done" → loop will end naturally when reader finishes
    }
  }
}

export function useCoach(args: UseCoachArgs) {
  const { problemId } = args;
  const mode: "worksheet" | "sandbox" =
    args.mode === "sandbox" ? "sandbox" : "worksheet";
  const key = storageKey(problemId, mode);

  const messages = useStore((s) => s.coachConversations[key] ?? []);
  const seedCoachConversation = useStore((s) => s.seedCoachConversation);
  const appendCoachMessage = useStore((s) => s.appendCoachMessage);
  const updateCoachMessage = useStore((s) => s.updateCoachMessage);
  const clearCoachConversation = useStore((s) => s.clearCoachConversation);

  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    seedCoachConversation(key, {
      id: makeId(),
      role: "assistant",
      content: buildGreeting(problemId, mode),
      createdAt: Date.now()
    });
  }, [key, problemId, mode, seedCoachConversation]);

  const sendMessage = useCallback(
    async (text: string) => {
      setError(null);

      const userMessage: CoachMessage = {
        id: makeId(),
        role: "user",
        content: text,
        createdAt: Date.now()
      };
      appendCoachMessage(key, userMessage);

      const assistantId = makeId();
      const assistantMessage: CoachMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        createdAt: Date.now()
      };
      appendCoachMessage(key, assistantMessage);
      setStreamingId(assistantId);

      // Build the conversation history for the API.
      // Includes the user's just-appended message; excludes the empty assistant placeholder.
      const conversationFromStore = useStore.getState().coachConversations[key] ?? [];
      const apiMessages = conversationFromStore
        .filter((m) => m.id !== assistantId && m.content.trim().length > 0)
        .map((m) => ({ role: m.role, content: m.content }));

      const requestBody: CoachRequestBody =
        mode === "sandbox"
          ? {
              problemId,
              mode: "sandbox",
              messages: apiMessages,
              sandbox: (args as SandboxArgs).sandbox
            }
          : {
              problemId,
              mode: "worksheet",
              messages: apiMessages,
              answers: (args as WorksheetArgs).answers,
              lastGrade: (args as WorksheetArgs).lastGrade
            };

      try {
        await streamCoachResponse(requestBody, (chunk) => {
          updateCoachMessage(key, assistantId, (prev) => prev + chunk);
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : "알 수 없는 오류";
        setError(message);
        updateCoachMessage(key, assistantId, (prev) =>
          prev.length > 0 ? prev : `(오류: ${message})`
        );
      } finally {
        setStreamingId(null);
      }
    },
    [key, problemId, mode, args, appendCoachMessage, updateCoachMessage]
  );

  const clear = useCallback(() => {
    clearCoachConversation(key);
    seedCoachConversation(key, {
      id: makeId(),
      role: "assistant",
      content: buildGreeting(problemId, mode),
      createdAt: Date.now()
    });
  }, [key, problemId, mode, clearCoachConversation, seedCoachConversation]);

  return { messages, streamingId, error, sendMessage, clear };
}
