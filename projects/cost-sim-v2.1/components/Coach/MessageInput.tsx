"use client";

import { useState, type KeyboardEvent } from "react";
import { Send } from "lucide-react";

interface MessageInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export default function MessageInput({ onSend, disabled }: MessageInputProps) {
  const [value, setValue] = useState("");

  function handleSend() {
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
    setValue("");
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex items-end gap-2 border-t border-[hsl(var(--border))] bg-[hsl(var(--surface-100))] px-3 py-3">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="질문을 입력하세요... (Enter 전송, Shift+Enter 줄바꿈)"
        rows={1}
        disabled={disabled}
        className="flex-1 resize-none rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-50,var(--bg)))] px-3 py-2 text-sm text-[hsl(var(--fg))] placeholder-[hsl(var(--muted))] outline-none focus:border-[hsl(var(--accent))] focus:ring-1 focus:ring-[hsl(var(--accent))] disabled:opacity-50"
        style={{ maxHeight: 120 }}
      />
      <button
        type="button"
        onClick={handleSend}
        disabled={disabled || !value.trim()}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--accent))] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="전송"
      >
        <Send className="h-4 w-4" />
      </button>
    </div>
  );
}
