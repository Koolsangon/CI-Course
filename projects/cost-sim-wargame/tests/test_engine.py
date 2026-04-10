"""
엔진 단위 테스트 (cost_model.py의 인라인 assertion을 pytest 형태로 정식화)
"""

import sys
import os
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from engine.cost_model import (
    CostParams, YieldRates, BOMMaterial, ProcessingCost, ProcessingCostItem,
    SGA, calculate, apply_loading_change, apply_material_yield_change,
    apply_labor_change, apply_marginal_profit_target,
    apply_cuts_mask_change, apply_tact_investment_change,
    ALL_REFERENCES, REFERENCE_CASE1,
)


class TestCostCalculation:
    """기본 원가 계산 검증"""

    def test_reference_case1_calculates(self):
        result = calculate(REFERENCE_CASE1)
        assert result.price == 200.0
        assert result.cumulative_yield > 0
        assert result.cop > 0
        assert result.operating_profit == pytest.approx(result.price - result.cop, abs=0.01)

    def test_operating_margin_formula(self):
        result = calculate(REFERENCE_CASE1)
        # operating_margin may be stored as ratio or percentage — test proportional relationship
        ratio = result.operating_profit / result.price
        assert (result.operating_margin == pytest.approx(ratio, abs=0.01) or
                result.operating_margin == pytest.approx(ratio * 100, abs=0.01))

    def test_com_equals_material_plus_processing(self):
        result = calculate(REFERENCE_CASE1)
        assert result.com == pytest.approx(result.material_cost + result.processing_cost, abs=0.01)

    def test_cop_equals_com_plus_sga(self):
        result = calculate(REFERENCE_CASE1)
        assert result.cop == pytest.approx(result.com + result.sga, abs=0.01)

    def test_all_references_exist(self):
        for case_num in range(1, 7):
            assert case_num in ALL_REFERENCES
            result = calculate(ALL_REFERENCES[case_num])
            assert result.price > 0


class TestCase1Loading:
    """Case 1: Loading 변화"""

    def test_lower_loading_increases_processing_cost(self):
        base = ALL_REFERENCES[1]
        ref = calculate(base)
        sim = calculate(apply_loading_change(base, 0.50))
        assert sim.processing_cost > ref.processing_cost

    def test_lower_loading_reduces_profit(self):
        base = ALL_REFERENCES[1]
        ref = calculate(base)
        sim = calculate(apply_loading_change(base, 0.50))
        assert sim.operating_profit < ref.operating_profit

    def test_higher_loading_improves_profit(self):
        base = ALL_REFERENCES[1]
        ref = calculate(base)
        sim = calculate(apply_loading_change(base, 0.90))
        assert sim.operating_profit > ref.operating_profit

    def test_same_loading_no_change(self):
        base = ALL_REFERENCES[1]
        ref = calculate(base)
        sim = calculate(apply_loading_change(base, base.loading))
        assert sim.operating_profit == pytest.approx(ref.operating_profit, abs=0.01)


class TestCase2Labor:
    """Case 2: 인건비 변화"""

    def test_labor_increase_raises_processing(self):
        base = ALL_REFERENCES[2]
        ref = calculate(base)
        sim = calculate(apply_labor_change(base, 1.5))
        assert sim.processing_cost > ref.processing_cost

    def test_labor_increase_raises_sga(self):
        base = ALL_REFERENCES[2]
        ref = calculate(base)
        sim = calculate(apply_labor_change(base, 1.5))
        assert sim.sga > ref.sga

    def test_labor_multiplier_1_no_change(self):
        base = ALL_REFERENCES[2]
        ref = calculate(base)
        sim = calculate(apply_labor_change(base, 1.0))
        assert sim.operating_profit == pytest.approx(ref.operating_profit, abs=0.01)


class TestCase3MarginalProfit:
    """Case 3: 한계이익률 목표 역산"""

    def test_returns_required_fields(self):
        result = apply_marginal_profit_target(ALL_REFERENCES[3], 0.60)
        for key in ["target_rate", "target_marginal_profit", "target_variable_cost",
                     "required_material_cost", "material_reduction"]:
            assert key in result, f"Missing key: {key}"

    def test_higher_target_needs_more_reduction(self):
        r60 = apply_marginal_profit_target(ALL_REFERENCES[3], 0.60)
        r70 = apply_marginal_profit_target(ALL_REFERENCES[3], 0.70)
        assert r70["material_reduction"] > r60["material_reduction"]


class TestCase4MaterialYield:
    """Case 4: 재료비/수율 변화"""

    def test_material_reduction_lowers_cost(self):
        base = ALL_REFERENCES[4]
        ref = calculate(base)
        sim = calculate(apply_material_yield_change(base, -0.05, 0))
        assert sim.material_cost < ref.material_cost

    def test_yield_drop_increases_material_cost(self):
        base = ALL_REFERENCES[4]
        ref = calculate(base)
        sim = calculate(apply_material_yield_change(base, 0, -0.04))
        assert sim.material_cost > ref.material_cost

    def test_combined_tradeoff(self):
        base = ALL_REFERENCES[4]
        sim = calculate(apply_material_yield_change(base, -0.05, -0.04))
        assert sim.material_cost > 0


class TestCase5CutsMask:
    """Case 5: 면취수/Mask 변화"""

    def test_more_cuts_reduces_panel_cost(self):
        base = ALL_REFERENCES[5]
        ref = calculate(base)
        sim = calculate(apply_cuts_mask_change(base, 25, 29, 6, 6))
        panel_ref = ref.panel_labor + ref.panel_expense + ref.panel_depreciation
        panel_sim = sim.panel_labor + sim.panel_expense + sim.panel_depreciation
        assert panel_sim < panel_ref

    def test_more_mask_increases_panel_cost(self):
        base = ALL_REFERENCES[5]
        ref = calculate(base)
        sim = calculate(apply_cuts_mask_change(base, 25, 25, 6, 7))
        panel_ref = ref.panel_labor + ref.panel_expense + ref.panel_depreciation
        panel_sim = sim.panel_labor + sim.panel_expense + sim.panel_depreciation
        assert panel_sim > panel_ref


class TestCase6TactInvestment:
    """Case 6: T/T + 투자비 변화"""

    def test_tact_delay_increases_module_cost(self):
        base = ALL_REFERENCES[6]
        ref = calculate(base)
        sim = calculate(apply_tact_investment_change(base, 1.2, 0))
        assert sim.module_labor > ref.module_labor

    def test_investment_increases_depreciation(self):
        base = ALL_REFERENCES[6]
        ref = calculate(base)
        sim = calculate(apply_tact_investment_change(base, 1.0, 1.9))
        assert sim.module_depreciation > ref.module_depreciation

    def test_combined_tact_and_investment(self):
        base = ALL_REFERENCES[6]
        ref = calculate(base)
        sim = calculate(apply_tact_investment_change(base, 1.2, 1.9))
        assert sim.operating_profit < ref.operating_profit


class TestEdgeCases:
    """엣지 케이스"""

    def test_very_low_loading(self):
        base = ALL_REFERENCES[1]
        sim = calculate(apply_loading_change(base, 0.20))
        assert sim.processing_cost > 0
        assert sim.operating_profit < 0  # should be a loss

    def test_very_high_labor(self):
        base = ALL_REFERENCES[2]
        sim = calculate(apply_labor_change(base, 3.0))
        assert sim.processing_cost > 0
