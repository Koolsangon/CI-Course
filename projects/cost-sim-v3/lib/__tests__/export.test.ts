import { describe, it, expect } from "vitest";
import { toTSV } from "../export";
import type { CostResult } from "../cost-engine/types";

function makeResult(overrides: Partial<CostResult> = {}): CostResult {
  return {
    price: 100,
    cumulative_yield: 0.9,
    bom_total: 30,
    material_cost: 30,
    processing_cost: 20,
    panel_labor: 5,
    panel_expense: 5,
    panel_depreciation: 5,
    module_labor: 3,
    module_expense: 4,
    module_depreciation: 3,
    com: 50,
    sga: 10,
    cop: 60,
    operating_profit: 40,
    operating_margin: 0.4,
    cash_cost: 45,
    ebitda: 55,
    variable_cost: 35,
    marginal_profit: 65,
    ...overrides,
  };
}

describe("toTSV", () => {
  it("generates a tab-separated table with correct header row", () => {
    const a = makeResult();
    const b = makeResult();
    const result = toTSV(a, b, "NameA", "NameB");
    const lines = result.split("\n");
    expect(lines[0]).toBe("항목\tNameA\tNameB\tΔ");
  });

  it("shows '+X.XX' format for positive delta (b > a)", () => {
    const a = makeResult({ price: 100 });
    const b = makeResult({ price: 110 });
    const result = toTSV(a, b, "NameA", "NameB");
    const lines = result.split("\n");
    // Price row is the first data row (index 1)
    const priceRow = lines[1];
    const delta = priceRow.split("\t")[3];
    expect(delta).toBe("+10.00");
  });

  it("shows '-X.XX' format for negative delta (b < a)", () => {
    const a = makeResult({ price: 100 });
    const b = makeResult({ price: 90 });
    const result = toTSV(a, b, "NameA", "NameB");
    const lines = result.split("\n");
    const priceRow = lines[1];
    const delta = priceRow.split("\t")[3];
    expect(delta).toBe("-10.00");
  });

  it("shows '0.00' when delta is zero", () => {
    const a = makeResult({ price: 100 });
    const b = makeResult({ price: 100 });
    const result = toTSV(a, b, "NameA", "NameB");
    const lines = result.split("\n");
    const priceRow = lines[1];
    const delta = priceRow.split("\t")[3];
    expect(delta).toBe("0.00");
  });

  it("includes all expected rows", () => {
    const a = makeResult();
    const b = makeResult();
    const result = toTSV(a, b, "NameA", "NameB");
    const lines = result.split("\n");
    // header + 12 data rows = 13 lines
    expect(lines.length).toBe(13);
  });

  it("formats operating_margin as percentage", () => {
    const a = makeResult({ operating_margin: 0.4 });
    const b = makeResult({ operating_margin: 0.45 });
    const result = toTSV(a, b, "NameA", "NameB");
    const lines = result.split("\n");
    // Find the 영업이익률 row
    const marginRow = lines.find((l) => l.startsWith("영업이익률"));
    expect(marginRow).toBeDefined();
    const cols = marginRow!.split("\t");
    expect(cols[1]).toBe("40.00%");
    expect(cols[2]).toBe("45.00%");
    expect(cols[3]).toBe("+5.00%");
  });
});
