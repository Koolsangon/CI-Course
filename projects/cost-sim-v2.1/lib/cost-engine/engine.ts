import type {
  BOMMaterial,
  CostParams,
  CostResult,
  MarginalTargetResult,
  ProcessingCost,
  SGA,
  YieldRates
} from "./types";
import { cloneParams } from "./presets";

// ── pure helpers ──────────────────────────────────────────────────────────

function cumulativeYield(y: YieldRates): number {
  return y.tft * y.cf * y.cell * y.module;
}

function remainingYields(y: YieldRates): { tft: number; cf: number; cell: number; module: number } {
  return {
    tft: y.tft * y.cf * y.cell * y.module,
    cf: y.cf * y.cell * y.module,
    cell: y.cell * y.module,
    module: y.module
  };
}

function bomTotal(bom: BOMMaterial): number {
  return bom.tft + bom.cf + bom.cell + bom.module;
}

function processingTotal(p: ProcessingCost): number {
  return (
    p.panel.labor +
    p.panel.expense +
    p.panel.depreciation +
    p.module.labor +
    p.module.expense +
    p.module.depreciation
  );
}

function processingDepreciation(p: ProcessingCost): number {
  return p.panel.depreciation + p.module.depreciation;
}

function sgaTotal(s: SGA): number {
  return s.direct_dev + s.transport + s.business_unit + s.operation + s.corporate_oh;
}

// ── core calculate ────────────────────────────────────────────────────────

export function calculate(params: CostParams): CostResult {
  const price = params.price;
  const cum_yield = cumulativeYield(params.yields);
  const bom_total = bomTotal(params.bom);

  const ry = remainingYields(params.yields);
  const material_cost =
    (ry.tft > 0 ? params.bom.tft / ry.tft : 0) +
    (ry.cf > 0 ? params.bom.cf / ry.cf : 0) +
    (ry.cell > 0 ? params.bom.cell / ry.cell : 0) +
    (ry.module > 0 ? params.bom.module / ry.module : 0);

  const proc = params.processing;
  const processing_cost = processingTotal(proc);
  const total_depreciation = processingDepreciation(proc);

  const com = material_cost + processing_cost;
  const sga = sgaTotal(params.sga);
  const cop = com + sga;

  const operating_profit = price - cop;
  const operating_margin = price > 0 ? operating_profit / price : 0;
  const cash_cost = cop - total_depreciation;
  const ebitda = price - cash_cost;

  const variable_cost = material_cost + params.sga.transport;
  const marginal_profit = price - variable_cost;

  return {
    price,
    cumulative_yield: cum_yield,
    bom_total,
    material_cost,
    processing_cost,
    panel_labor: proc.panel.labor,
    panel_expense: proc.panel.expense,
    panel_depreciation: proc.panel.depreciation,
    module_labor: proc.module.labor,
    module_expense: proc.module.expense,
    module_depreciation: proc.module.depreciation,
    com,
    sga,
    cop,
    operating_profit,
    operating_margin,
    cash_cost,
    ebitda,
    variable_cost,
    marginal_profit
  };
}

// ── case transforms (mirrors of Python apply_*) ───────────────────────────

/** Case 1: Loading 변화 — 가공비 각 항목을 (기준Loading / 새Loading) 배율로 변경. */
export function applyLoadingChange(base: CostParams, newLoading: number): CostParams {
  const next = cloneParams(base);
  const ratio = newLoading > 0 ? base.loading / newLoading : 999;
  next.processing = {
    panel: {
      labor: base.processing.panel.labor * ratio,
      expense: base.processing.panel.expense * ratio,
      depreciation: base.processing.panel.depreciation * ratio
    },
    module: {
      labor: base.processing.module.labor * ratio,
      expense: base.processing.module.expense * ratio,
      depreciation: base.processing.module.depreciation * ratio
    }
  };
  next.loading = newLoading;
  return next;
}

/** Case 2: 인건비 변화 — 가공비 노무비에 배수, SGA는 인건비 비중 30%에만 배수. */
export function applyLaborChange(base: CostParams, laborMultiplier: number): CostParams {
  const next = cloneParams(base);
  next.processing = {
    panel: {
      labor: base.processing.panel.labor * laborMultiplier,
      expense: base.processing.panel.expense,
      depreciation: base.processing.panel.depreciation
    },
    module: {
      labor: base.processing.module.labor * laborMultiplier,
      expense: base.processing.module.expense,
      depreciation: base.processing.module.depreciation
    }
  };

  const sga_total = sgaTotal(base.sga);
  const new_sga_total = sga_total * 0.7 + sga_total * 0.3 * laborMultiplier;
  const sga_ratio = sga_total > 0 ? new_sga_total / sga_total : 1;
  next.sga = {
    direct_dev: base.sga.direct_dev * sga_ratio,
    transport: base.sga.transport,
    business_unit: base.sga.business_unit * sga_ratio,
    operation: base.sga.operation * sga_ratio,
    corporate_oh: base.sga.corporate_oh * sga_ratio
  };
  return next;
}

/** Case 3: 한계이익률 목표 역산. */
export function applyMarginalProfitTarget(base: CostParams, targetRate: number): MarginalTargetResult {
  const ref = calculate(base);
  const target_marginal_profit = base.price * targetRate;
  const target_variable_cost = base.price - target_marginal_profit;
  const required_material_cost = target_variable_cost - base.sga.transport;
  const material_reduction = ref.material_cost - required_material_cost;
  return {
    reference: ref,
    target_rate: targetRate,
    target_marginal_profit: round1(target_marginal_profit),
    target_variable_cost: round1(target_variable_cost),
    required_material_cost: round1(required_material_cost),
    material_reduction: round1(material_reduction),
    current_marginal_rate: round1((ref.marginal_profit / base.price) * 100)
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Case 4: 재료비 변화율 + Module 수율 절대 변화량. */
export function applyMaterialYieldChange(
  base: CostParams,
  materialChangePct: number,
  moduleYieldChange: number
): CostParams {
  const next = cloneParams(base);
  const factor = 1 + materialChangePct;
  next.bom = {
    tft: base.bom.tft,
    cf: base.bom.cf,
    cell: base.bom.cell,
    module: base.bom.module * factor
  };
  next.yields = {
    tft: base.yields.tft,
    cf: base.yields.cf,
    cell: base.yields.cell,
    module: base.yields.module + moduleYieldChange
  };
  return next;
}

/** Case 5: 면취수/Mask 변화. */
export function applyCutsMaskChange(
  base: CostParams,
  oldCuts = 25,
  newCuts = 29,
  oldMask = 6,
  newMask = 6
): CostParams {
  const next = cloneParams(base);
  const cuts_ratio = oldCuts / newCuts;
  const mask_ratio = newMask / oldMask;

  next.bom = {
    tft: base.bom.tft * cuts_ratio,
    cf: base.bom.cf * cuts_ratio,
    cell: base.bom.cell * cuts_ratio,
    module: base.bom.module
  };

  const panel_factor = cuts_ratio * mask_ratio;
  next.processing = {
    panel: {
      labor: base.processing.panel.labor * panel_factor,
      expense: base.processing.panel.expense * panel_factor,
      depreciation: base.processing.panel.depreciation * panel_factor
    },
    module: {
      labor: base.processing.module.labor,
      expense: base.processing.module.expense,
      depreciation: base.processing.module.depreciation
    }
  };
  return next;
}

/** Case 6: Module Tact × tactMultiplier + 상각비 덧셈. */
export function applyTactInvestmentChange(
  base: CostParams,
  tactMultiplier = 1.0,
  investmentDepreciationDelta = 0.0
): CostParams {
  const next = cloneParams(base);
  next.processing = {
    panel: { ...base.processing.panel },
    module: {
      labor: base.processing.module.labor * tactMultiplier,
      expense: base.processing.module.expense * tactMultiplier,
      depreciation:
        base.processing.module.depreciation * tactMultiplier + investmentDepreciationDelta
    }
  };
  return next;
}
