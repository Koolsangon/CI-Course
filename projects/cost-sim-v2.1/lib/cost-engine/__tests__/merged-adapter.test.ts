/**
 * Merged adapter 회귀 — applyMerged 가 단일 변수 변동 시 기존 어댑터와 *동일* 한지.
 * 27 sacred fixtures 는 별도 (engine.test.ts) — 본 테스트는 merged adapter 자체.
 */

import { describe, it, expect } from "vitest";
import {
  applyMerged,
  DEFAULT_DELTAS,
  REFERENCE_CUTS,
  REFERENCE_MASK,
  changedKeys,
  type SevenDeltas
} from "../merged-adapter";
import {
  applyLoadingChange,
  applyMaterialYieldChange,
  applyCutsMaskChange,
  applyTactInvestmentChange
} from "../engine";
import { REFERENCE_CASE1 } from "../presets";

function withDelta(partial: Partial<SevenDeltas>): SevenDeltas {
  return { ...DEFAULT_DELTAS, ...partial };
}

describe("applyMerged — 기본값 = passthrough", () => {
  it("DEFAULT_DELTAS 적용 시 reference 와 동일", () => {
    const result = applyMerged(REFERENCE_CASE1, DEFAULT_DELTAS);
    expect(result).toEqual(REFERENCE_CASE1);
  });
});

describe("applyMerged — 단일 변수 = 기존 어댑터 매칭", () => {
  it("loading 만 변동 → applyLoadingChange 와 동일", () => {
    const expected = applyLoadingChange(REFERENCE_CASE1, 0.5);
    const actual = applyMerged(REFERENCE_CASE1, withDelta({ loading: 0.5 }));
    expect(actual).toEqual(expected);
  });

  it("materialDelta + yieldDelta → applyMaterialYieldChange 와 동일", () => {
    const expected = applyMaterialYieldChange(REFERENCE_CASE1, -0.05, -0.04);
    const actual = applyMerged(REFERENCE_CASE1, withDelta({ materialDelta: -0.05, yieldDelta: -0.04 }));
    expect(actual).toEqual(expected);
  });

  it("newCuts 만 변동 → applyCutsMaskChange (Mask 동일) 와 동일", () => {
    const expected = applyCutsMaskChange(REFERENCE_CASE1, REFERENCE_CUTS, 29, REFERENCE_MASK, REFERENCE_MASK);
    const actual = applyMerged(REFERENCE_CASE1, withDelta({ newCuts: 29 }));
    expect(actual).toEqual(expected);
  });

  it("newCuts + newMask → applyCutsMaskChange 와 동일", () => {
    const expected = applyCutsMaskChange(REFERENCE_CASE1, REFERENCE_CUTS, 29, REFERENCE_MASK, 7);
    const actual = applyMerged(REFERENCE_CASE1, withDelta({ newCuts: 29, newMask: 7 }));
    expect(actual).toEqual(expected);
  });

  it("tactMult + investmentDelta → applyTactInvestmentChange 와 동일", () => {
    const expected = applyTactInvestmentChange(REFERENCE_CASE1, 1.2, 1.9);
    const actual = applyMerged(REFERENCE_CASE1, withDelta({ tactMult: 1.2, investmentDelta: 1.9 }));
    expect(actual).toEqual(expected);
  });
});

describe("applyMerged — 다변량 순서 검증", () => {
  it("Loading + 재료비/수율 변동: 순서 Loading → Material 적용", () => {
    let expected = applyLoadingChange(REFERENCE_CASE1, 0.5);
    expected = applyMaterialYieldChange(expected, -0.05, -0.04);
    const actual = applyMerged(REFERENCE_CASE1, withDelta({
      loading: 0.5,
      materialDelta: -0.05,
      yieldDelta: -0.04
    }));
    expect(actual).toEqual(expected);
  });

  it("7 변수 모두 변동: 순서 Loading→Material→Cuts→Tact 적용", () => {
    let expected = applyLoadingChange(REFERENCE_CASE1, 0.6);
    expected = applyMaterialYieldChange(expected, -0.05, -0.02);
    expected = applyCutsMaskChange(expected, REFERENCE_CUTS, 29, REFERENCE_MASK, 7);
    expected = applyTactInvestmentChange(expected, 1.2, 1.9);
    const actual = applyMerged(REFERENCE_CASE1, {
      loading: 0.6,
      materialDelta: -0.05,
      yieldDelta: -0.02,
      newCuts: 29,
      newMask: 7,
      tactMult: 1.2,
      investmentDelta: 1.9
    });
    expect(actual).toEqual(expected);
  });
});

describe("changedKeys", () => {
  it("DEFAULT_DELTAS → []", () => {
    expect(changedKeys(DEFAULT_DELTAS)).toEqual([]);
  });

  it("loading 변경 → ['loading']", () => {
    expect(changedKeys(withDelta({ loading: 0.5 }))).toEqual(["loading"]);
  });

  it("7 변수 모두 변경 → 모든 키", () => {
    const all: SevenDeltas = {
      loading: 0.5,
      materialDelta: -0.05,
      yieldDelta: -0.02,
      newCuts: 29,
      newMask: 7,
      tactMult: 1.2,
      investmentDelta: 1.9
    };
    expect(changedKeys(all)).toEqual([
      "loading", "materialDelta", "yieldDelta", "newCuts", "newMask", "tactMult", "investmentDelta"
    ]);
  });
});
