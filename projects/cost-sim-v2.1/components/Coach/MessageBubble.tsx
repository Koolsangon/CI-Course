import type { CoachMessage } from "@/lib/coach/types";

interface MessageBubbleProps {
  message: CoachMessage;
  streaming?: boolean;
}

export default function MessageBubble({ message, streaming }: MessageBubbleProps) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={[
          "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap",
          isUser
            ? "bg-[hsl(var(--accent))] text-[hsl(var(--accent-fg,0_0%_100%))] rounded-br-sm"
            : "bg-[hsl(var(--surface-200))] text-[hsl(var(--fg))] rounded-bl-sm border border-[hsl(var(--border))]"
        ].join(" ")}
      >
        {message.content}
        {streaming && (
          <span className="ml-0.5 inline-block h-3.5 w-1.5 translate-y-0.5 animate-pulse bg-[hsl(var(--fg)/0.4)]" />
        )}
      </div>
    </div>
  );
}
