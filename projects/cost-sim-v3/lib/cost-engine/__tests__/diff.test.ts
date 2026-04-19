import { describe, it, expect } from "vitest";
import { diff, hasChanges } from "../diff";
import { calculate, applyLoadingChange } from "../engine";
import { REFERENCE_CASE1 } from "../presets";

describe("diff()", () => {
  it("returns empty array for identical snapshots", () => {
    const r = calculate(REFERENCE_CASE1);
    expect(diff(r, r)).toEqual([]);
    expect(hasChanges(r, r)).toBe(false);
  });

  it("detects all changed nodes and sorts by absolute delta desc", () => {
    const base = calculate(REFERENCE_CASE1);
    const next = calculate(applyLoadingChange(REFERENCE_CASE1, 0.5));

    const traces = diff(base, next);
    expect(traces.length).toBeGreaterThan(0);
    expect(hasChanges(base, next)).toBe(true);

    // Panel labor should change: 21.3 → 29.82 (delta ≈ 8.52)
    const panelLabor = traces.find((t) => t.path === "panel_labor");
    expect(panelLabor).toBeDefined();
    expect(panelLabor!.before).toBeCloseTo(21.3, 3);
    expect(panelLabor!.after).toBeCloseTo(29.82, 3);

    // Sorted by absDelta descending
    for (let i = 1; i < traces.length; i++) {
      expect(traces[i - 1]!.absDelta).toBeGreaterThanOrEqual(traces[i]!.absDelta);
    }
  });
});
