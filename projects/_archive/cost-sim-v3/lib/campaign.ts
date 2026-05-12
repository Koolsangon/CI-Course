import campaignData from "@/content/campaign.json";
import { calculate } from "./cost-engine/engine";
import { ALL_REFERENCES } from "./cost-engine/presets";

export interface MonthDef {
  month: number;
  label: string;
  caseId: string;
  cfoBriefing: string;
  cfoReaction: {
    success: string;
    mid: string;
    fail: string;
  };
}

export interface CampaignDef {
  id: string;
  title: string;
  tagline: string;
  premise: string[];
  survival_floor_ratio: number;
  months: MonthDef[];
}

export const CAMPAIGN: CampaignDef = campaignData as CampaignDef;

export function getMonthForCase(caseId: string): MonthDef | undefined {
  return CAMPAIGN.months.find((m) => m.caseId === caseId);
}

/** Sum of reference operating profit across all 6 cases × survival floor ratio.
 *  Computed once at module load — engine is pure, presets are static. */
function computeSurvivalFloor(): number {
  let total = 0;
  for (const cid of [1, 2, 3, 4, 5, 6] as const) {
    const ref = ALL_REFERENCES[cid];
    total += calculate(ref).operating_profit;
  }
  return total * CAMPAIGN.survival_floor_ratio;
}

function computeReferenceTotal(): number {
  let total = 0;
  for (const cid of [1, 2, 3, 4, 5, 6] as const) {
    total += calculate(ALL_REFERENCES[cid]).operating_profit;
  }
  return total;
}

export const SURVIVAL_FLOOR = computeSurvivalFloor();
export const REFERENCE_TOTAL_PROFIT = computeReferenceTotal();

/** Tier reaction text from star count: 3=success, 2=mid, 0-1=fail. */
export function reactionForStars(month: MonthDef, stars: number): string {
  if (stars >= 3) return month.cfoReaction.success;
  if (stars >= 2) return month.cfoReaction.mid;
  return month.cfoReaction.fail;
}
