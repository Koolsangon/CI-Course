import type { CostParams } from "./cost-engine/types";
import case01 from "@/content/cases/01-loading.json";
import case04 from "@/content/cases/04-material-yield.json";
import case05 from "@/content/cases/05-cuts-mask.json";
import case06 from "@/content/cases/06-tact-investment.json";

export interface CaseVariable {
  key: string;
  ko: string;
  min: number;
  max: number;
  step: number;
  default: number;
  unit: string;
  format: string;
  description?: string;
}

export interface InspectorLine {
  label: string;
  expr_template: string;
}

export interface InspectorGroup {
  title: string;
  lines: InspectorLine[];
}

export interface InspectorSpec {
  delta_lines?: InspectorLine[];
  delta_groups?: InspectorGroup[];
  result_fields: string[];
}

export interface TreeInfoEntry {
  label: string;
  field: string;
  format: "percent1" | "dollar1";
}

export interface CaseDef {
  id: string;
  title: string;
  scenario: string;
  adapter: string;
  reference: CostParams;
  variables: CaseVariable[];
  expected: Record<string, number>;
  inspector?: InspectorSpec;
  tree_info?: TreeInfoEntry[];
  phases: {
    hook: string;
    discover: string;
    apply: {
      question: string;
      answer_key: number;
      tolerance: number;
      hint: string;
      hints?: {
        l1: string;
        l2: string;
        l3: string;
      };
    };
    reflect: string;
  };
  coach: {
    hook: string;
    discover: string;
    apply: string;
    reflect: string;
  };
}

export const CASES: Record<string, CaseDef> = {
  "01-loading": case01 as unknown as CaseDef,
  "04-material-yield": case04 as unknown as CaseDef,
  "05-cuts-mask": case05 as unknown as CaseDef,
  "06-tact-investment": case06 as unknown as CaseDef
};

export const CASE_ORDER = [
  "01-loading",
  "04-material-yield",
  "05-cuts-mask",
  "06-tact-investment"
] as const;

export function getCase(id: string): CaseDef | undefined {
  return CASES[id];
}
