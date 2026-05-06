"use client";

import { useStore } from "@/lib/store";
import { FIELD_TO_NODE, TREE_NODES } from "@/components/CostTree/tree-model";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";
import { getCase, type InspectorSpec } from "@/lib/cases";
import { calculate } from "@/lib/cost-engine/engine";
import type { CostParams, CostResult } from "@/lib/cost-engine/types";

const FIELD_LABELS: Record<string, string> = {
  price:             "Price",
  cop:               "COP",
  com:               "COM",
  sga:               "SGA",
  material_cost:     "소요재료비",
  processing_cost:   "가공비",
  panel_labor:       "Panel 노무비",
  panel_expense:     "Panel 경비",
  panel_depreciation:"Panel 감상비",
  module_labor:      "Module 노무비",
  module_expense:    "Module 경비",
  module_depreciation:"Module 감상비",
  operating_profit:  "영업이익",
  marginal_profit:   "한계이익",
  variable_cost:     "변동비"
};

function fmt(n: number): string {
  return `$${n.toFixed(2)}`;
}

// ── Token resolver for case-driven inspector templates ────────────────────
function resolveTokens(
  template: string,
  sliderValues: Record<string, number>,
  params: CostParams
): string {
  return template.replace(/\{([^}]+)\}/g, (full, token: string) => {
    // case 01: {slider:new_loading_pct} → 0.50 → "50"
    if (token === "slider:new_loading_pct") {
      const v = sliderValues.new_loading;
      if (typeof v !== "number") return full;
      return Math.round(v * 100).toString();
    }
    // case 04: {slider:material_change_pct_inv} → -0.05 → "95.0%"
    if (token === "slider:material_change_pct_inv") {
      const v = sliderValues.material_change_pct;
      if (typeof v !== "number") return full;
      return `${(100 + v * 100).toFixed(1)}%`;
    }
    // case 04: {slider:module_yield_drop_abs} → -0.04 → "4.0%"
    if (token === "slider:module_yield_drop_abs") {
      const v = sliderValues.module_yield_change;
      if (typeof v !== "number") return full;
      return `${Math.abs(v * 100).toFixed(1)}%`;
    }
    // case 04: {module_net} — current Module net BOM, e.g. 75.0 × 95% = 71.3
    if (token === "module_net") {
      const v = sliderValues.material_change_pct;
      if (typeof v !== "number") return full;
      const baseModuleBom = 75.0;
      return (baseModuleBom * (1 + v)).toFixed(1);
    }
    // case 04: {module_yield_new} — e.g. 0.972 + (-0.04) → "93.2%"
    if (token === "module_yield_new") {
      const v = sliderValues.module_yield_change;
      if (typeof v !== "number") return full;
      return `${((0.972 + v) * 100).toFixed(1)}%`;
    }
    // case 04: {cum_yield_new} — current cumulative yield from params
    if (token === "cum_yield_new") {
      const cum = params.yields.tft * params.yields.cf * params.yields.cell * params.yields.module;
      return `${(cum * 100).toFixed(1)}%`;
    }
    return full;
  });
}

// ── Case-driven inspector body ────────────────────────────────────────────
function CaseInspector({
  spec,
  sliderValues,
  params,
  result,
  reference
}: {
  spec: InspectorSpec;
  sliderValues: Record<string, number>;
  params: CostParams;
  result: CostResult;
  reference: CostResult;
}) {
  const groups = spec.delta_groups
    ? spec.delta_groups
    : [{ title: "변동 내역", lines: spec.delta_lines ?? [] }];

  return (
    <div className="flex flex-col gap-3 px-4 pb-4">
      {/* 변동 내역 (수식 라인) */}
      <div className="flex flex-col gap-2.5">
        {groups.map((g) => (
          <div key={g.title} className="flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--accent)/0.7)]">
              {g.title}
            </span>
            <div className="flex flex-col gap-1">
              {g.lines.map((line, idx) => (
                <div
                  key={`${line.label}-${idx}`}
                  className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface-200)/0.5)] px-2.5 py-1.5"
                >
                  <div className="text-[10px] font-semibold text-[hsl(var(--accent))] mb-0.5">
                    {line.label}
                  </div>
                  <code className="font-mono text-[11px] text-[hsl(var(--fg)/0.85)] leading-snug break-words">
                    {resolveTokens(line.expr_template, sliderValues, params)}
                  </code>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 결과 (4줄) */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--accent)/0.7)]">
          결과
        </span>
        <ul className="flex flex-col gap-1.5">
          {spec.result_fields.map((field) => {
            const beforeVal = (reference as unknown as Record<string, number>)[field];
            const afterVal = (result as unknown as Record<string, number>)[field];
            if (typeof beforeVal !== "number" || typeof afterVal !== "number") return null;
            const delta = afterVal - beforeVal;
            const isUp = delta > 0;
            const colorClass =
              Math.abs(delta) < 1e-6
                ? "text-[hsl(var(--muted))]"
                : isUp
                  ? "text-[hsl(var(--danger))]"
                  : "text-[hsl(var(--success))]";
            return (
              <li
                key={field}
                className="flex flex-col gap-0.5 rounded-lg border border-[hsl(var(--border)/0.5)] bg-[hsl(var(--surface-200)/0.3)] px-2.5 py-1.5"
              >
                <div className="flex items-center gap-1.5">
                  {Math.abs(delta) < 1e-6 ? (
                    <span className="h-3.5 w-3.5" />
                  ) : isUp ? (
                    <TrendingUp className="h-3.5 w-3.5 flex-shrink-0 text-[hsl(var(--danger))]" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5 flex-shrink-0 text-[hsl(var(--success))]" />
                  )}
                  <span className="text-xs font-semibold text-[hsl(var(--fg)/0.9)]">
                    {FIELD_LABELS[field] ?? field}
                  </span>
                  <span className={`ml-auto text-[10px] tabular-nums ${colorClass}`}>
                    {delta >= 0 ? "+" : ""}
                    {delta.toFixed(1)}
                  </span>
                </div>
                <div className="flex flex-wrap items-baseline gap-1 pl-5 text-[11px] tabular-nums">
                  <span className="text-[hsl(var(--muted))]">{fmt(beforeVal)}</span>
                  <span className="text-[hsl(var(--muted)/0.4)]">→</span>
                  <span className={`font-bold ${colorClass}`}>{fmt(afterVal)}</span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export default function FormulaInspector() {
  const lastDelta = useStore((s) => s.lastDelta);
  const caseId = useStore((s) => s.caseId);
  const sliderValues = useStore((s) => s.sliderValues);
  const params = useStore((s) => s.params);
  const result = useStore((s) => s.result);

  const caseDef = caseId ? getCase(caseId) : undefined;
  const inspector = caseDef?.inspector;

  // Header is shared
  const header = (
    <div className="flex items-center gap-2 border-b border-[hsl(var(--border))] bg-[hsl(var(--surface-200)/0.5)] px-4 py-3">
      <Activity className="h-3.5 w-3.5 text-[hsl(var(--accent))]" />
      <h3 className="text-xs font-bold uppercase tracking-widest text-[hsl(var(--muted))]">
        수식 인스펙터
      </h3>
    </div>
  );

  // Case-driven mode
  if (inspector && caseDef) {
    const reference = calculate(caseDef.reference);
    return (
      <aside className="flex flex-col gap-3 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-100))] overflow-hidden shadow-card">
        {header}
        <CaseInspector
          spec={inspector}
          sliderValues={sliderValues}
          params={params}
          result={result}
          reference={reference}
        />
      </aside>
    );
  }

  // ── Fallback: original delta-driven mode ────────────────────────────────
  const top = lastDelta.slice(0, 4);

  const seen = new Set<string>();
  const formulas: { label: string; formula: string }[] = [];
  for (const t of lastDelta) {
    const node = TREE_NODES.find((n) => n.id === FIELD_TO_NODE[t.path]);
    if (!node?.formula) continue;
    if (seen.has(node.formula)) continue;
    seen.add(node.formula);
    formulas.push({ label: node.label, formula: node.formula });
    if (formulas.length >= 5) break;
  }

  return (
    <aside className="flex flex-col gap-3 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-100))] overflow-hidden shadow-card">
      {header}

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
                const pct = t.before !== 0 ? ((t.after - t.before) / t.before) * 100 : 0;
                const colorClass = isUp ? "text-[hsl(var(--danger))]" : "text-[hsl(var(--success))]";
                return (
                  <li
                    key={t.path}
                    className="flex flex-col gap-1 rounded-xl border border-[hsl(var(--border)/0.5)] bg-[hsl(var(--surface-200)/0.3)] px-3 py-2.5"
                  >
                    <div className="flex items-center gap-2">
                      {isUp
                        ? <TrendingUp   className="h-3.5 w-3.5 flex-shrink-0 text-[hsl(var(--danger))]" />
                        : <TrendingDown className="h-3.5 w-3.5 flex-shrink-0 text-[hsl(var(--success))]" />
                      }
                      <span className="text-xs font-semibold text-[hsl(var(--fg)/0.9)]">
                        {FIELD_LABELS[t.path] ?? t.path}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-baseline gap-1 pl-5 text-xs tabular-nums">
                      <span className="text-[hsl(var(--muted))]">기준 {fmt(t.before)}</span>
                      <span className="text-[hsl(var(--muted)/0.4)]">→</span>
                      <span className={`font-bold ${colorClass}`}>{fmt(t.after)}</span>
                      <span className={`text-[10px] ${colorClass}`}>
                        ({isUp ? "+" : ""}{t.delta.toFixed(2)}, {pct >= 0 ? "+" : ""}{pct.toFixed(1)}%)
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
