/**
 * Phase C — Variable mastery taxonomy.
 *
 * 6 variables, each gains +1 mastery (capped at 5) when a case tagged with that
 * variable is solved correctly via Apply. The plan says: "in real factories the
 * variable is the unit of expertise" — so Loading-담당, Mask-담당 etc.
 */

export type VariableId =
  | "loading"
  | "labor"
  | "yield"
  | "cuts"
  | "mask"
  | "tact";

export interface VariableDef {
  id: VariableId;
  ko: string;
  hint: string;
}

export const VARIABLES: VariableDef[] = [
  { id: "loading", ko: "Loading", hint: "가동률과 가공비의 반비례 관계" },
  { id: "labor", ko: "인건비", hint: "노무비와 SGA 인건비 비중" },
  { id: "yield", ko: "수율 · BOM", hint: "재료비와 누적수율 분모 관계" },
  { id: "cuts", ko: "면취수", hint: "원판 1장당 패널 수, BOM·가공비 반비례" },
  { id: "mask", ko: "Mask", hint: "포토 마스크 수, Panel 가공비 비례" },
  { id: "tact", ko: "Tact", hint: "공정 사이클 시간, Module 가공비 비례" }
];

export const MASTERY_CAP = 5;

/** Tags drawn from each case's `variables_tagged` field — see content/cases/*.json. */
export const CASE_VARIABLE_TAGS: Record<string, VariableId[]> = {
  "01-loading": ["loading"],
  "02-labor": ["labor"],
  "03-marginal": ["yield"],
  "04-material-yield": ["yield"],
  "05-cuts-mask": ["cuts", "mask"],
  "06-tact-investment": ["tact"],
  // Boss case touches three variables; the +1 mastery applies to each on first ★1.
  "07-crisis": ["loading", "labor", "yield"]
};

export function tagsForCase(caseId: string): VariableId[] {
  return CASE_VARIABLE_TAGS[caseId] ?? [];
}
