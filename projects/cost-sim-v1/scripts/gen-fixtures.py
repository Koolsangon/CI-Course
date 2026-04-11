#!/usr/bin/env python3
"""
Golden Fixture Generator — Python `cost_model.py` oracle → TS fixtures.

Reads the validated v0 Python engine and produces JSON snapshots at full
float64 precision. The TS engine (lib/cost-engine/engine.ts) must match
each fixture within ±0.001.

Usage:
    python3 scripts/gen-fixtures.py            # writes lib/cost-engine/__fixtures__/*.json

The 27 assertions in the Python __main__ block correspond to 7 scenarios;
this script exports both the reference baseline and every scenario output.
"""

import json
import os
import sys
from dataclasses import asdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
V0 = ROOT.parent / "cost-sim-wargame-v0"
FIX_DIR = ROOT / "lib" / "cost-engine" / "__fixtures__"

sys.path.insert(0, str(V0))

# Import the validated v0 engine
from engine.cost_model import (  # type: ignore  # noqa: E402
    CostParams,
    calculate,
    apply_loading_change,
    apply_labor_change,
    apply_material_yield_change,
    apply_cuts_mask_change,
    apply_tact_investment_change,
    REFERENCE_CASE1,
    REFERENCE_CASE2,
    REFERENCE_CASE3,
    REFERENCE_CASE4,
    REFERENCE_CASE5,
    REFERENCE_CASE6,
    ALL_REFERENCES,
)


def params_to_dict(p: CostParams) -> dict:
    return {
        "price": p.price,
        "yields": {
            "tft": p.yields.tft,
            "cf": p.yields.cf,
            "cell": p.yields.cell,
            "module": p.yields.module,
        },
        "bom": {
            "tft": p.bom.tft,
            "cf": p.bom.cf,
            "cell": p.bom.cell,
            "module": p.bom.module,
        },
        "processing": {
            "panel": {
                "labor": p.processing.panel.labor,
                "expense": p.processing.panel.expense,
                "depreciation": p.processing.panel.depreciation,
            },
            "module": {
                "labor": p.processing.module.labor,
                "expense": p.processing.module.expense,
                "depreciation": p.processing.module.depreciation,
            },
        },
        "sga": {
            "direct_dev": p.sga.direct_dev,
            "transport": p.sga.transport,
            "business_unit": p.sga.business_unit,
            "operation": p.sga.operation,
            "corporate_oh": p.sga.corporate_oh,
        },
        "loading": p.loading,
    }


def result_to_dict(r) -> dict:
    """Full-precision serialization (no rounding). TS oracle tolerance = ±0.001."""
    return {
        "price": r.price,
        "cumulative_yield": r.cumulative_yield,
        "bom_total": r.bom_total,
        "material_cost": r.material_cost,
        "processing_cost": r.processing_cost,
        "panel_labor": r.panel_labor,
        "panel_expense": r.panel_expense,
        "panel_depreciation": r.panel_depreciation,
        "module_labor": r.module_labor,
        "module_expense": r.module_expense,
        "module_depreciation": r.module_depreciation,
        "com": r.com,
        "sga": r.sga,
        "cop": r.cop,
        "operating_profit": r.operating_profit,
        "operating_margin": r.operating_margin,
        "cash_cost": r.cash_cost,
        "ebitda": r.ebitda,
        "variable_cost": r.variable_cost,
        "marginal_profit": r.marginal_profit,
    }


def main():
    FIX_DIR.mkdir(parents=True, exist_ok=True)

    # ---- 1) References: snapshot each of the 6 reference presets ----
    references = {}
    for case_id, ref in ALL_REFERENCES.items():
        references[f"case{case_id}"] = {
            "params": params_to_dict(ref),
            "result": result_to_dict(calculate(ref)),
        }
    (FIX_DIR / "references.json").write_text(
        json.dumps(references, indent=2, ensure_ascii=False)
    )

    # ---- 2) Scenarios: match the 7 scenarios from Python __main__ block ----
    scenarios = {}

    # Case 1: Loading 70% → 50%
    sim1 = apply_loading_change(REFERENCE_CASE1, 0.50)
    scenarios["case1_loading_50"] = {
        "description": "Loading 70%→50% (Case1)",
        "adapter": "loading",
        "input": {"new_loading": 0.50},
        "params_after": params_to_dict(sim1),
        "result": result_to_dict(calculate(sim1)),
    }

    # Case 2: 인건비 1.5배
    sim2 = apply_labor_change(REFERENCE_CASE2, 1.5)
    scenarios["case2_labor_1_5x"] = {
        "description": "인건비 1.5배 (Case2)",
        "adapter": "labor",
        "input": {"labor_multiplier": 1.5},
        "params_after": params_to_dict(sim2),
        "result": result_to_dict(calculate(sim2)),
    }

    # Case 4: 재료비 -5%, 수율 -4%p
    sim4 = apply_material_yield_change(REFERENCE_CASE4, -0.05, -0.04)
    scenarios["case4_mat_m5_yield_m4p"] = {
        "description": "재료비 -5% + 수율 -4%p (Case4)",
        "adapter": "material-yield",
        "input": {"material_change_pct": -0.05, "module_yield_change": -0.04},
        "params_after": params_to_dict(sim4),
        "result": result_to_dict(calculate(sim4)),
    }

    # Case 5a: 면취수 25→29
    sim5a = apply_cuts_mask_change(REFERENCE_CASE5, 25, 29, 6, 6)
    scenarios["case5a_cuts_25_29"] = {
        "description": "면취수 25→29 (Case5a)",
        "adapter": "cuts-mask",
        "input": {"old_cuts": 25, "new_cuts": 29, "old_mask": 6, "new_mask": 6},
        "params_after": params_to_dict(sim5a),
        "result": result_to_dict(calculate(sim5a)),
    }

    # Case 5b: 면취수 25→29 + Mask 6→7
    sim5b = apply_cuts_mask_change(REFERENCE_CASE5, 25, 29, 6, 7)
    scenarios["case5b_cuts_mask"] = {
        "description": "면취수 25→29 + Mask 6→7 (Case5b)",
        "adapter": "cuts-mask",
        "input": {"old_cuts": 25, "new_cuts": 29, "old_mask": 6, "new_mask": 7},
        "params_after": params_to_dict(sim5b),
        "result": result_to_dict(calculate(sim5b)),
    }

    # Case 6a: Tact 1.2X
    sim6a = apply_tact_investment_change(REFERENCE_CASE6, 1.2, 0.0)
    scenarios["case6a_tact_1_2x"] = {
        "description": "Tact 1.2X (Case6a)",
        "adapter": "tact-investment",
        "input": {"tact_multiplier": 1.2, "investment_depreciation_delta": 0.0},
        "params_after": params_to_dict(sim6a),
        "result": result_to_dict(calculate(sim6a)),
    }

    # Case 6b: Tact 1.2X + 투자 13억 (+1.9 상각비)
    sim6b = apply_tact_investment_change(REFERENCE_CASE6, 1.2, 1.9)
    scenarios["case6b_tact_invest"] = {
        "description": "Tact 1.2X + 투자 13억 (Case6b)",
        "adapter": "tact-investment",
        "input": {"tact_multiplier": 1.2, "investment_depreciation_delta": 1.9},
        "params_after": params_to_dict(sim6b),
        "result": result_to_dict(calculate(sim6b)),
    }

    (FIX_DIR / "scenarios.json").write_text(
        json.dumps(scenarios, indent=2, ensure_ascii=False)
    )

    # ---- 3) Summary ----
    summary = {
        "generated_at": "2026-04-11",
        "oracle": str(V0 / "engine" / "cost_model.py"),
        "reference_count": len(references),
        "scenario_count": len(scenarios),
        "tolerance": 0.001,
        "policy": "TS engine must match each fixture value within ±0.001 (float64 ↔ JS Number, IEEE 754)",
    }
    (FIX_DIR / "summary.json").write_text(
        json.dumps(summary, indent=2, ensure_ascii=False)
    )

    print(f"✓ Wrote {FIX_DIR}/references.json  ({len(references)} cases)")
    print(f"✓ Wrote {FIX_DIR}/scenarios.json   ({len(scenarios)} scenarios)")
    print(f"✓ Wrote {FIX_DIR}/summary.json")


if __name__ == "__main__":
    main()
