import type { CostParams } from "@/lib/cost-engine/types";
import {
  calculate,
  applyLoadingChange,
  applyLaborChange,
  applyMaterialYieldChange,
  applyCutsMaskChange,
  applyTactInvestmentChange
} from "@/lib/cost-engine/engine";
import { cloneParams } from "@/lib/cost-engine/presets";

export type AdapterFn = (base: CostParams, values: Record<string, number>) => CostParams | null;

// ── ≤20 lines each — v1.0 AC10 (b) path ──

const loading: AdapterFn = (base, v) =>
  applyLoadingChange(base, Number(v.new_loading ?? base.loading));

const labor: AdapterFn = (base, v) =>
  applyLaborChange(base, Number(v.labor_multiplier ?? 1));

// Case 3: target marginal-profit rate → reverse-engineer the required material cost
// and scale all BOM entries proportionally so the tree visibly shows the target state.
// required_material_cost = price × (1 − targetRate) − transport (variable cost breakdown)
const marginal: AdapterFn = (base, v) => {
  const targetRate = Number(v.target_rate ?? 0.60);
  const required = base.price * (1 - targetRate) - base.sga.transport;
  const current = calculate(base).material_cost;
  if (current <= 0 || required <= 0) return base;
  const scale = required / current;
  const next = cloneParams(base);
  next.bom = {
    tft: base.bom.tft * scale,
    cf: base.bom.cf * scale,
    cell: base.bom.cell * scale,
    module: base.bom.module * scale
  };
  return next;
};

const materialYield: AdapterFn = (base, v) =>
  applyMaterialYieldChange(
    base,
    Number(v.material_change_pct ?? 0),
    Number(v.module_yield_change ?? 0)
  );

const cutsMask: AdapterFn = (base, v) =>
  applyCutsMaskChange(
    base,
    Number(v.old_cuts ?? 25),
    Number(v.new_cuts ?? 25),
    Number(v.old_mask ?? 6),
    Number(v.new_mask ?? 6)
  );

const tactInvestment: AdapterFn = (base, v) =>
  applyTactInvestmentChange(
    base,
    Number(v.tact_multiplier ?? 1),
    Number(v.investment_depreciation_delta ?? 0)
  );

// Phase C — Boss Case #7. Composes loading + labor + material-yield in sequence,
// matching scripts/gen-fixtures.py case7_crisis_combo. Sequence order matters
// (loading first, then labor, then yield) — the golden fixture is computed the same way.
const crisis: AdapterFn = (base, v) => {
  const newLoading = Number(v.new_loading ?? base.loading);
  const laborMult = Number(v.labor_multiplier ?? 1);
  const moduleYieldChange = Number(v.module_yield_change ?? 0);
  let next = applyLoadingChange(base, newLoading);
  next = applyLaborChange(next, laborMult);
  next = applyMaterialYieldChange(next, 0, moduleYieldChange);
  return next;
};

export const ADAPTERS: Record<string, AdapterFn> = {
  loading,
  labor,
  marginal,
  "material-yield": materialYield,
  "cuts-mask": cutsMask,
  "tact-investment": tactInvestment,
  crisis
};

export function applyCaseAdapter(
  name: string,
  base: CostParams,
  values: Record<string, number>
): CostParams | null {
  const fn = ADAPTERS[name];
  return fn ? fn(base, values) : null;
}
