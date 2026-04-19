"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, BarChart3, Settings, X } from "lucide-react";

import { useWorkStore } from "@/lib/work-store";
import type { CustomPreset } from "@/lib/work-store";
import { cloneParams } from "@/lib/cost-engine/presets";
import { calculate } from "@/lib/cost-engine/engine";
import { diff } from "@/lib/cost-engine/diff";
import type { CostParams, CostResult } from "@/lib/cost-engine/types";
import type { DeltaTrace } from "@/lib/cost-engine/diff";

import AnalyzePanel from "@/components/Work/AnalyzePanel";
import CostTreeView from "@/components/CostTree/CostTreeView";
import PresetForm from "@/components/CustomPreset/PresetForm";
import PresetManager from "@/components/CustomPreset/PresetManager";
import Button from "@/components/ui/Button";

// ── Types ───────────────────────────────────────────────────────────────────

type ViewMode = "analyze" | "new-preset" | "manage";

// ── Page component ──────────────────────────────────────────────────────────

export default function AnalyzePage() {
  const router = useRouter();

  // ── Work store ──────────────────────────────────────────────────────────
  const customPresets = useWorkStore((s) => s.customPresets);
  const scenarios = useWorkStore((s) => s.scenarios);
  const activePresetId = useWorkStore((s) => s.activePresetId);
  const setActivePreset = useWorkStore((s) => s.setActivePreset);
  const loadSamplePresets = useWorkStore((s) => s.loadSamplePresets);
  const savePreset = useWorkStore((s) => s.savePreset);
  const deletePreset = useWorkStore((s) => s.deletePreset);
  const saveScenario = useWorkStore((s) => s.saveScenario);
  const deleteScenario = useWorkStore((s) => s.deleteScenario);

  // ── View mode ───────────────────────────────────────────────────────────
  const [view, setView] = useState<ViewMode>("analyze");

  // ── Save-scenario modal ─────────────────────────────────────────────────
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [scenarioName, setScenarioName] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);

  // ── Load sample presets on mount ────────────────────────────────────────
  const initDone = useRef(false);
  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;
    loadSamplePresets();
  }, [loadSamplePresets]);

  // Auto-select first preset if none selected
  useEffect(() => {
    if (!activePresetId && customPresets.length > 0) {
      setActivePreset(customPresets[0].id);
    }
  }, [activePresetId, customPresets, setActivePreset]);

  // ── Active preset params ────────────────────────────────────────────────
  const activePreset = useMemo(
    () => customPresets.find((p) => p.id === activePresetId) ?? null,
    [customPresets, activePresetId],
  );

  const activeParams = useMemo(
    () => (activePreset ? cloneParams(activePreset.params) : null),
    [activePreset],
  );

  // ── Local analysis state ────────────────────────────────────────────────
  const [currentParams, setCurrentParams] = useState<CostParams | null>(null);
  const [currentResult, setCurrentResult] = useState<CostResult | null>(null);
  const [changedPaths, setChangedPaths] = useState<DeltaTrace[]>([]);

  // Baseline result for delta tracking
  const baselineResult = useMemo(
    () => (activeParams ? calculate(activeParams) : null),
    [activeParams],
  );

  // Sync when active preset changes
  useEffect(() => {
    if (activeParams && baselineResult) {
      setCurrentParams(cloneParams(activeParams));
      setCurrentResult(baselineResult);
      setChangedPaths([]);
    }
  }, [activeParams, baselineResult]);

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleParamChange = useCallback(
    (params: CostParams, result: CostResult) => {
      setCurrentParams(params);
      setCurrentResult(result);
      if (baselineResult) {
        setChangedPaths(diff(baselineResult, result));
      }
    },
    [baselineResult],
  );

  const handlePresetChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setActivePreset(e.target.value);
      setView("analyze");
    },
    [setActivePreset],
  );

  const handleSaveScenario = useCallback(() => {
    if (!scenarioName.trim() || !activePresetId || !currentParams) return;
    try {
      saveScenario(scenarioName.trim(), activePresetId, currentParams);
      setShowSaveModal(false);
      setScenarioName("");
    } catch (err) {
      alert(err instanceof Error ? err.message : "저장 실패");
    }
  }, [scenarioName, activePresetId, currentParams, saveScenario]);

  const handleOpenSaveModal = useCallback(() => {
    setScenarioName("");
    setShowSaveModal(true);
    setTimeout(() => nameInputRef.current?.focus(), 50);
  }, []);

  const handlePresetSelect = useCallback(
    (preset: CustomPreset) => {
      setActivePreset(preset.id);
      setView("analyze");
    },
    [setActivePreset],
  );

  const handlePresetSaveFromForm = useCallback(
    (name: string, params: CostParams) => {
      try {
        const id = savePreset(name, params);
        setActivePreset(id);
        setView("analyze");
      } catch (err) {
        alert(err instanceof Error ? err.message : "프리셋 저장 실패");
      }
    },
    [savePreset, setActivePreset],
  );

  const handleAnalyzeFromForm = useCallback(
    (params: CostParams) => {
      // Save as a temporary preset and switch to analyze
      try {
        const id = savePreset("임시 프리셋", params);
        setActivePreset(id);
        setView("analyze");
      } catch (err) {
        alert(err instanceof Error ? err.message : "프리셋 저장 실패");
      }
    },
    [savePreset, setActivePreset],
  );

  // ── Derived state ─────────────────────────────────────────────────────
  const displayParams = currentParams ?? activeParams;
  const displayResult = currentResult ?? baselineResult;

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-dvh flex-col bg-[hsl(var(--bg))]">
      {/* ── Top bar ── */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-[hsl(var(--border))] bg-[hsl(var(--bg)/0.85)] backdrop-blur-md px-4 py-3">
        {/* Back */}
        <Link
          href="/"
          className="p-2 rounded-xl text-[hsl(var(--muted))] hover:text-[hsl(var(--fg))] hover:bg-[hsl(var(--surface-200)/0.5)] transition-all"
          aria-label="홈으로"
        >
          <ArrowLeft size={18} />
        </Link>

        {/* Title */}
        <h1 className="text-base font-bold text-[hsl(var(--fg))] whitespace-nowrap">
          실무 분석
        </h1>

        {/* Preset selector */}
        <select
          value={activePresetId ?? ""}
          onChange={handlePresetChange}
          className="ml-2 flex-1 max-w-[220px] rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-100))] px-3 py-2 text-sm text-[hsl(var(--fg))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent)/0.5)] transition-all truncate"
        >
          {customPresets.length === 0 && (
            <option value="" disabled>
              프리셋 없음
            </option>
          )}
          {customPresets.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Manage button */}
        <button
          type="button"
          onClick={() => setView(view === "manage" ? "analyze" : "manage")}
          className={[
            "p-2 rounded-xl transition-all",
            view === "manage"
              ? "text-[hsl(var(--accent))] bg-[hsl(var(--accent)/0.12)]"
              : "text-[hsl(var(--muted))] hover:text-[hsl(var(--fg))] hover:bg-[hsl(var(--surface-200)/0.5)]",
          ].join(" ")}
          aria-label="프리셋 관리"
        >
          <Settings size={18} />
        </button>

        {/* Save scenario */}
        <Button
          variant="secondary"
          size="sm"
          onClick={handleOpenSaveModal}
          disabled={!currentParams}
        >
          <Save size={14} />
          <span className="hidden sm:inline">시나리오 저장</span>
        </Button>

        {/* Compare */}
        <Button
          variant="accent"
          size="sm"
          disabled={scenarios.length < 2}
          onClick={() => router.push("/compare")}
        >
          <BarChart3 size={14} />
          <span className="hidden sm:inline">비교</span>
          <span className="text-xs opacity-70">({scenarios.length})</span>
        </Button>
      </header>

      {/* ── Main content ── */}
      <main className="flex-1 p-4">
        {view === "analyze" && displayParams && displayResult && (
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(320px,420px)_1fr] gap-4 h-full">
            {/* Left: sliders */}
            <div className="lg:max-h-[calc(100dvh-80px)] lg:overflow-y-auto lg:pr-1">
              <AnalyzePanel
                initialParams={displayParams}
                onChange={handleParamChange}
              />
            </div>

            {/* Right: cost tree */}
            <div className="min-h-[500px] lg:min-h-0 lg:h-[calc(100dvh-80px)]">
              <CostTreeView
                result={displayResult}
                params={displayParams}
                changedPaths={changedPaths}
              />
            </div>
          </div>
        )}

        {view === "analyze" && !displayParams && (
          <div className="flex flex-col items-center justify-center h-[60vh] text-[hsl(var(--muted))]">
            <p className="text-sm mb-4">프리셋을 선택하거나 새 프리셋을 만들어 시작하세요.</p>
            <Button variant="accent" size="md" onClick={() => setView("new-preset")}>
              새 프리셋 만들기
            </Button>
          </div>
        )}

        {view === "new-preset" && (
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[hsl(var(--fg))]">새 프리셋</h2>
              <button
                type="button"
                onClick={() => setView("analyze")}
                className="p-2 rounded-xl text-[hsl(var(--muted))] hover:text-[hsl(var(--fg))] hover:bg-[hsl(var(--surface-200)/0.5)] transition-all"
              >
                <X size={18} />
              </button>
            </div>
            <PresetForm
              initialParams={activeParams ?? undefined}
              onSave={handlePresetSaveFromForm}
              onAnalyze={handleAnalyzeFromForm}
            />
          </div>
        )}

        {view === "manage" && (
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[hsl(var(--fg))]">프리셋 관리</h2>
              <button
                type="button"
                onClick={() => setView("analyze")}
                className="p-2 rounded-xl text-[hsl(var(--muted))] hover:text-[hsl(var(--fg))] hover:bg-[hsl(var(--surface-200)/0.5)] transition-all"
              >
                <X size={18} />
              </button>
            </div>
            <PresetManager
              presets={customPresets}
              onSelect={handlePresetSelect}
              onDelete={deletePreset}
              onNew={() => setView("new-preset")}
            />

            {/* Scenario list */}
            {scenarios.length > 0 && (
              <div className="mt-8">
                <h3 className="text-sm font-bold text-[hsl(var(--fg))] mb-3">
                  저장된 시나리오 ({scenarios.length}/5)
                </h3>
                <div className="flex flex-col gap-2">
                  {scenarios.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-100))] px-4 py-3"
                    >
                      <span className="text-sm text-[hsl(var(--fg))]">{s.name}</span>
                      <button
                        type="button"
                        onClick={() => deleteScenario(s.id)}
                        className="text-xs text-[hsl(var(--muted))] hover:text-red-400 transition-colors"
                      >
                        삭제
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Save scenario modal ── */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm mx-4 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-100))] shadow-elevated p-6">
            <h3 className="text-base font-bold text-[hsl(var(--fg))] mb-4">
              시나리오 저장
            </h3>
            <input
              ref={nameInputRef}
              type="text"
              placeholder="시나리오 이름 입력..."
              value={scenarioName}
              onChange={(e) => setScenarioName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveScenario();
                if (e.key === "Escape") setShowSaveModal(false);
              }}
              className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--bg))] px-3 py-2.5 text-sm text-[hsl(var(--fg))] placeholder:text-[hsl(var(--muted))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent)/0.5)] transition-all mb-4"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSaveModal(false)}
              >
                취소
              </Button>
              <Button
                variant="accent"
                size="sm"
                disabled={!scenarioName.trim()}
                onClick={handleSaveScenario}
              >
                저장
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
