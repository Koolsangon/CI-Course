"""
API 통합 테스트 (FastAPI TestClient)
"""

import sys
import os
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi.testclient import TestClient
from api.main import app


@pytest.fixture
def client():
    return TestClient(app)


class TestHealthEndpoint:
    def test_health_returns_ok(self, client):
        r = client.get("/api/health")
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "ok"
        assert "version" in data
        assert "uptime_seconds" in data
        assert "active_games" in data
        assert "ai_enabled" in data


class TestReferenceEndpoints:
    def test_get_reference_default(self, client):
        r = client.get("/api/reference")
        assert r.status_code == 200
        assert "reference" in r.json()

    @pytest.mark.parametrize("case_num", [1, 2, 3, 4, 5, 6])
    def test_get_reference_by_case(self, client, case_num):
        r = client.get(f"/api/reference/{case_num}")
        assert r.status_code == 200
        data = r.json()
        assert data["case_num"] == case_num
        assert "reference" in data
        ref = data["reference"]
        assert "operating_profit" in ref
        assert "cop" in ref


class TestSimulationEndpoints:
    def test_case1_loading(self, client):
        r = client.post("/api/simulate/loading?loading=0.50")
        assert r.status_code == 200
        data = r.json()
        assert data["simulation"]["processing_cost"] > data["reference"]["processing_cost"]

    def test_case2_labor(self, client):
        r = client.post("/api/simulate/labor?multiplier=1.5")
        assert r.status_code == 200
        data = r.json()
        assert data["simulation"]["processing_cost"] > data["reference"]["processing_cost"]

    def test_case3_marginal_profit(self, client):
        r = client.post("/api/simulate/marginal-profit?target_rate=0.60")
        assert r.status_code == 200
        data = r.json()
        assert "required_material_cost" in data
        assert "material_reduction" in data

    def test_case4_material_yield(self, client):
        r = client.post("/api/simulate/material-yield?material_change_pct=-0.05&module_yield_change=-0.04")
        assert r.status_code == 200
        assert "reference" in r.json() and "simulation" in r.json()

    def test_case5_cuts_mask(self, client):
        r = client.post("/api/simulate/cuts-mask?new_cuts=29&new_mask=7")
        assert r.status_code == 200
        assert "reference" in r.json() and "simulation" in r.json()

    def test_case6_tact_investment(self, client):
        r = client.post("/api/simulate/tact-investment?tact_multiplier=1.2&investment_delta=1.9")
        assert r.status_code == 200
        data = r.json()
        assert data["simulation"]["module_depreciation"] > data["reference"]["module_depreciation"]


class TestGameLifecycle:
    def test_create_game(self, client):
        r = client.post("/api/game/create", json={"team_names": ["A", "B"], "total_rounds": 3})
        assert r.status_code == 200
        data = r.json()
        assert "game_id" in data
        assert len(data["game"]["teams"]) == 2

    def test_get_game(self, client):
        r = client.post("/api/game/create", json={"team_names": ["X", "Y"]})
        gid = r.json()["game_id"]
        r = client.get(f"/api/game/{gid}")
        assert r.status_code == 200
        assert r.json()["status"] == "lobby"

    def test_game_not_found(self, client):
        r = client.get("/api/game/nonexistent")
        assert r.status_code == 404

    def test_start_round(self, client):
        r = client.post("/api/game/create", json={"team_names": ["A", "B"]})
        gid = r.json()["game_id"]
        r = client.post(f"/api/game/{gid}/start-round")
        assert r.status_code == 200
        data = r.json()
        assert data["current_round"] == 1
        assert data["status"] == "playing"
        assert "scenario" in data

    def test_enhanced_scenario_fields(self, client):
        r = client.post("/api/game/create", json={"team_names": ["A", "B"]})
        gid = r.json()["game_id"]
        r = client.post(f"/api/game/{gid}/start-round")
        scenario = r.json()["scenario"]
        assert "briefing" in scenario
        assert "difficulty" in scenario
        assert "learning_objective" in scenario

    def test_submit_and_leaderboard(self, client):
        r = client.post("/api/game/create", json={"team_names": ["A", "B"]})
        gid = r.json()["game_id"]
        client.post(f"/api/game/{gid}/start-round")

        params = {"price": 200, "loading": 0.7, "tft_yield": 0.99, "cf_yield": 1.0,
                  "cell_yield": 0.95, "module_yield": 0.972, "bom_tft": 6.0, "bom_cf": 5.0,
                  "bom_cell": 1.5, "bom_module": 75.0, "panel_labor": 21.3, "panel_expense": 11.5,
                  "panel_depreciation": 16.2, "module_labor": 8.7, "module_expense": 5.3,
                  "module_depreciation": 7.5, "sga_direct_dev": 4.7, "sga_transport": 0.3,
                  "sga_business_unit": 16.0, "sga_operation": 1.2, "sga_corporate_oh": 6.2}

        r = client.post(f"/api/game/{gid}/submit",
                        json={"team_name": "A", "params": params})
        assert r.status_code == 200
        assert "result" in r.json()

        r = client.get(f"/api/game/{gid}/leaderboard")
        assert r.status_code == 200
        assert len(r.json()["leaderboard"]) == 2

    def test_cannot_submit_when_not_playing(self, client):
        r = client.post("/api/game/create", json={"team_names": ["A", "B"]})
        gid = r.json()["game_id"]
        # Don't start round
        params = {"price": 200, "loading": 0.7, "tft_yield": 0.99, "cf_yield": 1.0,
                  "cell_yield": 0.95, "module_yield": 0.972, "bom_tft": 6.0, "bom_cf": 5.0,
                  "bom_cell": 1.5, "bom_module": 75.0, "panel_labor": 21.3, "panel_expense": 11.5,
                  "panel_depreciation": 16.2, "module_labor": 8.7, "module_expense": 5.3,
                  "module_depreciation": 7.5, "sga_direct_dev": 4.7, "sga_transport": 0.3,
                  "sga_business_unit": 16.0, "sga_operation": 1.2, "sga_corporate_oh": 6.2}
        r = client.post(f"/api/game/{gid}/submit",
                        json={"team_name": "A", "params": params})
        assert r.status_code == 400


class TestChatEndpoint:
    def test_chat_keyword_match(self, client):
        r = client.post("/api/chat", json={"message": "수율이 뭐야?"})
        assert r.status_code == 200
        data = r.json()
        assert "수율" in data["response"]
        assert data["ai_powered"] is False

    def test_chat_no_match(self, client):
        r = client.post("/api/chat", json={"message": "안녕"})
        assert r.status_code == 200
        assert "질문해주세요" in r.json()["response"]
