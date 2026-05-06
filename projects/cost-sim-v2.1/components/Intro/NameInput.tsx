"use client";

import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { ArrowRight, User } from "lucide-react";

interface NameInputProps {
  onSubmit: (name: string) => void;
  reducedMotion: boolean;
}

export function NameInput({ onSubmit, reducedMotion }: NameInputProps) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed.length < 2) {
      setError("이름을 두 글자 이상 입력해주세요.");
      return;
    }
    setError(null);
    onSubmit(trimmed);
  };

  return (
    <div className="relative flex w-full max-w-md flex-col items-center gap-7 text-center">
      <motion.div
        initial={reducedMotion ? false : { opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reducedMotion ? 0 : 0.4 }}
        className="text-xs font-mono uppercase tracking-[0.4em] text-[hsl(var(--accent))]"
      >
        Identification · Step 1 / 2
      </motion.div>

      <motion.h2
        initial={reducedMotion ? false : { opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: reducedMotion ? 0 : 0.5, delay: reducedMotion ? 0 : 0.05 }}
        className="text-3xl font-black leading-tight tracking-tight text-[hsl(var(--fg))] sm:text-4xl"
      >
        파트리더의 이름은?
      </motion.h2>

      <motion.p
        initial={reducedMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reducedMotion ? 0 : 0.4, delay: reducedMotion ? 0 : 0.15 }}
        className="max-w-sm text-sm leading-relaxed text-[hsl(var(--muted))]"
      >
        라인의 동료들이 당신을 어떻게 부를지 정해주세요.
        <br className="hidden sm:block" />
        한국식 성+이름(예: 박지호)을 권장합니다.
      </motion.p>

      <motion.form
        initial={reducedMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reducedMotion ? 0 : 0.4, delay: reducedMotion ? 0 : 0.25 }}
        onSubmit={handleSubmit}
        className="flex w-full flex-col items-stretch gap-3"
      >
        <div className="relative">
          <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted))]" />
          <input
            type="text"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (error) setError(null);
            }}
            autoFocus
            maxLength={20}
            placeholder="예) 박지호"
            aria-label="이름"
            className="w-full rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--surface-100))] py-3 pl-11 pr-4 text-base font-medium text-[hsl(var(--fg))] outline-none transition focus:border-[hsl(var(--accent))] focus:ring-2 focus:ring-[hsl(var(--accent)/0.25)]"
          />
        </div>

        {error && (
          <p className="text-xs font-medium text-[hsl(var(--accent))]">{error}</p>
        )}

        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[hsl(var(--accent))] px-6 py-3 text-sm font-bold text-white shadow-elevated transition hover:scale-[1.01] hover:bg-[hsl(var(--accent)/0.9)] active:scale-[0.99] disabled:opacity-60"
        >
          확인 <ArrowRight className="h-4 w-4" />
        </button>
      </motion.form>
    </div>
  );
}
