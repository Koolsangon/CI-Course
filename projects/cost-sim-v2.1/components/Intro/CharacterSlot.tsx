"use client";

import { motion } from "framer-motion";
import type { Character } from "./characters";

interface CharacterSlotProps {
  character: Character;
  active: boolean;
  side: "left" | "right" | "center";
  reducedMotion: boolean;
}

/**
 * Character display: tall portrait sprite when avatarSrc is set, otherwise lucide icon.
 * The active character glows; inactive ones desaturate and dim.
 */
export function CharacterSlot({ character, active, side, reducedMotion }: CharacterSlotProps) {
  const Icon = character.icon;
  const align =
    side === "left" ? "items-start" : side === "right" ? "items-end" : "items-center";
  const hasAvatar = !!character.avatarSrc;

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: active ? 1 : 0.45, y: 0 }}
      transition={{ duration: reducedMotion ? 0 : 0.4 }}
      className={`relative flex flex-col gap-2 ${align}`}
    >
      {hasAvatar ? (
        <div
          className="relative h-48 w-32 overflow-hidden sm:h-72 sm:w-48"
          style={{
            filter: active ? "none" : "saturate(0.4) brightness(0.7)",
            transition: reducedMotion ? "none" : "filter 0.4s ease"
          }}
        >
          {/* Glow ring behind sprite */}
          <div
            aria-hidden
            className="absolute inset-x-2 bottom-0 h-12 rounded-full"
            style={{
              background: `radial-gradient(ellipse at center, ${character.color}80 0%, transparent 70%)`,
              opacity: active ? 1 : 0,
              transition: reducedMotion ? "none" : "opacity 0.4s ease"
            }}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={character.avatarSrc}
            alt={character.name}
            className="relative h-full w-full object-contain object-bottom"
            draggable={false}
          />
        </div>
      ) : (
        <div
          className="relative flex h-28 w-28 items-center justify-center rounded-full sm:h-36 sm:w-36"
          style={{
            background: `radial-gradient(circle at 50% 50%, ${character.color}33 0%, transparent 70%)`,
            boxShadow: active ? `0 0 32px ${character.color}66` : "none",
            transition: reducedMotion ? "none" : "box-shadow 0.4s ease"
          }}
        >
          <div
            className="flex h-20 w-20 items-center justify-center rounded-full sm:h-24 sm:w-24"
            style={{
              background: "rgba(15,23,42,0.7)",
              border: `2px solid ${character.color}`,
              boxShadow: `inset 0 0 16px ${character.color}33`
            }}
          >
            {Icon && (
              <Icon className="h-9 w-9 sm:h-11 sm:w-11" style={{ color: character.color }} />
            )}
          </div>
        </div>
      )}

      {character.name && (
        <div
          className="rounded-full px-3 py-0.5 text-xs font-semibold tracking-wide shadow-sm"
          style={{
            background: "rgba(255,255,255,0.95)",
            color: character.color,
            border: `1px solid ${character.color}55`
          }}
        >
          {character.name}
        </div>
      )}
    </motion.div>
  );
}
