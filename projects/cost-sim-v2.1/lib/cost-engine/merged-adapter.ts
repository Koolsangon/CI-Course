/**
 * Merged adapter — 7변수 동시 적용 단일 진입점.
 *
 * 기존 5 어댑터 (applyLoadingChange / applyLaborChange / applyMaterialYieldChange /
 * applyCutsMaskChange / applyTactInvestmentChange) 는 *sacred* — 27 golden fixtures
 * 보호. 본 어댑터는 그 어댑터들을 *순서대로 호출* 만 한다 — 내부 수학은 손대지 않는다.
 *
 * 적용 순서 (plan.md S9):
 *   Loading → 재료비(BOM) → 수율 → 면취수 → Mask → Tact → 투자 상각비
 *
 * 면취수·Mask 기준값은 *reference 고정* (CONTEXT.md). 사용자가 움직이는 건 "새 값" 만.
 */

import type { CostParams } from "./types";
import {
  applyLoadingChange,
  applyMaterialYieldChange,
  applyCutsMaskChange,
  applyTactInvestmentChange
} from "./engine";
import { cloneParams } from "./presets";

/** 면취수 기준값 — sandbox 의 baseline reference 가 25 라는 가정. */
export const REFERENCE_CUTS = 25;
/** Mask 기준값 — sandbox 의 baseline reference 가 6 장이라는 가정. */
export const REFERENCE_MASK = 6;

export interface SevenDeltas {
  /** Loading율 (0.30 ~ 1.00). 기본 0.70 = 변동 없음 (REFERENCE_CASE1 의 loading). */
  loading: number;
  /** Module 재료비 변동률 (-0.20 ~ +0.20). 0 = 변동 없음. */
  materialDelta: number;
  /** Module 수율 변동률 (-0.10 ~ +0.05). 0 = 변동 없음. */
  yieldDelta: number;
  /** 새 면취수 (10 ~ 40). 25 = 변동 없음. */
  newCuts: number;
  /** 새 Mask (3 ~ 10). 6 = 변동 없음. */
  newMask: number;
  /** Tact 배수 (0.80 ~ 1.50). 1.00 = 변동 없음. */
  tactMult: number;
  /** 투자 상각비 증가분 ($0 ~ $5). 0 = 변동 없음. */
  investmentDelta: number;
}

export const DEFAULT_DELTAS: SevenDeltas = {
  loading: 0.70,
  materialDelta: 0,
  yieldDelta: 0,
  newCuts: REFERENCE_CUTS,
  newMask: REFERENCE_MASK,
  tactMult: 1.00,
  investmentDelta: 0
};

/**
 * 7 deltas 를 reference 위에 순차 적용하여 최종 CostParams 반환.
 *
 * 기본값과 동일한 변수는 해당 어댑터 호출을 *skip* — 불필요한 round-trip 방지.
 */
/** 가공비 6항목을 동일 배율로 스케일한 새 params 반환 (clone). */
function scaleProcessing(p: CostParams, ratio: number): CostParams {
  const next = cloneParams(p);
  next.processing.panel.labor *= ratio;
  next.processing.panel.expense *= ratio;
  next.processing.panel.depreciation *= ratio;
  next.processing.module.labor *= ratio;
  next.processing.module.expense *= ratio;
  next.processing.module.depreciation *= ratio;
  return next;
}

export function applyMerged(reference: CostParams, deltas: SevenDeltas): CostParams {
  let p = reference;

  if (deltas.loading !== reference.loading) {
    p = applyLoadingChange(p, deltas.loading);
  }

  if (deltas.materialDelta !== 0 || deltas.yieldDelta !== 0) {
    p = applyMaterialYieldChange(p, deltas.materialDelta, deltas.yieldDelta);
  }

  // v0.2 피드백: Module 수율 변동 시 가공비(고정비)도 단위당 분담이 변함 → 기준수율 ÷ 새수율 배율.
  // engine.ts 어댑터(27 골든 픽스처 보호)는 그대로 두고 sandbox 병합 경로에서만 결합한다.
  if (deltas.yieldDelta !== 0) {
    const baseYield = reference.yields.module;
    const newYield = baseYield + deltas.yieldDelta;
    if (newYield > 0) p = scaleProcessing(p, baseYield / newYield);
  }

  if (deltas.newCuts !== REFERENCE_CUTS || deltas.newMask !== REFERENCE_MASK) {
    p = applyCutsMaskChange(p, REFERENCE_CUTS, deltas.newCuts, REFERENCE_MASK, deltas.newMask);
    // Mask 증가분만큼 TFT BOM 재료비가 오른다 (1 Mask 증가 = TFT 재료비 +$0.1).
    // engine.ts 어댑터(27 골든 픽스처 보호)는 Mask 를 Panel 가공비에만 반영하므로,
    // 소요재료비·BOM 재료비 변동이 트리에 강조되도록 sandbox 병합 경로에서만 가산한다
    // (위 yieldDelta→가공비 결합과 동일 패턴). applyCutsMaskChange 가 새 bom 객체를
    // 반환하므로 직접 가산해도 reference 는 오염되지 않는다.
    const maskDelta = deltas.newMask - REFERENCE_MASK;
    if (maskDelta !== 0) {
      p.bom.tft += 0.1 * maskDelta;
    }
  }

  if (deltas.tactMult !== 1.0 || deltas.investmentDelta !== 0) {
    p = applyTactInvestmentChange(p, deltas.tactMult, deltas.investmentDelta);
  }

  return p;
}

/** 7 deltas 중 기본값과 *다른* 변수의 키 목록 — 인스펙터 / 변동 표지 용도. */
export function changedKeys(deltas: SevenDeltas): (keyof SevenDeltas)[] {
  const changed: (keyof SevenDeltas)[] = [];
  if (deltas.loading !== DEFAULT_DELTAS.loading) changed.push("loading");
  if (deltas.materialDelta !== DEFAULT_DELTAS.materialDelta) changed.push("materialDelta");
  if (deltas.yieldDelta !== DEFAULT_DELTAS.yieldDelta) changed.push("yieldDelta");
  if (deltas.newCuts !== DEFAULT_DELTAS.newCuts) changed.push("newCuts");
  if (deltas.newMask !== DEFAULT_DELTAS.newMask) changed.push("newMask");
  if (deltas.tactMult !== DEFAULT_DELTAS.tactMult) changed.push("tactMult");
  if (deltas.investmentDelta !== DEFAULT_DELTAS.investmentDelta) changed.push("investmentDelta");
  return changed;
}
