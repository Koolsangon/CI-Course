import { CASES, type CaseDef } from "@/lib/cases";
import type { GuidedPhase } from "@/lib/store";

export interface CoachContext {
  caseId: string;
  phase: GuidedPhase;
}

/**
 * Phase 5 Day 1 — static coach (brand-voice tone).
 * Source: content/cases/*.json `coach` field. Always returns a non-empty markdown
 * snippet so AI failure can gracefully degrade to this (AC7).
 *
 * Tone rules enforced inline via content/coach-tone.md — never expose answers;
 * always lead the learner toward the mechanism.
 */
export function getStaticCoaching(ctx: CoachContext): string {
  const def: CaseDef | undefined = CASES[ctx.caseId];
  if (!def) return "이 케이스의 코칭 데이터를 찾을 수 없습니다.";
  const text = def.coach[ctx.phase];
  if (!text) return `(${ctx.phase} 단계의 코칭 카피가 비어 있습니다.)`;
  return text;
}

/** Verification helper — returns true iff all 6 cases × 4 phases have non-empty copy. */
export function verifyCoachingCoverage(): { ok: boolean; missing: string[] } {
  const phases: GuidedPhase[] = ["hook", "discover", "apply", "reflect"];
  const missing: string[] = [];
  for (const [id, def] of Object.entries(CASES)) {
    for (const phase of phases) {
      if (!def.coach[phase] || def.coach[phase].trim().length === 0) {
        missing.push(`${id}/${phase}`);
      }
    }
  }
  return { ok: missing.length === 0, missing };
}
