"use client";

import { useEffect, useRef } from "react";
import type { CoachMessage } from "@/lib/coach/types";
import MessageBubble from "./MessageBubble";

interface MessageListProps {
  messages: CoachMessage[];
  streamingMessageId: string | null;
}

export default function MessageList({ messages, streamingMessageId }: MessageListProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, streamingMessageId]);

  return (
    <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
      {messages.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-xs text-[hsl(var(--muted))]">
          코치를 불러오는 중...
        </div>
      ) : (
        messages.map((m) => (
          <MessageBubble
            key={m.id}
            message={m}
            streaming={streamingMessageId === m.id}
          />
        ))
      )}
      <div ref={endRef} />
    </div>
  );
}
