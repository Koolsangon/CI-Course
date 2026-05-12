"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, ClipboardCopy, Check, Trash2 } from "lucide-react";
import { useWorkStore } from "@/lib/work-store";
import { calculate } from "@/lib/cost-engine/engine";
import { toTSV, copyToClipboard } from "@/lib/export";
import CompareView from "@/components/Scenario/CompareView";

export default function ComparePage() {
  const scenarios = useWorkStore((s) => s.scenarios);
  const deleteScenario = useWorkStore((s) => s.deleteScenario);

  // selected holds up to 2 scenario IDs, in order of selection (oldest first)
  const [selected, setSelected] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const toggleSelect = useCallback(
    (id: string) => {
      setSelected((prev) => {
        if (prev.includes(id)) {
          // deselect
          return prev.filter((s) => s !== id);
        }
        if (prev.length < 2) {
          return [...prev, id];
        }
        // replace oldest (first) with new selection
        return [prev[1], id];
      });
    },
    []
  );

  const handleDelete = useCallback(
    (id: string) => {
      deleteScenario(id);
      setSelected((prev) => prev.filter((s) => s !== id));
    },
    [deleteScenario]
  );

  const handleCopy = useCallback(async () => {
    if (selected.length < 2) return;
    const scenA = scenarios.find((s) => s.id === selected[0]);
    const scenB = scenarios.find((s) => s.id === selected[1]);
    if (!scenA || !scenB) return;

    const resultA = calculate(scenA.params);
    const resultB = calculate(scenB.params);
    const tsv = toTSV(resultA, resultB, scenA.name, scenB.name);
    const ok = await copyToClipboard(tsv);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [selected, scenarios]);

  const scenarioA = selected[0] ? scenarios.find((s) => s.id === selected[0]) : null;
  const scenarioB = selected[1] ? scenarios.find((s) => s.id === selected[1]) : null;
  const canCompare = !!(scenarioA && scenarioB);

  return (
    <main className="min-h-screen bg-[hsl(var(--bg))] px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-4xl flex flex-col gap-6">

        {/* Back link + title */}
        <div className="flex flex-col gap-2">
          <Link
            href="/analyze"
            className="flex items-center gap-1.5 text-sm text-[hsl(var(--muted))] hover:text-[hsl(var(--fg))] transition-colors w-fit"
          >
            <ArrowLeft className="h-4 w-4" />
            분석으로 돌아가기
          </Link>
          <h1 className="text-2xl font-bold text-[hsl(var(--fg))]">시나리오 비교</h1>
        </div>

        {/* Scenario selector */}
        <section className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-100))] shadow-card p-4 flex flex-col gap-3">
          <p className="text-sm font-medium text-[hsl(var(--muted))]">
            비교할 시나리오 2개를 선택하세요.
          </p>

          {scenarios.length === 0 ? (
            <p className="text-sm text-[hsl(var(--muted)/0.7)] py-2">
              저장된 시나리오가 없습니다. /analyze 에서 시나리오를 저장해 주세요.
            </p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {scenarios.map((scenario) => {
                const isSelected = selected.includes(scenario.id);
                const selectionOrder = selected.indexOf(scenario.id);
                return (
                  <li key={scenario.id} className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => toggleSelect(scenario.id)}
                      className={[
                        "flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium border transition-all",
                        isSelected
                          ? "border-[hsl(210_80%_50%/0.6)] bg-[hsl(210_80%_40%/0.12)] text-[hsl(var(--fg))]"
                          : "border-[hsl(var(--border))] bg-[hsl(var(--surface-200))] text-[hsl(var(--muted))] hover:border-[hsl(var(--border))] hover:text-[hsl(var(--fg))]"
                      ].join(" ")}
                    >
                      {isSelected && (
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[hsl(210_80%_50%)] text-white text-[10px] font-bold shrink-0">
                          {selectionOrder + 1}
                        </span>
                      )}
                      {scenario.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(scenario.id)}
                      aria-label={`${scenario.name} 삭제`}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-[hsl(var(--muted))] hover:bg-[hsl(var(--surface-200))] hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Compare table or empty state */}
        {canCompare ? (
          <>
            <CompareView
              scenarioA={{ name: scenarioA.name, params: scenarioA.params }}
              scenarioB={{ name: scenarioB.name, params: scenarioB.params }}
            />

            {/* Copy button */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-100))] px-4 py-2 text-sm font-medium text-[hsl(var(--fg))] shadow-sm hover:bg-[hsl(var(--surface-200))] transition-all active:scale-95"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-green-400" />
                    복사됨!
                  </>
                ) : (
                  <>
                    <ClipboardCopy className="h-4 w-4" />
                    클립보드 복사
                  </>
                )}
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center rounded-2xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--surface-100)/0.5)] py-16 px-6 text-center">
            <p className="text-sm text-[hsl(var(--muted))]">
              비교하려면 시나리오를 2개 이상 저장해 주세요.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
