"use client";

/** 강사가 새 룸 생성 시 발급받은 admin_token 을 localStorage 에 룸 코드별로 보관. */

export const ADMIN_TOKEN_KEY = "cost-sim:admin-tokens";

export function loadAdminTokens(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(ADMIN_TOKEN_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed as Record<string, string>;
    return {};
  } catch {
    return {};
  }
}

export function saveAdminToken(code: string, token: string): void {
  if (typeof window === "undefined") return;
  try {
    const map = loadAdminTokens();
    map[code] = token;
    window.localStorage.setItem(ADMIN_TOKEN_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

export function getAdminToken(code: string): string | null {
  return loadAdminTokens()[code] ?? null;
}

export function removeAdminToken(code: string): void {
  if (typeof window === "undefined") return;
  try {
    const map = loadAdminTokens();
    delete map[code];
    window.localStorage.setItem(ADMIN_TOKEN_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}
