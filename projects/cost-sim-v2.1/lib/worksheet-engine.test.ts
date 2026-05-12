import { describe, it, expect } from "vitest";
import { resolveHints } from "./worksheet-engine";
import type { ProblemDef, CellHints, RowDef, CellDef } from "@/content/problems/types";
import type { CaseDef } from "./cases";

const CELL_HINTS: CellHints = { l1: "CELL_L1", l2: "CELL_L2", l3: "CELL_L3" };
const ROW_HINTS:  CellHints = { l1: "ROW_L1",  l2: "ROW_L2",  l3: "ROW_L3"  };
const CASE_HINTS: CellHints = { l1: "CASE_L1", l2: "CASE_L2", l3: "CASE_L3" };

function makeProblem(opts: { cellHints?: CellHints; rowHints?: CellHints } = {}): ProblemDef {
  const yellowCell: CellDef = { id: "c1", type: "yellow", answer: 100 };
  if (opts.cellHints) yellowCell.hints = opts.cellHints;
  const row: RowDef = {
    id: "r1",
    label: "Row 1",
    cells: {
      ref: { id: "ref", type: "purple", value: 50 },
      sim1: yellowCell
    }
  };
  if (opts.rowHints) row.hints = opts.rowHints;
  return {
    id: "p_test",
    title: "Test",
    scenario: "",
    columns: [
      { id: "ref", header: "Ref" },
      { id: "sim1", header: "Sim1" }
    ],
    rows: [row]
  };
}

function makeCase(opts: { hints?: CellHints; hint?: string } = {}): CaseDef {
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
    },
    coach: { hook: "", discover: "", apply: "", reflect: "" }
  };
}

describe("resolveHints — cascade priority", () => {
  it("returns cell.hints when defined (highest priority over row and case)", () => {
    const p = makeProblem({ cellHints: CELL_HINTS, rowHints: ROW_HINTS });
    const c = makeCase({ hints: CASE_HINTS, hint: "CASE_STR" });
    expect(resolveHints(p, c, "sim1", "r1")).toEqual(CELL_HINTS);
  });

  it("falls back to row.hints when cell.hints is missing", () => {
    const p = makeProblem({ rowHints: ROW_HINTS });
    const c = makeCase({ hints: CASE_HINTS, hint: "CASE_STR" });
    expect(resolveHints(p, c, "sim1", "r1")).toEqual(ROW_HINTS);
  });

  it("falls back to caseDef.phases.apply.hints when cell and row are missing", () => {
    const p = makeProblem();
    const c = makeCase({ hints: CASE_HINTS, hint: "CASE_STR" });
    expect(resolveHints(p, c, "sim1", "r1")).toEqual(CASE_HINTS);
  });

  it("falls back to legacy phases.apply.hint string, cloning to all 3 levels", () => {
    const p = makeProblem();
    const c = makeCase({ hint: "LEGACY" });
    expect(resolveHints(p, c, "sim1", "r1")).toEqual({
      l1: "LEGACY",
      l2: "LEGACY",
      l3: "LEGACY"
    });
  });

  it("returns placeholder when no hints anywhere (no caseDef at all)", () => {
    const p = makeProblem();
    expect(resolveHints(p, undefined, "sim1", "r1")).toEqual({
      l1: "이 셀의 힌트가 아직 등록되지 않았습니다.",
      l2: "이 셀의 힌트가 아직 등록되지 않았습니다.",
      l3: "이 셀의 힌트가 아직 등록되지 않았습니다."
    });
  });

  it("returns placeholder when rowId is not in problem (defensive lookup)", () => {
    const p = makeProblem();
    expect(resolveHints(p, undefined, "sim1", "no_such_row")).toEqual({
      l1: "이 셀의 힌트가 아직 등록되지 않았습니다.",
      l2: "이 셀의 힌트가 아직 등록되지 않았습니다.",
      l3: "이 셀의 힌트가 아직 등록되지 않았습니다."
    });
  });
});
