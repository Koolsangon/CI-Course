"use client";

import { useMemo } from "react";
import { calculate } from "@/lib/cost-engine/engine";
import { ROWS } from "@/lib/export";
import type { CostParams, CostResult } from "@/lib/cost-engine/types";
import DeltaCell from "./DeltaCell";

interface ScenarioItem {
  name: string;
  params: CostParams;
}

interface CompareViewProps {
  scenarioA: ScenarioItem;
  scenarioB: ScenarioItem;
}

function fmtValue(value: number, isPercent: boolean): string {
  if (isPercent) {
    return `${(value * 100).toFixed(2)}%`;
  }
  return value.toFixed(2);
}

export default function CompareView({ scenarioA, scenarioB }: CompareViewProps) {
  const resultA = useMemo(() => calculate(scenarioA.params), [scenarioA.params]);
  const resultB = useMemo(() => calculate(scenarioB.params), [scenarioB.params]);

  // Find biggest absolute change (excluding operating_margin which is a ratio)
  const biggestChange = useMemo(() => {
    let maxAbs = 0;
    let maxLabel = "";
    let maxDelta = 0;

    for (const row of ROWS) {
      if (row.isPercent) continue;
      const valA = resultA[row.key] as number;
      const valB = resultB[row.key] as number;
      const delta = valB - valA;
      if (Math.abs(delta) > maxAbs) {
        maxAbs = Math.abs(delta);
        maxLabel = row.label;
        maxDelta = delta;
      }
    }
    return { label: maxLabel, delta: maxDelta };
  }, [resultA, resultB]);

  const opProfitA = resultA.operating_profit;
  const opProfitB = resultB.operating_profit;
  const opProfitDelta = opProfitB - opProfitA;
  const opProfitPctChange =
    opProfitA !== 0 ? ((opProfitDelta / Math.abs(opProfitA)) * 100) : null;

  return (
    <div className="rounded-2xl bg-[hsl(var(--surface-100))] border border-[hsl(var(--border))] shadow-card overflow-hidden">
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--surface-200))]">
              <th className="text-left px-4 py-3 font-semibold text-[hsl(var(--fg))]">항목</th>
              <th className="text-right px-4 py-3 font-semibold text-[hsl(var(--fg))]">
                {scenarioA.name}
              </th>
              <th className="text-right px-4 py-3 font-semibold text-[hsl(var(--fg))]">
                {scenarioB.name}
              </th>
              <th className="text-right px-4 py-3 font-semibold text-[hsl(var(--muted))]">Δ</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row, idx) => {
              const valA = resultA[row.key] as number;
              const valB = resultB[row.key] as number;
              const delta = valB - valA;
              const isPercent = row.isPercent ?? false;

              return (
                <tr
                  key={row.key}
                  className={`border-b border-[hsl(var(--border))] transition-colors hover:bg-[hsl(var(--surface-200))] ${
                    idx % 2 === 0 ? "" : "bg-[hsl(var(--surface-100))]"
                  }`}
                >
                  <td className="px-4 py-2.5 text-[hsl(var(--fg))] font-medium">{row.label}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-[hsl(var(--fg))]">
                    {fmtValue(valA, isPercent)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-[hsl(var(--fg))]">
                    {fmtValue(valB, isPercent)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <DeltaCell
                      value={delta}
                      isProfit={row.isProfit}
                      format={isPercent ? "percent" : "dollar"}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="px-4 py-4 bg-[hsl(var(--surface-200))] border-t border-[hsl(var(--border))] flex flex-col sm:flex-row gap-3 text-sm">
        <div className="flex-1 flex items-center gap-2">
          <span className="text-[hsl(var(--muted))] font-medium">최대 변화 항목:</span>
          <span className="font-semibold text-[hsl(var(--fg))]">{biggestChange.label}</span>
          <DeltaCell
            value={biggestChange.delta}
            isProfit={ROWS.find((r) => r.label === biggestChange.label)?.isProfit ?? false}
            format="dollar"
          />
        </div>
        <div className="flex-1 flex items-center gap-2">
          <span className="text-[hsl(var(--muted))] font-medium">영업이익 Δ:</span>
          <DeltaCell value={opProfitDelta} isProfit={true} format="dollar" />
          {opProfitPctChange !== null && (
            <span className="text-[hsl(var(--muted))] font-mono">
              ({opProfitPctChange >= 0 ? "+" : ""}
              {opProfitPctChange.toFixed(1)}%)
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
