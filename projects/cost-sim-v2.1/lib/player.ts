"use client";

export const PLAYER_NAME_KEY = "cost-sim:player-name";
export const ROOM_CONTEXT_KEY = "cost-sim:room-context";

/** 학습자가 룸 입장 후 localStorage 에 저장하는 컨텍스트. */
export interface RoomContext {
  code: string;
  playerId: string;
  name: string;
  team: number;
}

export function loadRoomContext(): RoomContext | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(ROOM_CONTEXT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      typeof parsed?.code === "string" &&
      typeof parsed?.playerId === "string" &&
      typeof parsed?.name === "string" &&
      typeof parsed?.team === "number"
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveRoomContext(ctx: RoomContext): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ROOM_CONTEXT_KEY, JSON.stringify(ctx));
  } catch {
    /* ignore quota / privacy mode */
  }
}

export function clearRoomContext(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(ROOM_CONTEXT_KEY);
  } catch {
    /* ignore */
  }
}

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
