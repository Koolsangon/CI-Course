"use client";

import { useMemo } from "react";
import { Trash2, ArrowRight, PlusCircle } from "lucide-react";
import { calculate } from "@/lib/cost-engine/engine";
import type { CustomPreset } from "@/lib/work-store";

export interface PresetManagerProps {
  presets: CustomPreset[];
  onSelect: (preset: CustomPreset) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

interface PresetCardProps {
  preset: CustomPreset;
  onSelect: (preset: CustomPreset) => void;
  onDelete: (id: string) => void;
}

function PresetCard({ preset, onSelect, onDelete }: PresetCardProps) {
  const result = useMemo(() => calculate(preset.params), [preset.params]);

  return (
    <div className="group relative flex items-center justify-between rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-100))] shadow-card px-4 py-4 transition-all hover:border-[hsl(var(--accent)/0.4)] hover:shadow-elevated">
      {/* Content */}
      <div className="flex flex-col gap-1 min-w-0">
        <span className="text-sm font-semibold text-[hsl(var(--fg))] truncate">
          {preset.name}
        </span>
        <span className="text-xs text-[hsl(var(--muted))]">
          {formatDate(preset.createdAt)}
        </span>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-xs text-[hsl(var(--muted))]">
            Price{" "}
            <span className="font-mono font-semibold text-[hsl(var(--fg))]">
              {result.price.toFixed(2)}
            </span>
          </span>
          <span className="text-xs text-[hsl(var(--muted))]">
            영업이익{" "}
            <span
              className={`font-mono font-semibold ${
                result.operating_profit >= 0 ? "text-emerald-500" : "text-red-400"
              }`}
            >
              {result.operating_profit >= 0 ? "+" : ""}
              {result.operating_profit.toFixed(2)}
            </span>
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 ml-3 shrink-0">
        {/* Delete — hidden until hover */}
        <button
          type="button"
          aria-label={`${preset.name} 삭제`}
          onClick={() => onDelete(preset.id)}
          className="p-2 rounded-xl text-[hsl(var(--muted))] opacity-0 group-hover:opacity-100 hover:bg-red-400/10 hover:text-red-400 transition-all duration-150"
        >
          <Trash2 size={15} />
        </button>

        {/* Select */}
        <button
          type="button"
          aria-label={`${preset.name} 선택`}
          onClick={() => onSelect(preset)}
          className="p-2 rounded-xl text-[hsl(var(--muted))] hover:bg-[hsl(var(--accent)/0.12)] hover:text-[hsl(var(--accent))] transition-all duration-150"
        >
          <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
}

export default function PresetManager({
  presets,
  onSelect,
  onDelete,
  onNew,
}: PresetManagerProps) {
  return (
    <div className="flex flex-col gap-3">
      {presets.length === 0 && (
        <p className="text-sm text-[hsl(var(--muted))] text-center py-6">
          저장된 프리셋이 없습니다.
        </p>
      )}

      {presets.map((preset) => (
        <PresetCard
          key={preset.id}
          preset={preset}
          onSelect={onSelect}
          onDelete={onDelete}
        />
      ))}

      {/* New preset button */}
      <button
        type="button"
        onClick={onNew}
        className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[hsl(var(--border))] px-4 py-4 text-sm font-medium text-[hsl(var(--muted))] hover:border-[hsl(var(--accent)/0.5)] hover:text-[hsl(var(--accent))] hover:bg-[hsl(var(--accent)/0.05)] transition-all duration-150"
      >
        <PlusCircle size={16} />
        새 프리셋 만들기
      </button>
    </div>
  );
}
