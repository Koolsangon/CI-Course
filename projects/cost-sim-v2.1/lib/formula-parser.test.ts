import { describe, it, expect } from "vitest";
import { parseFormula } from "./formula-parser";

describe("parseFormula — % 자동 변환", () => {
  it('"70%" → 0.7', () => {
    expect(parseFormula("70%")).toBe(0.7);
  });

  it('"100%" → 1', () => {
    expect(parseFormula("100%")).toBe(1);
  });

  it('"0%" → 0', () => {
    expect(parseFormula("0%")).toBe(0);
  });

  it('"21.3 * 70%" → 14.91', () => {
    expect(parseFormula("21.3 * 70%")).toBe(14.91);
  });

  it('"50% + 20%" → 0.7', () => {
    expect(parseFormula("50% + 20%")).toBe(0.7);
  });
});

describe("parseFormula — 사칙연산 + 괄호", () => {
  it('"5 + 3" → 8', () => {
    expect(parseFormula("5 + 3")).toBe(8);
  });

  it('"5 + 3 * 2" → 11 (우선순위)', () => {
    expect(parseFormula("5 + 3 * 2")).toBe(11);
  });

  it('"(5 + 3) * 2" → 16', () => {
    expect(parseFormula("(5 + 3) * 2")).toBe(16);
  });

  it('"10 / 4" → 2.5', () => {
    expect(parseFormula("10 / 4")).toBe(2.5);
  });

  it('"21.3 * (70 / 50)" → 29.82', () => {
    expect(parseFormula("21.3 * (70 / 50)")).toBe(29.82);
  });

  it('"-5 + 8" → 3 (unary minus)', () => {
    expect(parseFormula("-5 + 8")).toBe(3);
  });
});

describe("parseFormula — 공백 처리", () => {
  it('"  21.3  *  70%  " → 14.91 (잉여 공백)', () => {
    expect(parseFormula("  21.3  *  70%  ")).toBe(14.91);
  });

  it('"21.3*70%" → 14.91 (공백 없음)', () => {
    expect(parseFormula("21.3*70%")).toBe(14.91);
  });
});

describe("parseFormula — invalid inputs", () => {
  it('"" → null', () => {
    expect(parseFormula("")).toBe(null);
  });

  it('"   " → null', () => {
    expect(parseFormula("   ")).toBe(null);
  });

  it('"abc" → null', () => {
    expect(parseFormula("abc")).toBe(null);
  });

  it('"5 +" → null (미완 수식)', () => {
    expect(parseFormula("5 +")).toBe(null);
  });

  it('"(5 + 3" → null (괄호 미닫)', () => {
    expect(parseFormula("(5 + 3")).toBe(null);
  });

  it('"5 / 0" → null (Infinity 차단)', () => {
    expect(parseFormula("5 / 0")).toBe(null);
  });
});
