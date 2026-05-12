import type { CostResult } from "./types";

export interface DeltaTrace {
  path: keyof CostResult;
  before: number;
  after: number;
  delta: number;
  absDelta: number;
}

// Root-cause specificity rank. When two deltas are (near-)equal because one
// field is a linear sum of another (e.g. cop = com + sga, com = material + processing),
// we prefer the DEEPER / more-specific field so the Formula Inspector shows a
// stable, actionable formula instead of flipping between parent↔child sums every
// render due to ULP-level FP noise.
const SPECIFICITY: Record<string, number> = {
  price: 0,
  cop: 1,
  operating_profit: 1,
  cash_cost: 1,
  ebitda: 1,
  operating_margin: 1,
  com: 2,
  sga: 2,
  marginal_profit: 2,
  cumulative_yield: 2,
  material_cost: 3,
  processing_cost: 3,
  variable_cost: 3,
  bom_total: 3,
  panel_labor: 4,
  panel_expense: 4,
  panel_depreciation: 4,
  module_labor: 4,
  module_expense: 4,
  module_depreciation: 4
};

/**
 * Computes the set of CostResult fields that changed between two snapshots.
 * Sort order: absolute delta descending, with a specificity tiebreaker that
 * prefers deeper/more-specific nodes when deltas are within 1e-6 of each other.
 */
export function diff(prev: CostResult, next: CostResult, epsilon = 1e-6): DeltaTrace[] {
  const out: DeltaTrace[] = [];
  const keys = Object.keys(prev) as (keyof CostResult)[];

  for (const key of keys) {
    const before = prev[key];
    const after = next[key];
    if (typeof before !== "number" || typeof after !== "number") continue;
    const delta = after - before;
    if (Math.abs(delta) < epsilon) continue;
    out.push({
      path: key,
      before,
      after,
      delta,
      absDelta: Math.abs(delta)
    });
  }

  const TIE_EPS = 1e-6;
  out.sort((a, b) => {
    const d = b.absDelta - a.absDelta;
    if (Math.abs(d) > TIE_EPS) return d;
    const ra = SPECIFICITY[a.path] ?? 0;
    const rb = SPECIFICITY[b.path] ?? 0;
    if (rb !== ra) return rb - ra;
    return a.path.localeCompare(b.path);
  });
  return out;
}

/** True if any field changed beyond the epsilon. */
export function hasChanges(prev: CostResult, next: CostResult, epsilon = 1e-6): boolean {
  return diff(prev, next, epsilon).length > 0;
}
