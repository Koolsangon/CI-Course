"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { TreePine, ArrowLeft, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, Maximize2, Minimize2 } from "lucide-react";
import Link from "next/link";
import CostTreeView from "@/components/CostTree/CostTreeView";
import ParamPanel from "@/components/ParamPanel/ParamPanel";
import FormulaInspector from "@/components/FormulaInspector/FormulaInspector";
import RoomBadge from "@/components/Room/RoomBadge";
import { useStore } from "@/lib/store";

export default function SandboxPage() {
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const result = useStore((s) => s.result);
  const params = useStore((s) => s.params);
  const lastDelta = useStore((s) => s.lastDelta);

  const focusMode = !leftOpen && !rightOpen;
  const toggleFocus = () => {
    const next = !focusMode;
    setLeftOpen(!next);
    setRightOpen(!next);
  };

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-[hsl(var(--bg))]">
      <header className="relative z-20 flex flex-shrink-0 items-center gap-3 border-b border-[hsl(var(--border))] bg-[hsl(var(--surface-100)/0.8)] px-4 py-3 backdrop-blur-md">
        <Link
          href="/"
          className="flex h-8 w-8 items-center justify-center rounded-xl text-[hsl(var(--muted))] transition-colors hover:bg-[hsl(var(--surface-200))] hover:text-[hsl(var(--fg))]"
          aria-label="홈으로"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>

        <div className="flex items-center gap-2">
          <TreePine className="h-4 w-4 text-[hsl(var(--accent))]" />
          <span className="text-sm font-bold text-[hsl(var(--fg))]">자유실험실</span>
        </div>

        <p className="hidden text-xs text-[hsl(var(--muted))] sm:block">
          슬라이더를 움직이면 트리의 영향 노드가 강조됩니다.
        </p>

        <div className="ml-auto flex items-center gap-2">
          <RoomBadge />
          <button
            onClick={() => setLeftOpen((o) => !o)}
            aria-label={leftOpen ? "파라미터 패널 접기" : "파라미터 패널 열기"}
            className="hidden h-9 w-9 items-center justify-center rounded-xl border border-[hsl(var(--border))] text-[hsl(var(--muted))] transition-colors hover:bg-[hsl(var(--surface-200))] hover:text-[hsl(var(--fg))] md:flex"
          >
            {leftOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
          </button>
          <button
            onClick={toggleFocus}
            aria-label={focusMode ? "분할 모드" : "포커스 모드"}
            className="hidden h-9 w-9 items-center justify-center rounded-xl border border-[hsl(var(--border))] text-[hsl(var(--muted))] transition-colors hover:bg-[hsl(var(--surface-200))] hover:text-[hsl(var(--accent))] md:flex"
          >
            {focusMode ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
          <button
            onClick={() => setRightOpen((o) => !o)}
            aria-label={rightOpen ? "인스펙터 패널 접기" : "인스펙터 패널 열기"}
            className="hidden h-9 w-9 items-center justify-center rounded-xl border border-[hsl(var(--border))] text-[hsl(var(--muted))] transition-colors hover:bg-[hsl(var(--surface-200))] hover:text-[hsl(var(--fg))] md:flex"
          >
            {rightOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
          </button>
        </div>
      </header>

      <div className="flex flex-1 gap-3 overflow-hidden p-3">
        <AnimatePresence initial={false}>
          {leftOpen && (
            <motion.div
              key="left"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 264, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="hidden flex-shrink-0 overflow-hidden md:block"
            >
              <div className="w-[264px] overflow-y-auto pb-4">
                <ParamPanel />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 overflow-hidden rounded-2xl border border-[hsl(var(--border))] shadow-card">
          <CostTreeView
            result={result}
            params={params}
            changedPaths={lastDelta}
          />
        </div>

        <AnimatePresence initial={false}>
          {rightOpen && (
            <motion.div
              key="right"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 256, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="hidden flex-shrink-0 overflow-hidden md:block"
            >
              <div className="w-[256px] overflow-y-auto">
                <FormulaInspector />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex border-t border-[hsl(var(--border))] bg-[hsl(var(--surface-100)/0.9)] pb-[env(safe-area-inset-bottom)] md:hidden">
        <details className="flex-1">
          <summary className="flex cursor-pointer items-center justify-center gap-1 py-3 text-xs font-semibold text-[hsl(var(--muted))] select-none">
            파라미터
          </summary>
          <div className="max-h-72 overflow-y-auto px-3 pb-3">
            <ParamPanel />
          </div>
        </details>
        <details className="flex-1 border-l border-[hsl(var(--border))]">
          <summary className="flex cursor-pointer items-center justify-center gap-1 py-3 text-xs font-semibold text-[hsl(var(--muted))] select-none">
            인스펙터
          </summary>
          <div className="max-h-72 overflow-y-auto px-3 pb-3">
            <FormulaInspector />
          </div>
        </details>
      </div>
    </main>
  );
}
