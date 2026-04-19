import type { CostResult } from "./cost-engine/types";

export interface Row {
  label: string;
  key: keyof CostResult;
  isProfit: boolean;
  isPercent?: boolean;
}

export const ROWS: Row[] = [
  { label: "Price",      key: "price",            isProfit: false },
  { label: "소요재료비",  key: "material_cost",     isProfit: false },
  { label: "가공비",      key: "processing_cost",   isProfit: false },
  { label: "COM",        key: "com",               isProfit: false },
  { label: "SGA",        key: "sga",               isProfit: false },
  { label: "COP",        key: "cop",               isProfit: false },
  { label: "영업이익",    key: "operating_profit",  isProfit: true  },
  { label: "영업이익률",  key: "operating_margin",  isProfit: true,  isPercent: true },
  { label: "Cash Cost",  key: "cash_cost",         isProfit: false },
  { label: "EBITDA",     key: "ebitda",            isProfit: true  },
  { label: "변동비",      key: "variable_cost",     isProfit: false },
  { label: "한계이익",    key: "marginal_profit",   isProfit: true  },
];

function fmt(value: number, isPercent: boolean): string {
  if (isPercent) {
    return `${(value * 100).toFixed(2)}%`;
  }
  return value.toFixed(2);
}

function fmtDelta(delta: number, isPercent: boolean): string {
  const abs = isPercent
    ? `${(Math.abs(delta) * 100).toFixed(2)}%`
    : Math.abs(delta).toFixed(2);

  if (delta > 0) return `+${abs}`;
  if (delta < 0) return `-${abs}`;
  return isPercent ? "0.00%" : "0.00";
}

export function toTSV(
  a: CostResult,
  b: CostResult,
  nameA: string,
  nameB: string
): string {
  const header = `항목\t${nameA}\t${nameB}\tΔ`;

  const dataRows = ROWS.map((row) => {
    const valA = a[row.key] as number;
    const valB = b[row.key] as number;
    const delta = valB - valA;
    const isPercent = row.isPercent ?? false;
    return `${row.label}\t${fmt(valA, isPercent)}\t${fmt(valB, isPercent)}\t${fmtDelta(delta, isPercent)}`;
  });

  return [header, ...dataRows].join("\n");
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
