# 케이스 추가 가이드 (AC10)

> 강사가 새 학습 케이스를 추가할 때 참고. 두 가지 경로 중 하나를 선택.

## 경로 A — JSON만 추가 (기존 어댑터 재사용)

새 케이스가 아래 6개 어댑터 중 하나의 **변수 패턴**과 일치하면 JSON 한 개만 추가하면 됩니다.

| 어댑터 | 적합한 시나리오 예시 |
|---|---|
| `loading` | 가동률 변동 (생산량 변화) |
| `labor` | 인건비 인상/인하 |
| `marginal` | 한계이익률 목표 역산 |
| `material-yield` | BOM 절감 vs 수율 하락 |
| `cuts-mask` | 면취수 · Mask 복합 |
| `tact-investment` | Tact 변화 + 투자 |

### 절차
1. `content/cases/07-your-case.json` 복사 (기존 케이스 중 가장 유사한 것을 템플릿으로)
2. `id`, `title`, `scenario`, `reference` 교체
3. `variables` 슬라이더의 key는 반드시 해당 어댑터가 기대하는 이름과 일치해야 함:
   - `loading` → `new_loading`
   - `labor` → `labor_multiplier`
   - `marginal` → `target_rate`
   - `material-yield` → `material_change_pct`, `module_yield_change`
   - `cuts-mask` → `old_cuts`, `new_cuts`, `old_mask`, `new_mask`
   - `tact-investment` → `tact_multiplier`, `investment_depreciation_delta`
4. `phases.apply.answer_key`, `expected.*` 계산 및 기입
5. `coach` 필드 4개(hook/discover/apply/reflect) 작성 — `content/coach-tone.md` 규칙 준수
6. `lib/cases.ts`의 `CASES`, `CASE_ORDER`에 import + 배열 추가
7. `npm test` 로 회귀 검증 — 기존 27/27 계속 통과해야 함

## 경로 B — 새 변환 로직 (어댑터 추가)

기존 6개 패턴과 다른 계산이 필요하면 **≤20줄 TS 어댑터**를 추가합니다.

### 절차
1. `content/case-adapters/index.ts`의 패턴 모방:
   ```ts
   const yourAdapter: AdapterFn = (base, v) => {
     const next = cloneParams(base);
     // ≤20 lines of transform logic here
     return next;
   };
   ```
2. `ADAPTERS` 레지스트리에 등록: `ADAPTERS["your-id"] = yourAdapter;`
3. 필요하면 `lib/cost-engine/engine.ts`에 새 pure 변환 함수 추가 (경로 B의 경우만)
4. **골든 픽스처 확장**:
   - `scripts/gen-fixtures.py` 에 새 시나리오 블록 추가
   - `python3 scripts/gen-fixtures.py` 실행
   - `lib/cost-engine/engine.test.ts` 에 새 describe 블록 추가 (±0.001 tolerance)
5. Python oracle의 계산을 최소 한 번 수동 검증 후 픽스처 생성
6. `npm test` — 기존 + 신규 모두 통과해야 함
7. 경로 A와 동일하게 `content/cases/*.json` + `lib/cases.ts` 등록

## 품질 기준
- 새 케이스는 `templates/verification-checklists.md` 해당 항목 통과
- coach 카피는 `content/coach-tone.md` 금지 표현 포함 금지
- Apply 정답은 tolerance 포함 (너무 엄격하면 UX 손상)
- Reflect는 자유 응답 — 클라이언트 내부 저장만 (R9)

## 테스트
```bash
cd CI-Course/projects/cost-sim-v1
npm run gen:fixtures   # 경로 B일 때만
npm test
npm run build          # 번들 사이즈 영향 확인 (≤260KB)
```
