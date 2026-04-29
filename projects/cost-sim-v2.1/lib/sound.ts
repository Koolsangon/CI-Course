"use client";

/**
 * Web Audio chime helpers — zero dependencies, zero audio assets.
 * Three procedural sounds via OscillatorNode:
 *   - ding(): single short note for "correct answer"
 *   - fanfare(): three-note triad for "case complete"
 *   - tick(): subtle slider step crossing
 *
 * AudioContext is created lazily on first call (must be inside a user-gesture handler
 * per browser autoplay policies). On any error, fail silently — sound is a polish layer,
 * not a load-bearing UX.
 *
 * Persistent mute toggle lives in localStorage under `cost-sim:sfx-muted` (read at
 * call time so the UI can flip it without re-importing).
 */

let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (typeof localStorage !== "undefined" && localStorage.getItem("cost-sim:sfx-muted") === "1") {
    return null;
  }
  if (ctx) return ctx;
  try {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new Ctor();
    return ctx;
  } catch {
    return null;
  }
}

function note(freq: number, startSec: number, durSec: number, gain = 0.08, type: OscillatorType = "triangle"): void {
  const c = getContext();
  if (!c) return;
  if (c.state === "suspended") {
    c.resume().catch(() => undefined);
  }
  const t0 = c.currentTime + startSec;
  const osc = c.createOscillator();
  const env = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  env.gain.value = 0;
  env.gain.linearRampToValueAtTime(gain, t0 + 0.01);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + durSec);
  osc.connect(env).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + durSec + 0.02);
}

/** Single short note — for correct answer feedback. */
export function ding(): void {
  note(880, 0, 0.18, 0.09);
  note(1175, 0.06, 0.16, 0.07);
}

/** Three-note triad rising — for case complete / 3-star reveal. */
export function fanfare(): void {
  note(523.25, 0, 0.22); // C5
  note(659.25, 0.1, 0.22); // E5
  note(783.99, 0.2, 0.32); // G5
  note(1046.5, 0.32, 0.4, 0.07); // C6 capstone
}

/** Subtle tick — for slider step thresholds. */
export function tick(): void {
  note(420, 0, 0.04, 0.04, "square");
}

/** Persistent mute toggle (reads localStorage). */
export function isMuted(): boolean {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem("cost-sim:sfx-muted") === "1";
}

export function setMuted(muted: boolean): void {
  if (typeof localStorage === "undefined") return;
  if (muted) localStorage.setItem("cost-sim:sfx-muted", "1");
  else localStorage.removeItem("cost-sim:sfx-muted");
}

export function vibrate(ms = 12): void {
  if (typeof navigator === "undefined") return;
  if (typeof navigator.vibrate === "function") {
    try {
      navigator.vibrate(ms);
    } catch {
      // ignore
    }
  }
}
