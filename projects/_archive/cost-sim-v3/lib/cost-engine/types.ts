export interface YieldRates {
  tft: number;
  cf: number;
  cell: number;
  module: number;
}

export interface BOMMaterial {
  tft: number;
  cf: number;
  cell: number;
  module: number;
}

export interface ProcessingCostItem {
  labor: number;
  expense: number;
  depreciation: number;
}

export interface ProcessingCost {
  panel: ProcessingCostItem;
  module: ProcessingCostItem;
}

export interface SGA {
  direct_dev: number;
  transport: number;
  business_unit: number;
  operation: number;
  corporate_oh: number;
}

export interface CostParams {
  price: number;
  yields: YieldRates;
  bom: BOMMaterial;
  processing: ProcessingCost;
  sga: SGA;
  loading: number;
}

export interface CostResult {
  price: number;
  cumulative_yield: number;
  bom_total: number;
  material_cost: number;
  processing_cost: number;
  panel_labor: number;
  panel_expense: number;
  panel_depreciation: number;
  module_labor: number;
  module_expense: number;
  module_depreciation: number;
  com: number;
  sga: number;
  cop: number;
  operating_profit: number;
  operating_margin: number;
  cash_cost: number;
  ebitda: number;
  variable_cost: number;
  marginal_profit: number;
}

export interface MarginalTargetResult {
  reference: CostResult;
  target_rate: number;
  target_marginal_profit: number;
  target_variable_cost: number;
  required_material_cost: number;
  material_reduction: number;
  current_marginal_rate: number;
}
