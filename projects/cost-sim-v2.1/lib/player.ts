"use client";

export const PLAYER_NAME_KEY = "cost-sim:player-name";

/**
 * Drop the first character (typically Korean surname) and append "님".
 *  - "박지호" → "지호님"
 *  - "지호"   → "호님"  (best-effort — trimmed name)
 *  - ""       → ""      (caller should fall back to a default)
 */
export function toAddress(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "";
  if (trimmed.length === 1) return `${trimmed}님`;
  return `${trimmed.slice(1)}님`;
}

export function loadPlayerName(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(PLAYER_NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

export function savePlayerName(name: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PLAYER_NAME_KEY, name.trim());
  } catch {
    // ignore quota / privacy mode
  }
}

/**
 * Replace `{playerName}` and `{playerAddress}` tokens in a template string.
 * Falls back to "책임님" when no name is set.
 */
export function applyPlayerTokens(template: string, name: string): string {
  const trimmed = name.trim();
  const address = trimmed ? toAddress(trimmed) : "책임님";
  const display = trimmed || "책임";
  return template
    .replace(/\{playerAddress\}/g, address)
    .replace(/\{playerName\}/g, display);
}
