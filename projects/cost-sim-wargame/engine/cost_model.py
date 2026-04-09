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
    """케이스2: 인건비 변화 시뮬레이션"""
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

    # 판관비 중 인건비 관련 항목도 변화
    labor_sga_items = base.sga.direct_dev + base.sga.operation + base.sga.corporate_oh
    new_labor_sga = labor_sga_items * labor_multiplier
    sga_delta = new_labor_sga - labor_sga_items
    new_sga = SGA(
        direct_dev=base.sga.direct_dev * labor_multiplier,
        transport=base.sga.transport,
        business_unit=base.sga.business_unit,
        operation=base.sga.operation * labor_multiplier,
        corporate_oh=base.sga.corporate_oh * labor_multiplier,
    )

    return replace(base, processing=new_proc, sga=new_sga)


if __name__ == "__main__":
    # 검증: 엑셀 Reference 값과 비교
    print("=== 케이스1 Reference (Loading 70%) ===")
    ref1 = calculate(REFERENCE_CASE1)
    print(f"  COM: {ref1.com:.1f} (expected: 161.3)")
    print(f"  소요재료비: {ref1.material_cost:.1f} (expected: 90.8)")
    print(f"  가공비: {ref1.processing_cost:.1f} (expected: 70.5)")
    print(f"  COP: {ref1.cop:.1f} (expected: 189.7)")
    print(f"  영업이익: {ref1.operating_profit:.1f} (expected: 10.3)")
    print(f"  영업이익률: {ref1.operating_margin*100:.1f}% (expected: 5.2%)")

    print("\n=== 케이스1 Simulation (Loading 50%) ===")
    sim1 = apply_loading_change(REFERENCE_CASE1, 0.50)
    res1 = calculate(sim1)
    print(f"  Panel 노무비: {res1.panel_labor:.1f} (expected: 29.8)")
    print(f"  Panel 경비: {res1.panel_expense:.1f} (expected: 16.1)")
    print(f"  Panel 상각비: {res1.panel_depreciation:.1f} (expected: 22.7)")
    print(f"  Module 노무비: {res1.module_labor:.1f} (expected: 12.2)")
    print(f"  Module 경비: {res1.module_expense:.1f} (expected: 7.4)")
    print(f"  Module 상각비: {res1.module_depreciation:.1f} (expected: 10.5)")
    print(f"  가공비: {res1.processing_cost:.1f} (expected: 98.7)")
    print(f"  COM: {res1.com:.1f} (expected: 189.5)")
    print(f"  영업이익: {res1.operating_profit:.1f} (expected: -17.9)")

    print("\n=== 케이스4 Step1: 재료비 5%↓ ===")
    sim4a = apply_material_yield_change(REFERENCE_CASE4, material_change_pct=-0.05)
    res4a = calculate(sim4a)
    print(f"  Module 재료비: {sim4a.bom.module:.2f} (expected: 71.25)")
    print(f"  BOM total: {sim4a.bom.total:.1f}")
    print(f"  소요재료비: {res4a.material_cost:.1f}")

    print("\n=== 케이스4 Step2: 재료비5%↓ + 모듈수율4%p↓ ===")
    sim4b = apply_material_yield_change(REFERENCE_CASE4, material_change_pct=-0.05, module_yield_change=-0.04)
    res4b = calculate(sim4b)
    print(f"  모듈수율: {sim4b.yields.module:.3f} (expected: 0.932)")
    print(f"  누적수율: {res4b.cumulative_yield:.6f}")
    print(f"  소요재료비: {res4b.material_cost:.1f}")
    print(f"  가공비: {res4b.processing_cost:.1f}")
    print(f"  COM: {res4b.com:.1f}")
    print(f"  COP: {res4b.cop:.1f}")
    print(f"  영업이익: {res4b.operating_profit:.1f}")
