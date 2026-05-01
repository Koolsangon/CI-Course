"use client";

import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import type { Character } from "./characters";

interface DialogueBoxProps {
  speaker: Character;
  text: string;
  choice?: string;
  onAdvance: () => void;
  reducedMotion: boolean;
}

const TYPING_INTERVAL_MS = 25;

export function DialogueBox({
  speaker,
  text,
  choice,
  onAdvance,
  reducedMotion
}: DialogueBoxProps) {
  const [shown, setShown] = useState(reducedMotion ? text : "");
  const [done, setDone] = useState(reducedMotion);

  useEffect(() => {
    if (reducedMotion) {
      setShown(text);
      setDone(true);
      return;
    }
    setShown("");
    setDone(false);
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      if (i >= text.length) {
        window.clearInterval(id);
        setDone(true);
      }
    }, TYPING_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [text, reducedMotion]);

  const handleClick = () => {
    if (!done) {
      // Click to fast-forward typing.
      setShown(text);
      setDone(true);
      return;
    }
    onAdvance();
  };

  const isNarrator = speaker.id === "narrator";
  const borderColor = speaker.color;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      className="group w-full max-w-3xl cursor-pointer rounded-2xl px-5 py-4 backdrop-blur-md sm:px-7 sm:py-5"
      style={{
        background: "rgba(255,255,255,0.94)",
        border: `1px solid ${borderColor}55`,
        boxShadow: `0 8px 24px rgba(10,10,10,0.08), 0 0 18px ${borderColor}1A`
      }}
    >
      {!isNarrator && speaker.name && (
        <div
          className="mb-2 inline-flex items-center gap-2 rounded-md px-2 py-0.5 text-xs font-bold tracking-wider"
          style={{
            background: `${borderColor}14`,
            color: borderColor,
            border: `1px solid ${borderColor}55`
          }}
        >
          {speaker.name}
          {speaker.role && <span className="opacity-60">· {speaker.role}</span>}
        </div>
      )}
      <p
        className={`whitespace-pre-wrap text-base leading-relaxed sm:text-lg ${
          isNarrator ? "italic text-[hsl(var(--muted))]" : "text-[hsl(var(--fg))]"
        }`}
      >
        {shown}
        {!done && (
          <span
            aria-hidden
            className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 align-middle"
            style={{ background: borderColor, animation: reducedMotion ? "none" : "intro-blink 1s steps(2) infinite" }}
          />
        )}
      </p>

      {done && (
        <div className="mt-3 flex items-center justify-end gap-2 text-xs text-[hsl(var(--muted))]">
          {choice ? (
            <span
              className="inline-flex items-center gap-1 rounded-full px-3 py-1 font-semibold"
              style={{
                background: `${borderColor}14`,
                color: borderColor,
                border: `1px solid ${borderColor}55`
              }}
            >
              {choice}
              <ChevronRight className="h-3.5 w-3.5" />
            </span>
          ) : (
            <span className="inline-flex items-center gap-1">
              계속 <ChevronRight className="h-3.5 w-3.5" />
            </span>
          )}
        </div>
      )}
    </div>
  );
}
