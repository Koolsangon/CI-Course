"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MousePointerClick, Calculator, CheckCircle2, ArrowRight } from "lucide-react";
import Button from "@/components/ui/Button";

interface GuideStep {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const COMMON_STEPS: GuideStep[] = [
  {
    icon: <MousePointerClick className="h-8 w-8" />,
    title: "노란색 셀을 클릭하세요",
    description: "답을 입력할 노란색 셀을 클릭하면 하단에 계산기가 열립니다."
  },
  {
    icon: <Calculator className="h-8 w-8" />,
    title: "수식을 조합하세요",
    description: "테이블의 다른 셀을 클릭하여 값을 가져오거나, 숫자를 직접 입력하고, 연산 버튼(+, −, ×, ÷)으로 수식을 만드세요."
  },
  {
    icon: <CheckCircle2 className="h-8 w-8" />,
    title: "계산하기 → 채점하기",
    description: "수식이 완성되면 '계산하기'로 결과를 셀에 입력합니다. 모든 셀을 채운 후 '채점하기'로 정답을 확인하세요."
  }
];

const PROBLEM_HINTS: Record<string, { title: string; hint: string }> = {
  "p1-loading": {
    title: "Loading 변화 문제",
    hint: "핵심 수식: 가공비 항목 = 기준값 × (기준Loading ÷ 새Loading)\n예) Panel 노무비 = 21.30 × (0.70 ÷ 0.50)"
  },
  "p4-material-yield": {
    title: "재료비 vs 수율 문제",
    hint: "①열: Module BOM에 변화율 적용 → 소요재료비 재계산\n②열: Module 수율 변경 → 누적수율 변화 → 소요재료비 재계산"
  },
  "p5-cuts-mask": {
    title: "면취수 · Mask 문제",
    hint: "①열: BOM × (기준÷신규 면취수), Panel 가공비 × (기준÷신규 면취수)\n②열: ①에 Mask 비율(신규÷기준) 추가 적용 → Panel 가공비만 변동"
  },
  "p6-tact-investment": {
    title: "Tact 지연 vs 개조투자 문제",
    hint: "①열 (Tact 1.2배): Module 가공비(노무비·경비·감상비) × 1.2\n②열 (+ 투자 13억): Module 감상비 = 7.5 + 13억 ÷ 300K ÷ 1,480 (환율). 노무비·경비는 base 로 복귀"
  }
};

interface WorksheetGuideProps {
  problemId: string;
  onClose: () => void;
}

export default function WorksheetGuide({ problemId, onClose }: WorksheetGuideProps) {
  const [step, setStep] = useState(0);
  const meta = PROBLEM_HINTS[problemId];
  const totalSteps = COMMON_STEPS.length + 1; // +1 for problem-specific hint
  const isLastStep = step === totalSteps - 1;

  function next() {
    if (isLastStep) {
      onClose();
    } else {
      setStep((s) => s + 1);
    }
  }

  const currentStep = step === 0 && meta
    ? {
        icon: <Calculator className="h-8 w-8" />,
        title: meta.title,
        description: meta.hint
      }
    : COMMON_STEPS[step === 0 ? 0 : step - 1]!;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-[hsl(220_15%_14%)] shadow-2xl border border-white/10"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-xl text-white/40 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Step indicator */}
          <div className="flex gap-1.5 px-8 pt-8">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={[
                  "h-1 flex-1 rounded-full transition-colors duration-300",
                  i <= step ? "bg-red-500" : "bg-white/20"
                ].join(" ")}
              />
            ))}
          </div>

          {/* Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col items-center gap-5 px-8 py-8 text-center"
            >
              {/* Icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.1 }}
                className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/20 text-red-400"
              >
                {currentStep.icon}
              </motion.div>

              {/* Title */}
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="text-2xl font-extrabold text-white"
              >
                {currentStep.title}
              </motion.h2>

              {/* Description */}
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="max-w-sm text-sm leading-relaxed text-white/60 whitespace-pre-line"
              >
                {currentStep.description}
              </motion.p>
            </motion.div>
          </AnimatePresence>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-white/10 px-8 py-4">
            <button
              onClick={onClose}
              className="text-xs text-white/30 hover:text-white/60 transition-colors"
            >
              건너뛰기
            </button>
            <Button variant="accent" size="md" onClick={next} className="bg-red-600 hover:bg-red-500 border-0">
              {isLastStep ? (
                "시작하기"
              ) : (
                <span className="flex items-center gap-1.5">
                  다음 <ArrowRight className="h-3.5 w-3.5" />
                </span>
              )}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
