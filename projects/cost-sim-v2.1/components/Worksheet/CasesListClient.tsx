"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, ClipboardList } from "lucide-react";
import { CASE_ORDER, getCase } from "@/lib/cases";

const PROBLEM_META: Record<string, { tag: string }> = {
  "01-loading": { tag: "1열 · 6셀" },
  "04-material-yield": { tag: "2열 · 4셀" },
  "05-cuts-mask": { tag: "2열 · 9셀" },
  "06-tact-investment": { tag: "2열 · 4셀" }
};

export default function CasesListClient() {
  return (
    <main className="flex min-h-screen flex-col bg-[hsl(var(--bg))]">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-[hsl(var(--border))] bg-[hsl(var(--surface-100)/0.85)] px-4 py-3 backdrop-blur-md">
        <Link
          href="/"
          className="flex h-8 w-8 items-center justify-center rounded-xl text-[hsl(var(--muted))] transition-colors hover:bg-[hsl(var(--surface-200))] hover:text-[hsl(var(--fg))]"
          aria-label="홈으로"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <ClipboardList className="h-4 w-4 text-[hsl(var(--success))]" />
        <span className="text-sm font-bold text-[hsl(var(--fg))]">원가 계산 워크시트</span>
      </header>

      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-6"
        >
          <h1 className="text-2xl font-bold text-[hsl(var(--fg))]">문제 선택</h1>
          <p className="mt-1 text-sm text-[hsl(var(--muted))]">
            시뮬레이션에서 관찰한 원리를 엑셀 워크시트처럼 직접 계산하고 채점합니다.
          </p>
        </motion.div>

        <div className="flex flex-col gap-4">
          {CASE_ORDER.map((caseId, i) => {
            const caseDef = getCase(caseId);
            const meta = PROBLEM_META[caseId];
            if (!caseDef) return null;
            return (
              <motion.div
                key={caseId}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: i * 0.06 }}
              >
                <Link
                  href={`/cases/${caseId}`}
                  className="group flex items-center gap-4 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-100))] p-5 transition-all hover:-translate-y-0.5 hover:border-[hsl(var(--success)/0.5)] hover:shadow-elevated"
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))] font-bold text-sm">
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-[hsl(var(--fg))]">{caseDef.title}</span>
                      {meta && (
                        <span className="rounded-full bg-[hsl(var(--surface-200))] px-2 py-0.5 text-[10px] font-medium text-[hsl(var(--muted))]">
                          {meta.tag}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-[hsl(var(--muted))] line-clamp-1">{caseDef.scenario}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 flex-shrink-0 text-[hsl(var(--muted))] opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
