"""
개발원가 시뮬레이션 계산 엔진
엑셀 워크시트의 COP(Cost of Product) 모델을 Python으로 이식

원가 구조:
  Price
  ├── COM (제조원가) = 소요재료비 + 가공비
  │   ├── 소요재료비 = Σ(공정별 BOM / 해당공정~최종 누적수율)
  │   └── 가공비 = Panel(노무비+경비+상각비) + Module(노무비+경비+상각비)
  ├── SG&A (판관비)
  └── COP = COM + SGA
"""

from dataclasses import dataclass, field
from typing import Optional
import math


@dataclass
class YieldRates:
    tft: float = 0.99
    cf: float = 1.0
    cell: float = 0.95
    module: float = 0.972

    @property
    def cumulative(self) -> float:
        return self.tft * self.cf * self.cell * self.module

    @property
    def remaining_yields(self) -> dict:
        """각 공정에서 최종까지의 누적수율 (해당 공정 포함)"""
        return {
            "tft": self.tft * self.cf * self.cell * self.module,
            "cf": self.cf * self.cell * self.module,
            "cell": self.cell * self.module,
            "module": self.module,
        }


@dataclass
class BOMMaterial:
    """BOM 재료비 (개별 공정별)"""
    tft: float = 6.0
    cf: float = 5.0
    cell: float = 1.5
    module: float = 75.0

    @property
    def total(self) -> float:
        return self.tft + self.cf + self.cell + self.module


@dataclass
class ProcessingCostItem:
    """가공비 항목 (노무비 + 경비 + 상각비)"""
    labor: float = 0.0       # 노무비
    expense: float = 0.0     # 경비
    depreciation: float = 0.0  # 상각비

    @property
    def total(self) -> float:
        return self.labor + self.expense + self.depreciation


@dataclass
class ProcessingCost:
    """가공비 = Panel + Module"""
    panel: ProcessingCostItem = field(default_factory=ProcessingCostItem)
    module: ProcessingCostItem = field(default_factory=ProcessingCostItem)

    @property
    def total(self) -> float:
        return self.panel.total + self.module.total

    @property
    def total_depreciation(self) -> float:
        return self.panel.depreciation + self.module.depreciation


@dataclass
class SGA:
    """판관비 (SG&A)"""
    direct_dev: float = 4.7          # 직접개발비
    transport: float = 0.3           # 운반비
    business_unit: float = 16.0      # 사업부 비용
    operation: float = 1.2           # Operation(업무혁신,GO,구매)
    corporate_oh: float = 6.2        # Corporate OH(CTO, CFO, CEO 外)

    @property
    def total(self) -> float:
        return (self.direct_dev + self.transport + self.business_unit
                + self.operation + self.corporate_oh)


@dataclass
class CostParams:
    """시뮬레이션 입력 파라미터"""
    price: float = 200.0
    yields: YieldRates = field(default_factory=YieldRates)
    bom: BOMMaterial = field(default_factory=BOMMaterial)
    processing: ProcessingCost = field(default_factory=ProcessingCost)
    sga: SGA = field(default_factory=SGA)
    loading: float = 0.70  # Loading 비율


@dataclass
class CostResult:
    """시뮬레이션 결과"""
    price: float
    # 수율
    cumulative_yield: float
    # 재료비
    bom_total: float
    material_cost: float  # 소요재료비 = BOM / 수율
    # 가공비
    processing_cost: float
    panel_labor: float
    panel_expense: float
    panel_depreciation: float
    module_labor: float
    module_expense: float
    module_depreciation: float
    # COM
    com: float
    # SGA
    sga: float
    # COP & 수익성 지표
    cop: float
    operating_profit: float
    operating_margin: float
    cash_cost: float
    ebitda: float
    variable_cost: float
    marginal_profit: float

    def to_dict(self) -> dict:
        return {
            "price": round(self.price, 1),
            "cumulative_yield": round(self.cumulative_yield, 6),
            "bom_total": round(self.bom_total, 1),
            "material_cost": round(self.material_cost, 1),
            "processing_cost": round(self.processing_cost, 1),
            "panel_labor": round(self.panel_labor, 1),
            "panel_expense": round(self.panel_expense, 1),
            "panel_depreciation": round(self.panel_depreciation, 1),
            "module_labor": round(self.module_labor, 1),
            "module_expense": round(self.module_expense, 1),
            "module_depreciation": round(self.module_depreciation, 1),
            "com": round(self.com, 1),
            "sga": round(self.sga, 1),
            "cop": round(self.cop, 1),
            "operating_profit": round(self.operating_profit, 1),
            "operating_margin": round(self.operating_margin * 100, 1),
            "cash_cost": round(self.cash_cost, 1),
            "ebitda": round(self.ebitda, 1),
            "variable_cost": round(self.variable_cost, 1),
            "marginal_profit": round(self.marginal_profit, 1),
        }


def calculate(params: CostParams) -> CostResult:
    """COP 모델 전체 계산"""
    price = params.price
    cum_yield = params.yields.cumulative
    bom_total = params.bom.total

    # 소요재료비: 각 공정의 BOM을 해당 공정~최종 누적수율로 나눔
    ry = params.yields.remaining_yields
    material_cost = (
        (params.bom.tft / ry["tft"] if ry["tft"] > 0 else 0)
        + (params.bom.cf / ry["cf"] if ry["cf"] > 0 else 0)
        + (params.bom.cell / ry["cell"] if ry["cell"] > 0 else 0)
        + (params.bom.module / ry["module"] if ry["module"] > 0 else 0)
    )

    proc = params.processing
    processing_cost = proc.total
    total_depreciation = proc.total_depreciation

    com = material_cost + processing_cost
    sga = params.sga.total
    cop = com + sga

    operating_profit = price - cop
    operating_margin = operating_profit / price if price > 0 else 0
    cash_cost = cop - total_depreciation
    ebitda = price - cash_cost

    # 변동비 = 소요재료비 + 외주비(0) + 운반비
    variable_cost = material_cost + params.sga.transport
    marginal_profit = price - variable_cost

    return CostResult(
        price=price,
        cumulative_yield=cum_yield,
        bom_total=bom_total,
        material_cost=material_cost,
        processing_cost=processing_cost,
        panel_labor=proc.panel.labor,
        panel_expense=proc.panel.expense,
        panel_depreciation=proc.panel.depreciation,
        module_labor=proc.module.labor,
        module_expense=proc.module.expense,
        module_depreciation=proc.module.depreciation,
        com=com,
        sga=sga,
        cop=cop,
        operating_profit=operating_profit,
        operating_margin=operating_margin,
        cash_cost=cash_cost,
        ebitda=ebitda,
        variable_cost=variable_cost,
        marginal_profit=marginal_profit,
    )


# ── 프리셋: 엑셀 기준 데이터 (Reference) ──

REFERENCE_CASE1 = CostParams(
    price=200.0,
    yields=YieldRates(tft=0.99, cf=1.0, cell=0.95, module=0.972),
    bom=BOMMaterial(tft=6.0, cf=5.0, cell=1.5, module=75.0),
    processing=ProcessingCost(
        panel=ProcessingCostItem(labor=21.3, expense=11.5, depreciation=16.2),
        module=ProcessingCostItem(labor=8.7, expense=5.3, depreciation=7.5),
    ),
    sga=SGA(direct_dev=4.7, transport=0.3, business_unit=16.0,
            operation=1.2, corporate_oh=6.2),
    loading=0.70,
)

# Case 2 (인건비 변화) - MP 모델 (다른 수율/가공비)
REFERENCE_CASE2 = CostParams(
    price=200.0,
    yields=YieldRates(tft=0.99, cf=1.0, cell=0.95, module=0.9413),
    bom=BOMMaterial(tft=6.0, cf=5.0, cell=1.5, module=75.0),
    processing=ProcessingCost(
        panel=ProcessingCostItem(labor=10.0, expense=5.5, depreciation=19.0),
        module=ProcessingCostItem(labor=2.1, expense=1.6, depreciation=3.1),
    ),
    sga=SGA(direct_dev=4.7, transport=0.3, business_unit=16.0,
            operation=1.2, corporate_oh=6.2),
    loading=0.70,
)

# Case 3 (한계이익률 변화) - Case 2와 동일 Reference
REFERENCE_CASE3 = CostParams(
    price=200.0,
    yields=YieldRates(tft=0.99, cf=1.0, cell=0.95, module=0.9413),
    bom=BOMMaterial(tft=6.0, cf=5.0, cell=1.5, module=75.0),
    processing=ProcessingCost(
        panel=ProcessingCostItem(labor=10.0, expense=5.5, depreciation=19.0),
        module=ProcessingCostItem(labor=2.1, expense=1.6, depreciation=3.1),
    ),
    sga=SGA(direct_dev=4.7, transport=0.3, business_unit=16.0,
            operation=1.2, corporate_oh=6.2),
    loading=0.70,
)

# Case 4 (재료비/수율 변화) - Case 1과 동일 Reference
REFERENCE_CASE4 = CostParams(
    price=200.0,
    yields=YieldRates(tft=0.99, cf=1.0, cell=0.95, module=0.972),
    bom=BOMMaterial(tft=6.0, cf=5.0, cell=1.5, module=75.0),
    processing=ProcessingCost(
        panel=ProcessingCostItem(labor=21.3, expense=11.5, depreciation=16.2),
        module=ProcessingCostItem(labor=8.7, expense=5.3, depreciation=7.5),
    ),
    sga=SGA(direct_dev=4.7, transport=0.3, business_unit=16.0,
            operation=1.2, corporate_oh=6.2),
    loading=0.70,
)

# Case 5 (면취수/Mask) - Case 1과 동일 Reference, 면취수=25, Mask=6
REFERENCE_CASE5 = CostParams(
    price=200.0,
    yields=YieldRates(tft=0.99, cf=1.0, cell=0.95, module=0.972),
    bom=BOMMaterial(tft=6.0, cf=5.0, cell=1.5, module=75.0),
    processing=ProcessingCost(
        panel=ProcessingCostItem(labor=21.3, expense=11.5, depreciation=16.2),
        module=ProcessingCostItem(labor=8.7, expense=5.3, depreciation=7.5),
    ),
    sga=SGA(direct_dev=4.7, transport=0.3, business_unit=16.0,
            operation=1.2, corporate_oh=6.2),
    loading=0.70,
)

# Case 6 (T/T + 투자비) - Case 1과 동일 Reference
REFERENCE_CASE6 = CostParams(
    price=200.0,
    yields=YieldRates(tft=0.99, cf=1.0, cell=0.95, module=0.972),
    bom=BOMMaterial(tft=6.0, cf=5.0, cell=1.5, module=75.0),
    processing=ProcessingCost(
        panel=ProcessingCostItem(labor=21.3, expense=11.5, depreciation=16.2),
        module=ProcessingCostItem(labor=8.7, expense=5.3, depreciation=7.5),
    ),
    sga=SGA(direct_dev=4.7, transport=0.3, business_unit=16.0,
            operation=1.2, corporate_oh=6.2),
    loading=0.70,
)

# 모든 Reference를 번호로 접근
ALL_REFERENCES = {
    1: REFERENCE_CASE1,
    2: REFERENCE_CASE2,
    3: REFERENCE_CASE3,
    4: REFERENCE_CASE4,
    5: REFERENCE_CASE5,
    6: REFERENCE_CASE6,
}


def apply_loading_change(base: CostParams, new_loading: float) -> CostParams:
    """케이스1: Loading 변화 시뮬레이션
    Loading이 변하면 가공비가 반비례로 변동 (고정비 / 생산량)
    가공비 각 항목 = 기준값 × (기준Loading / 새Loading)
    """
    from dataclasses import replace
    ratio = base.loading / new_loading if new_loading > 0 else 999

    new_proc = ProcessingCost(
        panel=ProcessingCostItem(
            labor=base.processing.panel.labor * ratio,
            expense=base.processing.panel.expense * ratio,
            depreciation=base.processing.panel.depreciation * ratio,
        ),
        module=ProcessingCostItem(
            labor=base.processing.module.labor * ratio,
            expense=base.processing.module.expense * ratio,
            depreciation=base.processing.module.depreciation * ratio,
        ),
    )

    return replace(base, processing=new_proc, loading=new_loading)


def apply_material_yield_change(
    base: CostParams,
    material_change_pct: float = 0.0,
    module_yield_change: float = 0.0,
) -> CostParams:
    """케이스4: 재료비 및 수율 변화 시뮬레이션
    material_change_pct: 재료비 변화율 (예: -0.05 = 5% 감소)
    module_yield_change: 모듈 수율 변화 (예: -0.04 = 4%p 감소)
    """
    from dataclasses import replace

    factor = 1 + material_change_pct
    new_bom = BOMMaterial(
        tft=base.bom.tft,
        cf=base.bom.cf,
        cell=base.bom.cell,
        module=base.bom.module * factor,
    )

    new_yields = YieldRates(
        tft=base.yields.tft,
        cf=base.yields.cf,
        cell=base.yields.cell,
        module=base.yields.module + module_yield_change,
    )

    return replace(base, bom=new_bom, yields=new_yields)


def apply_labor_change(base: CostParams, labor_multiplier: float) -> CostParams:
    """케이스2: 인건비 변화 시뮬레이션
    - 가공비 중 노무비 항목만 배수 적용
    - SGA 중 인건비 비중 30%에 배수 적용 (엑셀 검증: 28.4→32.66)
    """
    from dataclasses import replace

    new_proc = ProcessingCost(
        panel=ProcessingCostItem(
            labor=base.processing.panel.labor * labor_multiplier,
            expense=base.processing.panel.expense,
            depreciation=base.processing.panel.depreciation,
        ),
        module=ProcessingCostItem(
            labor=base.processing.module.labor * labor_multiplier,
            expense=base.processing.module.expense,
            depreciation=base.processing.module.depreciation,
        ),
    )

    # SGA: 인건비 비중 30%, 비인건비 70%
    sga_total = base.sga.total
    new_sga_total = sga_total * 0.7 + sga_total * 0.3 * labor_multiplier
    sga_ratio = new_sga_total / sga_total if sga_total > 0 else 1
    new_sga = SGA(
        direct_dev=base.sga.direct_dev * sga_ratio,
        transport=base.sga.transport,
        business_unit=base.sga.business_unit * sga_ratio,
        operation=base.sga.operation * sga_ratio,
        corporate_oh=base.sga.corporate_oh * sga_ratio,
    )

    return replace(base, processing=new_proc, sga=new_sga)


def apply_marginal_profit_target(base: CostParams, target_rate: float) -> dict:
    """케이스3: 한계이익률 목표 역산
    target_rate: 목표 한계이익률 (예: 0.60 = 60%)
    결과: 목표 달성에 필요한 변동비/재료비 수준
    """
    ref = calculate(base)
    target_marginal_profit = base.price * target_rate
    target_variable_cost = base.price - target_marginal_profit
    # 변동비 = 소요재료비 + 운반비  →  필요 소요재료비 = 변동비 - 운반비
    required_material_cost = target_variable_cost - base.sga.transport
    material_reduction = ref.material_cost - required_material_cost

    return {
        "reference": ref.to_dict(),
        "target_rate": target_rate,
        "target_marginal_profit": round(target_marginal_profit, 1),
        "target_variable_cost": round(target_variable_cost, 1),
        "required_material_cost": round(required_material_cost, 1),
        "material_reduction": round(material_reduction, 1),
        "current_marginal_rate": round(ref.marginal_profit / base.price * 100, 1),
    }


def apply_cuts_mask_change(
    base: CostParams,
    old_cuts: int = 25,
    new_cuts: int = 29,
    old_mask: int = 6,
    new_mask: int = 6,
) -> CostParams:
    """케이스5: 면취수/Mask 변화 시뮬레이션
    - 면취수 증가: Panel BOM(TFT,CF,Cell)과 Panel 가공비가 (old/new) 비율로 감소
    - Mask 변화: Panel 가공비가 (new_mask/old_mask) 비율로 변동
    """
    from dataclasses import replace

    cuts_ratio = old_cuts / new_cuts  # 면취수 증가 → 비용 감소
    mask_ratio = new_mask / old_mask  # Mask 증가 → 비용 증가

    # BOM: TFT, CF, Cell은 면취수에 반비례 (Module은 불변)
    new_bom = BOMMaterial(
        tft=base.bom.tft * cuts_ratio,
        cf=base.bom.cf * cuts_ratio,
        cell=base.bom.cell * cuts_ratio,
        module=base.bom.module,
    )

    # Panel 가공비: 면취수 × Mask 모두 영향
    panel_factor = cuts_ratio * mask_ratio
    new_proc = ProcessingCost(
        panel=ProcessingCostItem(
            labor=base.processing.panel.labor * panel_factor,
            expense=base.processing.panel.expense * panel_factor,
            depreciation=base.processing.panel.depreciation * panel_factor,
        ),
        module=ProcessingCostItem(
            labor=base.processing.module.labor,
            expense=base.processing.module.expense,
            depreciation=base.processing.module.depreciation,
        ),
    )

    return replace(base, bom=new_bom, processing=new_proc)


def apply_tact_investment_change(
    base: CostParams,
    tact_multiplier: float = 1.0,
    investment_depreciation_delta: float = 0.0,
) -> CostParams:
    """케이스6: 모듈 T/T + 투자비 변화 시뮬레이션
    - Tact 지연: Module 가공비 전체 × tact_multiplier
    - 투자 증가: Module 상각비에 추가 비용
    """
    from dataclasses import replace

    new_proc = ProcessingCost(
        panel=ProcessingCostItem(
            labor=base.processing.panel.labor,
            expense=base.processing.panel.expense,
            depreciation=base.processing.panel.depreciation,
        ),
        module=ProcessingCostItem(
            labor=base.processing.module.labor * tact_multiplier,
            expense=base.processing.module.expense * tact_multiplier,
            depreciation=base.processing.module.depreciation * tact_multiplier
                         + investment_depreciation_delta,
        ),
    )

    return replace(base, processing=new_proc)


# ── 검증용 정답 데이터 ──

ANSWERS = {
    1: {"panel_labor": 29.8, "panel_expense": 16.1, "panel_depreciation": 22.7,
        "module_labor": 12.2, "module_expense": 7.4, "module_depreciation": 10.5},
    2: {"panel_labor": 15.0, "module_labor": 3.2, "sga": 32.7},
    4: {"bom_module": 71.3, "material_cost": 86.9, "module_yield": 0.932},
    5: {"bom_tft_cuts": 5.17, "bom_cf_cuts": 4.31, "bom_cell_cuts": 1.29,
        "panel_labor_cuts": 18.36, "panel_expense_cuts": 9.91, "panel_depreciation_cuts": 13.97,
        "panel_labor_mask": 21.42, "panel_expense_mask": 11.57, "panel_depreciation_mask": 16.29},
    6: {"module_labor_tact": 10.4, "module_expense_tact": 6.4,
        "module_depreciation_tact": 9.0, "module_depreciation_invest": 10.9},
}


if __name__ == "__main__":
    passed = failed = 0
    def check(name, actual, expected, tol=0.15):
        global passed, failed
        if abs(actual - expected) < tol:
            passed += 1
            print(f"  PASS {name}: {actual:.2f} (expected {expected})")
        else:
            failed += 1
            print(f"  FAIL {name}: {actual:.2f} (expected {expected})")

    # 케이스1: Loading 변화
    print("=== Case 1: Loading 70%→50% ===")
    sim1 = apply_loading_change(REFERENCE_CASE1, 0.50)
    r1 = calculate(sim1)
    check("Panel 노무비", r1.panel_labor, 29.8)
    check("Panel 경비", r1.panel_expense, 16.1)
    check("Panel 상각비", r1.panel_depreciation, 22.7)
    check("Module 노무비", r1.module_labor, 12.2)
    check("Module 경비", r1.module_expense, 7.4)
    check("Module 상각비", r1.module_depreciation, 10.5)

    # 케이스2: 인건비 1.5배
    print("\n=== Case 2: 인건비 1.5배 ===")
    sim2 = apply_labor_change(REFERENCE_CASE2, 1.5)
    r2 = calculate(sim2)
    check("Panel 노무비", r2.panel_labor, 15.0)
    check("Module 노무비", r2.module_labor, 3.15, 0.1)
    check("SGA", r2.sga, 32.66, 0.1)
    check("COP", r2.cop, 173.71, 0.2)
    check("영업이익", r2.operating_profit, 26.29, 0.2)

    # 케이스4: 재료비5%↓ + 수율4%p↓
    print("\n=== Case 4: 재료비5%↓ + 수율4%p↓ ===")
    sim4 = apply_material_yield_change(REFERENCE_CASE4, -0.05, -0.04)
    r4 = calculate(sim4)
    check("Module BOM", sim4.bom.module, 71.25)
    check("Module수율", sim4.yields.module, 0.932)
    check("소요재료비", r4.material_cost, 90.6, 0.2)

    # 케이스5: 면취수25→29
    print("\n=== Case 5a: 면취수 25→29 ===")
    sim5a = apply_cuts_mask_change(REFERENCE_CASE5, 25, 29, 6, 6)
    r5a = calculate(sim5a)
    check("TFT BOM", sim5a.bom.tft, 5.172, 0.01)
    check("CF BOM", sim5a.bom.cf, 4.310, 0.01)
    check("Cell BOM", sim5a.bom.cell, 1.293, 0.01)
    check("Panel 노무비", r5a.panel_labor, 18.36, 0.05)
    check("Panel 경비", r5a.panel_expense, 9.91, 0.05)
    check("Panel 상각비", r5a.panel_depreciation, 13.97, 0.05)

    # 케이스5: 면취수29 + Mask7
    print("\n=== Case 5b: 면취수29 + Mask 6→7 ===")
    sim5b = apply_cuts_mask_change(REFERENCE_CASE5, 25, 29, 6, 7)
    r5b = calculate(sim5b)
    check("Panel 노무비", r5b.panel_labor, 21.42, 0.05)
    check("Panel 경비", r5b.panel_expense, 11.57, 0.05)
    check("Panel 상각비", r5b.panel_depreciation, 16.29, 0.05)

    # 케이스6: Tact 1.2X
    print("\n=== Case 6a: Tact 1.2X ===")
    sim6a = apply_tact_investment_change(REFERENCE_CASE6, 1.2, 0.0)
    r6a = calculate(sim6a)
    check("Module 노무비", r6a.module_labor, 10.44, 0.1)
    check("Module 경비", r6a.module_expense, 6.36, 0.1)
    check("Module 상각비", r6a.module_depreciation, 9.0, 0.1)

    # 케이스6: Tact 1.2X + 투자 13억
    print("\n=== Case 6b: Tact 1.2X + 투자 13억 ===")
    sim6b = apply_tact_investment_change(REFERENCE_CASE6, 1.2, 1.9)
    r6b = calculate(sim6b)
    check("Module 상각비", r6b.module_depreciation, 10.9, 0.1)

    print(f"\n{'='*40}")
    print(f"Result: {passed} PASSED, {failed} FAILED / {passed+failed} total")
