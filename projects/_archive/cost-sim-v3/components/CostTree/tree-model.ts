import type { CostResult, CostParams } from "@/lib/cost-engine/types";

/**
 * Declarative tree model — maps semantic node IDs to value accessors.
 * Used by CostTreeView to build reactflow nodes + edges in a single place.
 */

export interface TreeNodeDef {
  id: string;
  label: string;
  group: "root" | "top" | "com" | "sga" | "material" | "processing" | "bom";
  /** Derive the current display value from a CostResult snapshot. */
  valueOf: (r: CostResult, p: CostParams) => number;
  unit?: "$" | "%";
  formula?: string;
}

export interface TreeEdgeDef {
  from: string;
  to: string;
}

export const TREE_NODES: TreeNodeDef[] = [
  { id: "price", label: "Price", group: "root", valueOf: (r) => r.price, unit: "$" },
  { id: "cop", label: "COP", group: "top", valueOf: (r) => r.cop, unit: "$", formula: "COP = COM + SGA" },
  { id: "com", label: "COM", group: "com", valueOf: (r) => r.com, unit: "$", formula: "COM = 소요재료비 + 가공비" },
  { id: "sga", label: "SGA", group: "sga", valueOf: (r) => r.sga, unit: "$", formula: "SGA = 직개발 + 운반 + 사업부 + 운영 + Corp OH" },
  {
    id: "material",
    label: "소요재료비",
    group: "material",
    valueOf: (r) => r.material_cost,
    unit: "$",
    formula: "Σ(BOM / 누적수율)"
  },
  {
    id: "processing",
    label: "가공비",
    group: "processing",
    valueOf: (r) => r.processing_cost,
    unit: "$",
    formula: "Panel(노무+경비+상각) + Module(노무+경비+상각)"
  },
  {
    id: "bom_tft",
    label: "BOM TFT",
    group: "bom",
    valueOf: (_r, p) => p.bom.tft,
    unit: "$"
  },
  { id: "bom_cf", label: "BOM CF", group: "bom", valueOf: (_r, p) => p.bom.cf, unit: "$" },
  { id: "bom_cell", label: "BOM Cell", group: "bom", valueOf: (_r, p) => p.bom.cell, unit: "$" },
  {
    id: "bom_module",
    label: "BOM Module",
    group: "bom",
    valueOf: (_r, p) => p.bom.module,
    unit: "$"
  },
  {
    id: "panel_labor",
    label: "Panel 노무비",
    group: "processing",
    valueOf: (r) => r.panel_labor,
    unit: "$"
  },
  {
    id: "panel_expense",
    label: "Panel 경비",
    group: "processing",
    valueOf: (r) => r.panel_expense,
    unit: "$"
  },
  {
    id: "panel_depreciation",
    label: "Panel 상각비",
    group: "processing",
    valueOf: (r) => r.panel_depreciation,
    unit: "$"
  },
  {
    id: "module_labor",
    label: "Module 노무비",
    group: "processing",
    valueOf: (r) => r.module_labor,
    unit: "$"
  },
  {
    id: "module_expense",
    label: "Module 경비",
    group: "processing",
    valueOf: (r) => r.module_expense,
    unit: "$"
  },
  {
    id: "module_depreciation",
    label: "Module 상각비",
    group: "processing",
    valueOf: (r) => r.module_depreciation,
    unit: "$"
  }
];

export const TREE_EDGES: TreeEdgeDef[] = [
  { from: "price", to: "cop" },
  { from: "cop", to: "com" },
  { from: "cop", to: "sga" },
  { from: "com", to: "material" },
  { from: "com", to: "processing" },
  { from: "material", to: "bom_tft" },
  { from: "material", to: "bom_cf" },
  { from: "material", to: "bom_cell" },
  { from: "material", to: "bom_module" },
  { from: "processing", to: "panel_labor" },
  { from: "processing", to: "panel_expense" },
  { from: "processing", to: "panel_depreciation" },
  { from: "processing", to: "module_labor" },
  { from: "processing", to: "module_expense" },
  { from: "processing", to: "module_depreciation" }
];

/**
 * Map a CostResult field (from diff traces) to the tree node ID that
 * displays that field. Used to decide which node should pulse.
 */
export const FIELD_TO_NODE: Record<string, string> = {
  price: "price",
  cop: "cop",
  com: "com",
  sga: "sga",
  material_cost: "material",
  processing_cost: "processing",
  panel_labor: "panel_labor",
  panel_expense: "panel_expense",
  panel_depreciation: "panel_depreciation",
  module_labor: "module_labor",
  module_expense: "module_expense",
  module_depreciation: "module_depreciation"
};
