# 개발원가(COP) 도메인 용어집

> 이 프로젝트의 모든 원가 관련 작업에서 참조하는 핵심 용어 정의.
> 예시 값은 Reference(기준) 데이터 기준.

## 원가 구조

| 용어 | 영문 | 정의 | 예시 값 |
|------|------|------|---------|
| Price | Price | 제품 판매가격 | $200 |
| COP | Cost of Product | 제조원가 = COM + SGA | $189.7 |
| COM | Cost of Manufacturing | 제조원가 = 소요재료비 + 가공비 | $161.3 |
| 소요재료비 | Material Cost | 각 공정 BOM을 해당 공정~최종 누적수율로 나눈 합계 | $90.8 |
| 가공비 | Processing Cost | Panel 가공비 + Module 가공비 | $70.5 |
| SGA | Selling, General & Administrative | 판관비 (직접개발비 + 운반비 + 사업부 + Operation + Corporate OH) | $28.4 |
| 영업이익 | Operating Profit | Price - COP | $10.3 |
| Cash Cost | Cash Cost | COP - 상각비 합계 | $166.0 |
| EBITDA | EBITDA | Price - Cash Cost | $34.0 |
| 변동비 | Variable Cost | 소요재료비 + 변동 가공비 항목 | $91.1 |
| 한계이익 | Marginal Profit | Price - 변동비 | $108.9 |
| 한계이익률 | Marginal Profit Rate | 한계이익 / Price | 54.5% |

## 공정 파라미터

| 용어 | 영문 | 정의 | 영향 범위 |
|------|------|------|-----------|
| BOM | Bill of Materials | 공정별 부품 단가 (TFT $6, CF $5, Cell $1.5, Module $75) | 소요재료비 직접 영향 |
| 수율 | Yield | 공정별 양품률 (TFT 99%, CF 100%, Cell 95%, Module 97.2%) | 소요재료비 역수 관계 |
| 누적수율 | Cumulative Yield | 해당 공정부터 최종 공정까지의 수율 곱 (전체 91.4%) | 소요재료비 분모 |
| Loading | Loading (가동률) | 설비 가동률. 기준 70% | 가공비 반비례 (고정비/생산량) |
| 면취수 | Cuts per Sheet | 원판 1장에서 자를 수 있는 패널 수. 기준 25개 | BOM(TFT/CF/Cell) + Panel 가공비 반비례 |
| Mask | Mask Count | 포토 공정 마스크 수. 기준 6장 | Panel 가공비 비례 |
| Tact | Tact Time | 공정 1사이클 소요 시간 배수 | Module 가공비 비례 |
| 노무비 | Labor Cost | 인건비. Panel $21.3, Module $8.7 | 가공비 구성요소 |
| 경비 | Overhead | 간접비. Panel $11.5, Module $5.3 | 가공비 구성요소 |
| 상각비 | Depreciation | 설비 감가상각. Panel $16.2, Module $7.5 | 가공비 구성요소, Cash Cost 제외 항목 |

## 핵심 계산 공식

```
소요재료비 = TFT_BOM/(TFT~Module 누적수율)
           + CF_BOM/(CF~Module 누적수율)
           + Cell_BOM/(Cell~Module 누적수율)
           + Module_BOM/Module수율

가공비 = 기준가공비 × (기준Loading / 실제Loading)  [Loading 변화 시]
Panel 가공비 = 기준값 × (기준면취수 / 새면취수)     [면취수 변화 시]
Panel 가공비 = 기준값 × (새Mask / 기준Mask)        [Mask 변화 시]
```

## 시뮬레이션 6개 케이스 요약

| Case | 시나리오 | 핵심 변수 | 핵심 효과 |
|------|----------|-----------|-----------|
| 1 | Loading 70%→50% | 가동률 하락 | 가공비 ×1.4 → 적자 전환 |
| 2 | 인건비 1.5배 | 노무비 + SGA 인건비 비중(30%) | 영업이익 $36.6→$26.3 |
| 3 | 한계이익률 53%→60% | 목표율에서 역산 | 변동비 $80 필요 (재료비 절감) |
| 4 | 재료비 5%↓ + 수율 4%p↓ | BOM 절감 vs 수율 하락 | 절감 효과 상쇄 ($90.8→$90.6) |
| 5 | 면취수 25→29, Mask 6→7 | 면취수/Mask 복합 | BOM↓ + 가공비↓ 후 Mask로 일부 상쇄 |
| 6 | Tact 1.2X + 투자 13억 | T/T 지연 + 설비 투자 | Module 가공비 증가 + 상각비 추가 |
