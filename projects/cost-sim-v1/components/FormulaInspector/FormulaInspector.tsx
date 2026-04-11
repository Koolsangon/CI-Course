"use client";

import { useStore } from "@/lib/store";
import { FIELD_TO_NODE, TREE_NODES } from "@/components/CostTree/tree-model";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";

const FIELD_LABELS: Record<string, string> = {
  price:             "Price",
  cop:               "COP",
  com:               "COM",
  sga:               "SGA",
  material_cost:     "소요재료비",
  processing_cost:   "가공비",
  panel_labor:       "Panel 노무비",
  panel_expense:     "Panel 경비",
  panel_depreciation:"Panel 상각비",
  module_labor:      "Module 노무비",
  module_expense:    "Module 경비",
  module_depreciation:"Module 상각비",
  operating_profit:  "영업이익",
  marginal_profit:   "한계이익",
  variable_cost:     "변동비"
};

function fmt(n: number): string {
  return `$${n.toFixed(2)}`;
}

export default function FormulaInspector() {
  const lastDelta = useStore((s) => s.lastDelta);

  // Top 4 deltas drive the numeric rows.
  const top = lastDelta.slice(0, 4);

  // Formula collection walks the FULL delta list (not just top 4) so that
  // deeper/more-specific nodes with smaller absDeltas (e.g. processing_cost
  // or sga in the labor case) still contribute their formulas even when the
  // top-4 slots are saturated by tied parent sums (cop = operating_profit = ...).
  const seen = new Set<string>();
  const formulas: { label: string; formula: string }[] = [];
  for (const t of lastDelta) {
    const node = TREE_NODES.find((n) => n.id === FIELD_TO_NODE[t.path]);
    if (!node?.formula) continue;
    if (seen.has(node.formula)) continue;
    seen.add(node.formula);
    formulas.push({ label: node.label, formula: node.formula });
    if (formulas.length >= 5) break; // cap at 5 to keep the panel compact
  }

  return (
    <aside className="flex flex-col gap-3 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-100))] overflow-hidden shadow-card">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[hsl(var(--border))] bg-[hsl(var(--surface-200)/0.5)] px-4 py-3">
        <Activity className="h-3.5 w-3.5 text-[hsl(var(--accent))]" />
        <h3 className="text-xs font-bold uppercase tracking-widest text-[hsl(var(--muted))]">
          수식 인스펙터
        </h3>
      </div>

      <div className="flex flex-col gap-3 px-4 pb-4">
        {top.length === 0 ? (
          <p className="text-xs leading-relaxed text-[hsl(var(--muted))]">
            슬라이더를 움직이면 어떤 항목이 어떻게 변했는지 표시됩니다.
          </p>
        ) : (
          <>
            {formulas.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--accent)/0.7)]">
                  관련 수식 {formulas.length > 1 ? `(${formulas.length})` : ""}
                </span>
                {formulas.map((f) => (
                  <div
                    key={f.formula}
                    className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-200)/0.5)] px-3 py-2"
                  >
                    <div className="text-[10px] font-semibold text-[hsl(var(--accent))] mb-0.5">
                      {f.label}
                    </div>
                    <code className="font-mono text-xs text-[hsl(var(--fg)/0.85)] leading-snug break-words">
                      {f.formula}
                    </code>
                  </div>
                ))}
              </div>
            )}

            <ul className="flex flex-col gap-2">
              {top.map((t) => {
                const isUp = t.delta > 0;
                return (
                  <li
                    key={t.path}
                    className="flex flex-col gap-1.5 rounded-xl border border-[hsl(var(--border)/0.5)] bg-[hsl(var(--surface-200)/0.3)] px-3 py-2.5"
                  >
                    {/* Top row: icon + label + delta pill */}
                    <div className="flex items-center gap-2">
                      {isUp
                        ? <TrendingUp   className="h-3.5 w-3.5 flex-shrink-0 text-[hsl(var(--danger))]" />
                        : <TrendingDown className="h-3.5 w-3.5 flex-shrink-0 text-[hsl(var(--success))]" />
                      }
                      <span className="flex-1 text-xs font-semibold text-[hsl(var(--fg)/0.9)]">
                        {FIELD_LABELS[t.path] ?? t.path}
                      </span>
                      <span
                        className={[
                          "flex-shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                          isUp
                            ? "bg-[hsl(var(--danger)/0.12)] text-[hsl(var(--danger))]"
                            : "bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))]"
                        ].join(" ")}
                      >
                        {isUp ? "+" : ""}{t.delta.toFixed(2)}
                      </span>
                    </div>

                    {/* Bottom row: before → after */}
                    <div className="flex items-center gap-1.5 pl-5 text-xs tabular-nums">
                      <span className="text-[hsl(var(--muted))]">{fmt(t.before)}</span>
                      <span className="text-[hsl(var(--muted)/0.4)]">→</span>
                      <span className={isUp ? "font-bold text-[hsl(var(--danger))]" : "font-bold text-[hsl(var(--success))]"}>
                        {fmt(t.after)}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </aside>
  );
}
