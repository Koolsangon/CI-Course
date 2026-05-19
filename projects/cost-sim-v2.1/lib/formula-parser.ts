/**
 * Formula parser — 자유 텍스트 수식 평가.
 *
 *   - `%` 토큰을 `÷ 100` 으로 자동 변환: "70%" → 0.7, "21.3 * 70%" → 14.91
 *   - 사칙연산 + 괄호 우선순위
 *   - 공백 허용
 *   - 빈 문자열 또는 파싱 실패 → null
 */

const TOKEN_RE = /(\d+\.?\d*%?|[+\-*/()])/g;

type Token =
  | { type: "number"; value: number }
  | { type: "op"; value: "+" | "-" | "*" | "/" }
  | { type: "paren"; value: "(" | ")" };

function tokenize(input: string): Token[] | null {
  const matches = input.match(TOKEN_RE);
  if (!matches) return null;
  const tokens: Token[] = [];
  for (const raw of matches) {
    if (raw === "+" || raw === "-" || raw === "*" || raw === "/") {
      tokens.push({ type: "op", value: raw });
    } else if (raw === "(" || raw === ")") {
      tokens.push({ type: "paren", value: raw });
    } else {
      const isPercent = raw.endsWith("%");
      const numStr = isPercent ? raw.slice(0, -1) : raw;
      const n = parseFloat(numStr);
      if (!isFinite(n)) return null;
      tokens.push({ type: "number", value: isPercent ? n / 100 : n });
    }
  }
  return tokens;
}

interface ParseState {
  tokens: Token[];
  pos: number;
}

function parseExpression(state: ParseState): number {
  let left = parseTerm(state);
  while (state.pos < state.tokens.length) {
    const t = state.tokens[state.pos];
    if (t.type !== "op" || (t.value !== "+" && t.value !== "-")) break;
    state.pos++;
    const right = parseTerm(state);
    left = t.value === "+" ? left + right : left - right;
  }
  return left;
}

function parseTerm(state: ParseState): number {
  let left = parseFactor(state);
  while (state.pos < state.tokens.length) {
    const t = state.tokens[state.pos];
    if (t.type !== "op" || (t.value !== "*" && t.value !== "/")) break;
    state.pos++;
    const right = parseFactor(state);
    left = t.value === "*" ? left * right : left / right;
  }
  return left;
}

function parseFactor(state: ParseState): number {
  const t = state.tokens[state.pos];
  if (!t) throw new Error("unexpected end");
  if (t.type === "paren" && t.value === "(") {
    state.pos++;
    const inner = parseExpression(state);
    const close = state.tokens[state.pos];
    if (!close || close.type !== "paren" || close.value !== ")") {
      throw new Error("unmatched (");
    }
    state.pos++;
    return inner;
  }
  if (t.type === "op" && (t.value === "-" || t.value === "+")) {
    // unary +/-
    state.pos++;
    const v = parseFactor(state);
    return t.value === "-" ? -v : v;
  }
  if (t.type === "number") {
    state.pos++;
    return t.value;
  }
  throw new Error(`unexpected token ${JSON.stringify(t)}`);
}

/**
 * 자유 텍스트 수식을 평가하여 단일 숫자로 반환.
 * `%` 는 자동으로 `÷ 100` 으로 변환된다.
 * 평가 실패 (빈 입력, 잘못된 문법, 0 으로 나눔 등) 시 `null`.
 *
 * 결과는 소수점 2자리로 반올림된다 (cost-engine 의 round 정책과 정합).
 */
export function parseFormula(input: string): number | null {
  if (!input || !input.trim()) return null;
  const tokens = tokenize(input.replace(/\s+/g, ""));
  if (!tokens || tokens.length === 0) return null;
  try {
    const state: ParseState = { tokens, pos: 0 };
    const result = parseExpression(state);
    if (state.pos !== tokens.length) return null;
    if (!isFinite(result)) return null;
    return Math.round(result * 100) / 100;
  } catch {
    return null;
  }
}
