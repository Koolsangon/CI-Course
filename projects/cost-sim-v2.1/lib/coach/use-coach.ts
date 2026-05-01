"use client";

import { useCallback, useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { getCase } from "@/lib/cases";
import type {
  CoachMessage,
  CoachRequestBody,
  CoachStreamEvent
} from "./types";

interface UseCoachArgs {
  problemId: string;
  answers: Record<string, Record<string, number>>;
  lastGrade: CoachRequestBody["lastGrade"];
}

function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function buildGreeting(problemId: string): string {
  const caseDef = getCase(problemId);
  if (!caseDef) {
    return "안녕하세요. 이 문제를 함께 풀어볼게요. 어떤 부분이 가장 헷갈리세요?";
  }
  return `안녕하세요. ${caseDef.title} 문제를 함께 풀어볼게요.\n\n${caseDef.coach.hook}\n\n어떤 부분부터 같이 살펴볼까요?`;
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

export function useCoach({ problemId, answers, lastGrade }: UseCoachArgs) {
  const messages = useStore((s) => s.coachConversations[problemId] ?? []);
  const seedCoachConversation = useStore((s) => s.seedCoachConversation);
  const appendCoachMessage = useStore((s) => s.appendCoachMessage);
  const updateCoachMessage = useStore((s) => s.updateCoachMessage);
  const clearCoachConversation = useStore((s) => s.clearCoachConversation);

  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    seedCoachConversation(problemId, {
      id: makeId(),
      role: "assistant",
      content: buildGreeting(problemId),
      createdAt: Date.now()
    });
  }, [problemId, seedCoachConversation]);

  const sendMessage = useCallback(
    async (text: string) => {
      setError(null);

      const userMessage: CoachMessage = {
        id: makeId(),
        role: "user",
        content: text,
        createdAt: Date.now()
      };
      appendCoachMessage(problemId, userMessage);

      const assistantId = makeId();
      const assistantMessage: CoachMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        createdAt: Date.now()
      };
      appendCoachMessage(problemId, assistantMessage);
      setStreamingId(assistantId);

      // Build the conversation history for the API.
      // Includes the user's just-appended message; excludes the empty assistant placeholder.
      const conversationFromStore = useStore.getState().coachConversations[problemId] ?? [];
      const apiMessages = conversationFromStore
        .filter((m) => m.id !== assistantId && m.content.trim().length > 0)
        .map((m) => ({ role: m.role, content: m.content }));

      const requestBody: CoachRequestBody = {
        problemId,
        messages: apiMessages,
        answers,
        lastGrade
      };

      try {
        await streamCoachResponse(requestBody, (chunk) => {
          updateCoachMessage(problemId, assistantId, (prev) => prev + chunk);
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : "알 수 없는 오류";
        setError(message);
        updateCoachMessage(problemId, assistantId, (prev) =>
          prev.length > 0 ? prev : `(오류: ${message})`
        );
      } finally {
        setStreamingId(null);
      }
    },
    [problemId, answers, lastGrade, appendCoachMessage, updateCoachMessage]
  );

  const clear = useCallback(() => {
    clearCoachConversation(problemId);
    seedCoachConversation(problemId, {
      id: makeId(),
      role: "assistant",
      content: buildGreeting(problemId),
      createdAt: Date.now()
    });
  }, [problemId, clearCoachConversation, seedCoachConversation]);

  return { messages, streamingId, error, sendMessage, clear };
}
