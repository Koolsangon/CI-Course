import { describe, it, expect } from "vitest";
import { resolveHints, type CaseHints } from "./worksheet-engine";
import type { CaseDef } from "./cases";

const CASE_HINTS: CaseHints = { l1: "CASE_L1", l2: "CASE_L2", l3: "CASE_L3" };

function makeCase(opts: { hints?: CaseHints; hint?: string } = {}): CaseDef {
  return {
    id: "case_test",
    title: "Test",
    scenario: "",
    adapter: "loading",
    reference: {} as CaseDef["reference"],
    variables: [],
    expected: {},
    phases: {
      hook: "",
      discover: "",
      reflect: "",
      apply: {
        question: "",
        answer_key: 0,
        tolerance: 0,
        hint: opts.hint ?? "",
        ...(opts.hints ? { hints: opts.hints } : {})
      }
    }
  };
}

describe("resolveHints — case-only lookup", () => {
  it("returns case.phases.apply.hints when defined", () => {
    const c = makeCase({ hints: CASE_HINTS, hint: "LEGACY" });
    expect(resolveHints(c)).toEqual(CASE_HINTS);
  });

  it("falls back to legacy phases.apply.hint string, cloning to all 3 levels", () => {
    const c = makeCase({ hint: "LEGACY" });
    expect(resolveHints(c)).toEqual({
      l1: "LEGACY",
      l2: "LEGACY",
      l3: "LEGACY"
    });
  });

  it("returns placeholder when caseDef is undefined", () => {
    expect(resolveHints(undefined)).toEqual({
      l1: "이 셀의 힌트가 아직 등록되지 않았습니다.",
      l2: "이 셀의 힌트가 아직 등록되지 않았습니다.",
      l3: "이 셀의 힌트가 아직 등록되지 않았습니다."
    });
  });
});
