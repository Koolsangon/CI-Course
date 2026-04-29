import type { CostParams } from "@/lib/cost-engine/types";
import {
  applyLoadingChange,
  applyMaterialYieldChange,
  applyCutsMaskChange,
  applyTactInvestmentChange
} from "@/lib/cost-engine/engine";

export type AdapterFn = (base: CostParams, values: Record<string, number>) => CostParams | null;

const loading: AdapterFn = (base, v) =>
  applyLoadingChange(base, Number(v.new_loading ?? base.loading));

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

export const ADAPTERS: Record<string, AdapterFn> = {
  loading,
  "material-yield": materialYield,
  "cuts-mask": cutsMask,
  "tact-investment": tactInvestment
};

export function applyCaseAdapter(
  name: string,
  base: CostParams,
  values: Record<string, number>
): CostParams | null {
  const fn = ADAPTERS[name];
  return fn ? fn(base, values) : null;
}
