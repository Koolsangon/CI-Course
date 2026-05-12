import { describe, it, expect } from "vitest";
import { getStaticCoaching, verifyCoachingCoverage } from "../static-coach";
import { CASE_ORDER } from "@/lib/cases";
import type { GuidedPhase } from "@/lib/store";

describe("Static coach coverage (Phase 5 Day 1)", () => {
  it("all 6 cases × 4 phases have non-empty coach text", () => {
    const { ok, missing } = verifyCoachingCoverage();
    expect(missing).toEqual([]);
    expect(ok).toBe(true);
  });

  it("getStaticCoaching returns a non-empty string for every (case, phase) combination", () => {
    const phases: GuidedPhase[] = ["hook", "discover", "apply", "reflect"];
    let count = 0;
    for (const caseId of CASE_ORDER) {
      for (const phase of phases) {
        const text = getStaticCoaching({ caseId, phase });
        expect(text.length, `${caseId}/${phase}`).toBeGreaterThan(0);
        count += 1;
      }
    }
    expect(count).toBe(24);
  });
});
