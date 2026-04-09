"""
개발원가 War Game - FastAPI 백엔드 (v2: 전 6개 케이스 지원)
"""

import sys
import os
import uuid
import time
import json
from typing import Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from engine.cost_model import (
    CostParams, YieldRates, BOMMaterial, ProcessingCost, ProcessingCostItem,
    SGA, calculate, apply_loading_change, apply_material_yield_change,
    apply_labor_change, apply_marginal_profit_target,
    apply_cuts_mask_change, apply_tact_investment_change,
    ALL_REFERENCES, REFERENCE_CASE1, REFERENCE_CASE2,
)
from ai.assistant import AIAssistant, get_scenario, get_surprise_event

app = FastAPI(title="개발원가 War Game", version="0.2.0")

frontend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend")
app.mount("/static", StaticFiles(directory=frontend_dir), name="static")

ai = AIAssistant()
games: dict = {}


# ── 게임 세션 ──

class GameSession:
    def __init__(self, game_id: str, team_names: list[str], total_rounds: int = 3):
        self.game_id = game_id
        self.teams = {name: {"score": 0, "submissions": {}} for name in team_names}
        self.current_round = 0
        self.total_rounds = total_rounds
        self.status = "lobby"
        self.round_scenario = None
        self.surprise_event = None
        self.created_at = time.time()

    def start_round(self):
        self.current_round += 1
        self.status = "playing"
        self.round_scenario = get_scenario(self.current_round)
        self.surprise_event = None
        for team in self.teams.values():
            team["submissions"][self.current_round] = None

    def submit(self, team_name: str, result: dict):
        if team_name not in self.teams:
            return False
        self.teams[team_name]["submissions"][self.current_round] = result
        return True

    def all_submitted(self) -> bool:
        return all(
            t["submissions"].get(self.current_round) is not None
            for t in self.teams.values()
        )

    def get_leaderboard(self) -> list:
        board = []
        for name, data in self.teams.items():
            sub = data["submissions"].get(self.current_round, {})
            board.append({
                "team": name,
                "operating_profit": sub.get("operating_profit", 0) if sub else 0,
                "operating_margin": sub.get("operating_margin", 0) if sub else 0,
                "ebitda": sub.get("ebitda", 0) if sub else 0,
                "total_score": data["score"],
                "submitted": sub is not None,
            })
        board.sort(key=lambda x: x["operating_profit"], reverse=True)
        return board

    def end_round(self):
        leaderboard = self.get_leaderboard()
        for rank, entry in enumerate(leaderboard):
            if entry["submitted"]:
                points = max(10 - rank * 3, 1)
                self.teams[entry["team"]]["score"] += points
        if self.current_round >= self.total_rounds:
            self.status = "finished"
        else:
            self.status = "round_result"

    def to_dict(self) -> dict:
        return {
            "game_id": self.game_id,
            "teams": list(self.teams.keys()),
            "current_round": self.current_round,
            "total_rounds": self.total_rounds,
            "status": self.status,
            "scenario": self.round_scenario,
            "surprise_event": self.surprise_event,
            "leaderboard": self.get_leaderboard(),
        }


# ── WebSocket ──

class ConnectionManager:
    def __init__(self):
        self.connections: dict[str, list[WebSocket]] = {}

    async def connect(self, game_id: str, ws: WebSocket):
        await ws.accept()
        if game_id not in self.connections:
            self.connections[game_id] = []
        self.connections[game_id].append(ws)

    def disconnect(self, game_id: str, ws: WebSocket):
        if game_id in self.connections:
            self.connections[game_id] = [c for c in self.connections[game_id] if c != ws]

    async def broadcast(self, game_id: str, message: dict):
        if game_id in self.connections:
            dead = []
            for ws in self.connections[game_id]:
                try:
                    await ws.send_json(message)
                except Exception:
                    dead.append(ws)
            for ws in dead:
                self.connections[game_id].remove(ws)


manager = ConnectionManager()


# ── Pydantic 모델 ──

class SimulateRequest(BaseModel):
    price: float = 200.0
    loading: float = 0.70
    tft_yield: float = 0.99
    cf_yield: float = 1.0
    cell_yield: float = 0.95
    module_yield: float = 0.972
    bom_tft: float = 6.0
    bom_cf: float = 5.0
    bom_cell: float = 1.5
    bom_module: float = 75.0
    panel_labor: float = 21.3
    panel_expense: float = 11.5
    panel_depreciation: float = 16.2
    module_labor: float = 8.7
    module_expense: float = 5.3
    module_depreciation: float = 7.5
    sga_direct_dev: float = 4.7
    sga_transport: float = 0.3
    sga_business_unit: float = 16.0
    sga_operation: float = 1.2
    sga_corporate_oh: float = 6.2


class CreateGameRequest(BaseModel):
    team_names: list[str]
    total_rounds: int = 3


class SubmitRequest(BaseModel):
    team_name: str
    params: SimulateRequest


class ChatRequest(BaseModel):
    message: str
    context: Optional[dict] = None


def req_to_params(req: SimulateRequest) -> CostParams:
    return CostParams(
        price=req.price,
        yields=YieldRates(tft=req.tft_yield, cf=req.cf_yield,
                          cell=req.cell_yield, module=req.module_yield),
        bom=BOMMaterial(tft=req.bom_tft, cf=req.bom_cf,
                        cell=req.bom_cell, module=req.bom_module),
        processing=ProcessingCost(
            panel=ProcessingCostItem(labor=req.panel_labor, expense=req.panel_expense,
                                     depreciation=req.panel_depreciation),
            module=ProcessingCostItem(labor=req.module_labor, expense=req.module_expense,
                                      depreciation=req.module_depreciation),
        ),
        sga=SGA(direct_dev=req.sga_direct_dev, transport=req.sga_transport,
                 business_unit=req.sga_business_unit, operation=req.sga_operation,
                 corporate_oh=req.sga_corporate_oh),
        loading=req.loading,
    )


# ── 페이지 ──

@app.get("/")
async def root():
    return FileResponse(os.path.join(frontend_dir, "index.html"))


# ── 시뮬레이션 API (전 6개 케이스) ──

@app.get("/api/reference/{case_num}")
async def get_reference(case_num: int = 1):
    """케이스별 Reference 데이터 반환"""
    ref_params = ALL_REFERENCES.get(case_num, ALL_REFERENCES[1])
    ref = calculate(ref_params)
    return {"case_num": case_num, "reference": ref.to_dict(), "ai_enabled": ai.ai_enabled}


@app.get("/api/reference")
async def get_reference_default():
    ref = calculate(ALL_REFERENCES[1])
    return {"reference": ref.to_dict(), "ai_enabled": ai.ai_enabled}


@app.post("/api/simulate")
async def simulate(req: SimulateRequest):
    result = calculate(req_to_params(req))
    coaching = ai.generate_coaching(result.to_dict())
    return {"result": result.to_dict(), "coaching": coaching}


@app.post("/api/simulate/loading")
async def simulate_loading(loading: float = 0.50):
    """Case 1: Loading 변화"""
    base = ALL_REFERENCES[1]
    ref_result = calculate(base)
    sim_params = apply_loading_change(base, loading)
    sim_result = calculate(sim_params)
    return {
        "reference": ref_result.to_dict(),
        "simulation": sim_result.to_dict(),
        "loading_before": base.loading,
        "loading_after": loading,
    }


@app.post("/api/simulate/labor")
async def simulate_labor(multiplier: float = 1.5):
    """Case 2: 인건비 변화"""
    base = ALL_REFERENCES[2]
    ref_result = calculate(base)
    sim_params = apply_labor_change(base, multiplier)
    sim_result = calculate(sim_params)
    return {
        "reference": ref_result.to_dict(),
        "simulation": sim_result.to_dict(),
        "labor_multiplier": multiplier,
    }


@app.post("/api/simulate/marginal-profit")
async def simulate_marginal_profit(target_rate: float = 0.60):
    """Case 3: 한계이익률 목표"""
    base = ALL_REFERENCES[3]
    result = apply_marginal_profit_target(base, target_rate)
    return result


@app.post("/api/simulate/material-yield")
async def simulate_material_yield(
    material_change_pct: float = -0.05,
    module_yield_change: float = -0.04,
):
    """Case 4: 재료비/수율 변화"""
    base = ALL_REFERENCES[4]
    ref_result = calculate(base)
    sim_params = apply_material_yield_change(base, material_change_pct, module_yield_change)
    sim_result = calculate(sim_params)
    return {
        "reference": ref_result.to_dict(),
        "simulation": sim_result.to_dict(),
        "material_change_pct": material_change_pct,
        "module_yield_change": module_yield_change,
    }


@app.post("/api/simulate/cuts-mask")
async def simulate_cuts_mask(
    new_cuts: int = 29,
    new_mask: int = 6,
):
    """Case 5: 면취수/Mask 변화"""
    base = ALL_REFERENCES[5]
    ref_result = calculate(base)
    sim_params = apply_cuts_mask_change(base, 25, new_cuts, 6, new_mask)
    sim_result = calculate(sim_params)
    return {
        "reference": ref_result.to_dict(),
        "simulation": sim_result.to_dict(),
        "cuts_before": 25, "cuts_after": new_cuts,
        "mask_before": 6, "mask_after": new_mask,
    }


@app.post("/api/simulate/tact-investment")
async def simulate_tact_investment(
    tact_multiplier: float = 1.2,
    investment_delta: float = 1.9,
):
    """Case 6: T/T + 투자비 변화"""
    base = ALL_REFERENCES[6]
    ref_result = calculate(base)
    sim_params = apply_tact_investment_change(base, tact_multiplier, investment_delta)
    sim_result = calculate(sim_params)
    return {
        "reference": ref_result.to_dict(),
        "simulation": sim_result.to_dict(),
        "tact_multiplier": tact_multiplier,
        "investment_delta": investment_delta,
    }


# ── 게임 세션 API ──

@app.post("/api/game/create")
async def create_game(req: CreateGameRequest):
    game_id = str(uuid.uuid4())[:8]
    game = GameSession(game_id, req.team_names, req.total_rounds)
    games[game_id] = game
    return {"game_id": game_id, "game": game.to_dict()}


@app.get("/api/game/{game_id}")
async def get_game(game_id: str):
    if game_id not in games:
        raise HTTPException(404, "게임을 찾을 수 없습니다")
    return games[game_id].to_dict()


@app.post("/api/game/{game_id}/start-round")
async def start_round(game_id: str):
    if game_id not in games:
        raise HTTPException(404, "게임을 찾을 수 없습니다")
    game = games[game_id]
    game.start_round()
    await manager.broadcast(game_id, {"type": "round_start", "data": game.to_dict()})
    return game.to_dict()


@app.post("/api/game/{game_id}/submit")
async def submit_answer(game_id: str, req: SubmitRequest):
    if game_id not in games:
        raise HTTPException(404, "게임을 찾을 수 없습니다")
    game = games[game_id]
    if game.status != "playing":
        raise HTTPException(400, "현재 라운드가 진행 중이 아닙니다")

    result = calculate(req_to_params(req.params)).to_dict()
    game.submit(req.team_name, result)
    coaching = ai.generate_coaching(result)

    await manager.broadcast(game_id, {
        "type": "team_submitted",
        "data": {"team": req.team_name, "leaderboard": game.get_leaderboard()},
    })

    response = {"result": result, "coaching": coaching}

    if game.all_submitted():
        game.end_round()
        analysis = ai.analyze_teams(
            {name: data["submissions"].get(game.current_round, {})
             for name, data in game.teams.items()}
        )
        await manager.broadcast(game_id, {
            "type": "round_end",
            "data": {**game.to_dict(), "analysis": analysis},
        })
        response["round_complete"] = True
        response["analysis"] = analysis

    return response


@app.post("/api/game/{game_id}/surprise")
async def trigger_surprise(game_id: str):
    if game_id not in games:
        raise HTTPException(404, "게임을 찾을 수 없습니다")
    game = games[game_id]
    event = get_surprise_event()
    game.surprise_event = event
    await manager.broadcast(game_id, {"type": "surprise_event", "data": event})
    return event


@app.get("/api/game/{game_id}/leaderboard")
async def get_leaderboard(game_id: str):
    if game_id not in games:
        raise HTTPException(404, "게임을 찾을 수 없습니다")
    return {"leaderboard": games[game_id].get_leaderboard()}


@app.websocket("/ws/game/{game_id}")
async def websocket_endpoint(websocket: WebSocket, game_id: str):
    await manager.connect(game_id, websocket)
    try:
        if game_id in games:
            await websocket.send_json({"type": "game_state", "data": games[game_id].to_dict()})
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(game_id, websocket)


# ── AI 채팅 ──

CHAT_TEMPLATES = {
    "수율": ("수율은 각 공정(TFT, CF, Cell, Module)별로 양품률을 의미합니다. "
            "누적수율 = TFT수율 x CF수율 x Cell수율 x Module수율이며, "
            "소요재료비에 직접 영향을 줍니다. 수율 1%p 개선 시 소요재료비가 약 1% 감소합니다."),
    "가공비": ("가공비는 고정비(노무비+경비+상각비)를 생산량으로 나눈 것입니다. "
              "Loading(가동률)이 하락하면 단위당 가공비가 상승합니다. "
              "예: Loading 70%->50% 시 가공비가 약 1.4배(70/50) 증가합니다."),
    "재료비": ("BOM 재료비는 TFT, CF, Cell, Module 각 공정의 재료비 합계입니다. "
              "소요재료비 = 각 공정 BOM / (해당 공정~최종 누적수율)의 합입니다."),
    "cop": ("COP = COM(제조원가) + SG&A(판관비). COM = 소요재료비 + 가공비. "
            "영업이익 = Price - COP. Cash Cost = COP - 상각비, EBITDA = Price - Cash Cost."),
    "면취수": ("면취수는 하나의 유리 기판에서 패널을 몇 개 잘라낼 수 있는지를 나타냅니다. "
              "면취수가 증가하면 Panel당 BOM 재료비와 가공비가 모두 감소합니다. "
              "예: 25->29로 변경 시 Panel 비용이 25/29 = 약 86%로 절감됩니다."),
    "mask": ("Mask 수는 TFT 공정에서 사용하는 포토마스크 단계 수입니다. "
             "Mask가 증가하면 Panel 가공비가 비례 증가합니다. "
             "예: 6->7로 변경 시 Panel 가공비가 7/6 = 약 117%로 증가합니다."),
    "tact": ("Tact Time(T/T)은 모듈 공정의 단위 생산 시간입니다. "
             "T/T 지연 시 Module 가공비가 비례 증가합니다. "
             "예: 1.2X 지연 시 Module 가공비가 1.2배 증가합니다."),
    "인건비": ("인건비가 상승하면 가공비 중 노무비(Panel+Module)가 직접 증가하고, "
              "SGA(판관비) 중 인건비 비중(약 30%)도 함께 상승합니다."),
    "한계이익": ("한계이익 = Price - 변동비(재료비+외주비+운반비). "
               "한계이익률 = 한계이익/Price. "
               "목표 한계이익률에서 역산하면 허용 가능한 변동비 수준을 알 수 있습니다."),
}


@app.post("/api/chat")
async def chat(req: ChatRequest):
    if ai.ai_enabled:
        try:
            response = ai.client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=500,
                system=(
                    "당신은 디스플레이/반도체 제조업의 개발원가 전문가입니다. "
                    "COP 구조, 수율, 가공비, BOM, Loading, 면취수, Mask, Tact 등에 대해 "
                    "실무적이고 간결한 답변을 해주세요. 한국어로 응답하세요."
                ),
                messages=[{"role": "user", "content": req.message}],
            )
            return {"response": response.content[0].text, "ai_powered": True}
        except Exception:
            pass

    msg = req.message.lower()
    for keyword, answer in CHAT_TEMPLATES.items():
        if keyword in msg:
            return {"response": answer, "ai_powered": False}

    return {
        "response": ("원가 시뮬레이션에 대해 질문해주세요. "
                     "수율, 가공비, 재료비, Loading, COP, 면취수, Mask, Tact, "
                     "인건비, 한계이익 등에 대해 설명드릴 수 있습니다."),
        "ai_powered": False,
    }
