import type { CostParams } from "./types";

const defaultSGA = {
  direct_dev: 4.7,
  transport: 0.3,
  business_unit: 16.0,
  operation: 1.2,
  corporate_oh: 6.2
};

export const REFERENCE_CASE1: CostParams = {
  price: 200.0,
  yields: { tft: 0.99, cf: 1.0, cell: 0.95, module: 0.972 },
  bom: { tft: 6.0, cf: 5.0, cell: 1.5, module: 75.0 },
  processing: {
    panel: { labor: 21.3, expense: 11.5, depreciation: 16.2 },
    module: { labor: 8.7, expense: 5.3, depreciation: 7.5 }
  },
  sga: { ...defaultSGA },
  loading: 0.70
};

export const REFERENCE_CASE2: CostParams = {
  price: 200.0,
  yields: { tft: 0.99, cf: 1.0, cell: 0.95, module: 0.9413 },
  bom: { tft: 6.0, cf: 5.0, cell: 1.5, module: 75.0 },
  processing: {
    panel: { labor: 10.0, expense: 5.5, depreciation: 19.0 },
    module: { labor: 2.1, expense: 1.6, depreciation: 3.1 }
  },
  sga: { ...defaultSGA },
  loading: 0.70
};

export const REFERENCE_CASE3: CostParams = {
  price: 200.0,
  yields: { tft: 0.99, cf: 1.0, cell: 0.95, module: 0.9413 },
  bom: { tft: 6.0, cf: 5.0, cell: 1.5, module: 75.0 },
  processing: {
    panel: { labor: 10.0, expense: 5.5, depreciation: 19.0 },
    module: { labor: 2.1, expense: 1.6, depreciation: 3.1 }
  },
  sga: { ...defaultSGA },
  loading: 0.70
};

export const REFERENCE_CASE4: CostParams = {
  price: 200.0,
  yields: { tft: 0.99, cf: 1.0, cell: 0.95, module: 0.972 },
  bom: { tft: 6.0, cf: 5.0, cell: 1.5, module: 75.0 },
  processing: {
    panel: { labor: 21.3, expense: 11.5, depreciation: 16.2 },
    module: { labor: 8.7, expense: 5.3, depreciation: 7.5 }
  },
  sga: { ...defaultSGA },
  loading: 0.70
};

export const REFERENCE_CASE5: CostParams = {
  price: 200.0,
  yields: { tft: 0.99, cf: 1.0, cell: 0.95, module: 0.972 },
  bom: { tft: 6.0, cf: 5.0, cell: 1.5, module: 75.0 },
  processing: {
    panel: { labor: 21.3, expense: 11.5, depreciation: 16.2 },
    module: { labor: 8.7, expense: 5.3, depreciation: 7.5 }
  },
  sga: { ...defaultSGA },
  loading: 0.70
};

export const REFERENCE_CASE6: CostParams = {
  price: 200.0,
  yields: { tft: 0.99, cf: 1.0, cell: 0.95, module: 0.972 },
  bom: { tft: 6.0, cf: 5.0, cell: 1.5, module: 75.0 },
  processing: {
    panel: { labor: 21.3, expense: 11.5, depreciation: 16.2 },
    module: { labor: 8.7, expense: 5.3, depreciation: 7.5 }
  },
  sga: { ...defaultSGA },
  loading: 0.70
};

export const ALL_REFERENCES: Record<1 | 2 | 3 | 4 | 5 | 6, CostParams> = {
  1: REFERENCE_CASE1,
  2: REFERENCE_CASE2,
  3: REFERENCE_CASE3,
  4: REFERENCE_CASE4,
  5: REFERENCE_CASE5,
  6: REFERENCE_CASE6
};

export function cloneParams(p: CostParams): CostParams {
  return {
    price: p.price,
    yields: { ...p.yields },
    bom: { ...p.bom },
    processing: {
      panel: { ...p.processing.panel },
      module: { ...p.processing.module }
    },
    sga: { ...p.sga },
    loading: p.loading
  };
}
