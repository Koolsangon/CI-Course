"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { TitleScreen } from "./TitleScreen";
import { DialogueScene } from "./DialogueScene";
import { NameInput } from "./NameInput";
import { INTRO_SCRIPT } from "./script";
import { applyPlayerTokens, loadPlayerName, savePlayerName } from "@/lib/player";

export const INTRO_SEEN_KEY = "cost-sim:intro-seen";

interface IntroSequenceProps {
  onComplete: () => void;
}

type Stage = "title" | "name-input" | "dialogue" | "fadeout";

export function IntroSequence({ onComplete }: IntroSequenceProps) {
  const [stage, setStage] = useState<Stage>("title");
  const [beatIndex, setBeatIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [playerName, setPlayerName] = useState("");

  useEffect(() => {
    setPlayerName(loadPlayerName());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(m.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    m.addEventListener?.("change", handler);
    return () => m.removeEventListener?.("change", handler);
  }, []);

  const finish = useCallback(() => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(INTRO_SEEN_KEY, "1");
      } catch {
        // ignore quota / privacy mode
      }
    }
    setStage("fadeout");
    window.setTimeout(onComplete, reducedMotion ? 0 : 320);
  }, [onComplete, reducedMotion]);

  const advanceBeat = useCallback(() => {
    setBeatIndex((idx) => {
      const next = idx + 1;
      if (next >= INTRO_SCRIPT.length) {
        finish();
        return idx;
      }
      return next;
    });
  }, [finish]);

  // Global ESC = skip
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        finish();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [finish]);

  const handleNameSubmit = useCallback((name: string) => {
    savePlayerName(name);
    setPlayerName(name);
    setStage("dialogue");
  }, []);

  const rawBeat = INTRO_SCRIPT[beatIndex];
  const beat = rawBeat
    ? { ...rawBeat, text: applyPlayerTokens(rawBeat.text, playerName) }
    : rawBeat;

  return (
    <AnimatePresence>
      {stage !== "fadeout" && (
        <motion.div
          key="intro-overlay"
          initial={reducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.3 }}
          className="fixed inset-0 z-[60] flex flex-col items-center justify-center overflow-hidden"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 20% 30%, hsl(345 100% 32% / 0.06) 0%, transparent 60%), radial-gradient(ellipse 60% 80% at 80% 70%, hsl(349 100% 45% / 0.04) 0%, transparent 60%), hsl(0 0% 100%)"
          }}
        >
          {/* Atmospheric lobby/factory backdrop — light wash */}
          {stage === "dialogue" && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-25"
              style={{
                backgroundImage: "url(/intro/bg-lobby.png)",
                filter: "blur(2px) brightness(1.15)"
              }}
            />
          )}
          {/* Subtle grid — warm gray, low contrast */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-50"
            style={{
              backgroundImage:
                "linear-gradient(rgba(120,120,130,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(120,120,130,0.08) 1px, transparent 1px)",
              backgroundSize: "60px 60px",
              maskImage:
                "radial-gradient(ellipse 70% 60% at 50% 40%, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 80%)"
            }}
          />
          {/* Soft vignette — warm cream → faint shadow at edges */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 50% 50%, transparent 50%, rgba(10,10,10,0.08) 100%)"
            }}
          />

          {/* Skip button — always visible top-right */}
          <button
            type="button"
            onClick={finish}
            aria-label="인트로 건너뛰기"
            className="absolute right-4 top-4 z-10 inline-flex items-center gap-1.5 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--surface-100))]/90 px-3 py-1.5 text-xs font-medium text-[hsl(var(--muted))] shadow-sm backdrop-blur transition hover:border-[hsl(var(--accent)/0.4)] hover:text-[hsl(var(--accent))] sm:right-6 sm:top-6"
          >
            <X className="h-3.5 w-3.5" /> Skip · ESC
          </button>

          <div className="relative z-[1] flex w-full flex-col items-center justify-center px-4 py-12 sm:px-8">
            <AnimatePresence mode="wait">
              {stage === "title" && (
                <motion.div
                  key="title"
                  initial={reducedMotion ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: reducedMotion ? 0 : 0.3 }}
                >
                  <TitleScreen
                    onStart={() =>
                      setStage(playerName ? "dialogue" : "name-input")
                    }
                    onSkip={finish}
                    reducedMotion={reducedMotion}
                  />
                </motion.div>
              )}

              {stage === "name-input" && (
                <motion.div
                  key="name-input"
                  initial={reducedMotion ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: reducedMotion ? 0 : 0.3 }}
                >
                  <NameInput
                    onSubmit={handleNameSubmit}
                    reducedMotion={reducedMotion}
                  />
                </motion.div>
              )}

              {stage === "dialogue" && beat && (
                <motion.div
                  key={`beat-${beat.id}`}
                  initial={reducedMotion ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reducedMotion ? undefined : { opacity: 0, y: -8 }}
                  transition={{ duration: reducedMotion ? 0 : 0.35 }}
                  className="w-full"
                >
                  <DialogueScene
                    beat={beat}
                    onAdvance={advanceBeat}
                    reducedMotion={reducedMotion}
                    playerName={playerName}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Progress dots — only during dialogue */}
            {stage === "dialogue" && (
              <div className="mt-8 flex items-center gap-1.5">
                {INTRO_SCRIPT.map((b, i) => (
                  <span
                    key={b.id}
                    className="h-1 w-6 rounded-full transition-colors"
                    style={{
                      background:
                        i <= beatIndex ? "hsl(345 100% 32% / 0.7)" : "rgba(148,163,184,0.4)"
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
