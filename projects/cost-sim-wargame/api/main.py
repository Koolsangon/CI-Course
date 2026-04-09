"""
개발원가 War Game - FastAPI 백엔드
"""

import sys
import os
import uuid
import time
import json
from typing import Optional
from dataclasses import dataclass, field, asdict

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel

# 프로젝트 루트를 path에 추가
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from engine.cost_model import (
    CostParams, YieldRates, BOMMaterial, ProcessingCost, ProcessingCostItem,
    SGA, calculate, apply_loading_change, apply_material_yield_change,
    REFERENCE_CASE1, REFERENCE_CASE4,
)
from ai.assistant import AIAssistant, get_scenario, get_surprise_event

app = FastAPI(title="개발원가 War Game", version="0.1.0")

# Static files
frontend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend")
app.mount("/static", StaticFiles(directory=frontend_dir), name="static")

# AI 어시스턴트 (API 키 없으면 템플릿 모드)
ai = AIAssistant()

# ── 인메모리 게임 세션 저장소 ──

games: dict = {}


class GameSession:
    def __init__(self, game_id: str, team_names: list[str], total_rounds: int = 3):
        self.game_id = game_id
        self.teams = {name: {"score": 0, "submissions": {}} for name in team_names}
        self.current_round = 0
        self.total_rounds = total_rounds
        self.status = "lobby"  # lobby, playing, round_result, finished
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
        # 순위별 점수 부여
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


# ── WebSocket 연결 관리 ──

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
            self.connections[game_id] = [
                c for c in self.connections[game_id] if c != ws
            ]

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
    # 기본 파라미터
    price: float = 200.0
    loading: float = 0.70
    # 수율
    tft_yield: float = 0.99
    cf_yield: float = 1.0
    cell_yield: float = 0.95
    module_yield: float = 0.972
    # BOM
    bom_tft: float = 6.0
    bom_cf: float = 5.0
    bom_cell: float = 1.5
    bom_module: float = 75.0
    # 가공비 - Panel
    panel_labor: float = 21.3
    panel_expense: float = 11.5
    panel_depreciation: float = 16.2
    # 가공비 - Module
    module_labor: float = 8.7
    module_expense: float = 5.3
    module_depreciation: float = 7.5
    # 판관비
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


# ── API 엔드포인트 ──

@app.get("/")
async def root():
    return FileResponse(os.path.join(frontend_dir, "index.html"))


@app.get("/api/reference")
async def get_reference():
    """기준(Reference) 데이터 반환"""
    ref = calculate(REFERENCE_CASE1)
    return {"reference": ref.to_dict(), "ai_enabled": ai.ai_enabled}


@app.post("/api/simulate")
async def simulate(req: SimulateRequest):
    """파라미터를 받아 원가 시뮬레이션 결과 반환"""
    params = CostParams(
        price=req.price,
        yields=YieldRates(
            tft=req.tft_yield, cf=req.cf_yield,
            cell=req.cell_yield, module=req.module_yield,
        ),
        bom=BOMMaterial(
            tft=req.bom_tft, cf=req.bom_cf,
            cell=req.bom_cell, module=req.bom_module,
        ),
        processing=ProcessingCost(
            panel=ProcessingCostItem(
                labor=req.panel_labor, expense=req.panel_expense,
                depreciation=req.panel_depreciation,
            ),
            module=ProcessingCostItem(
                labor=req.module_labor, expense=req.module_expense,
                depreciation=req.module_depreciation,
            ),
        ),
        sga=SGA(
            direct_dev=req.sga_direct_dev, transport=req.sga_transport,
            business_unit=req.sga_business_unit, operation=req.sga_operation,
            corporate_oh=req.sga_corporate_oh,
        ),
        loading=req.loading,
    )
    result = calculate(params)
    coaching = ai.generate_coaching(result.to_dict())
    return {"result": result.to_dict(), "coaching": coaching}


@app.post("/api/simulate/loading")
async def simulate_loading(loading: float = 0.50):
    """Loading 변화 시뮬레이션 (간편 API)"""
    ref_result = calculate(REFERENCE_CASE1)
    sim_params = apply_loading_change(REFERENCE_CASE1, loading)
    sim_result = calculate(sim_params)
    return {
        "reference": ref_result.to_dict(),
        "simulation": sim_result.to_dict(),
        "loading_before": REFERENCE_CASE1.loading,
        "loading_after": loading,
    }


@app.post("/api/simulate/material-yield")
async def simulate_material_yield(
    material_change_pct: float = -0.05,
    module_yield_change: float = -0.04,
):
    """재료비/수율 변화 시뮬레이션 (간편 API)"""
    ref_result = calculate(REFERENCE_CASE4)
    sim_params = apply_material_yield_change(
        REFERENCE_CASE4, material_change_pct, module_yield_change
    )
    sim_result = calculate(sim_params)
    return {
        "reference": ref_result.to_dict(),
        "simulation": sim_result.to_dict(),
        "material_change_pct": material_change_pct,
        "module_yield_change": module_yield_change,
    }


# ── 게임 세션 API ──

@app.post("/api/game/create")
async def create_game(req: CreateGameRequest):
    """게임 세션 생성"""
    game_id = str(uuid.uuid4())[:8]
    game = GameSession(game_id, req.team_names, req.total_rounds)
    games[game_id] = game
    return {"game_id": game_id, "game": game.to_dict()}


@app.get("/api/game/{game_id}")
async def get_game(game_id: str):
    """게임 상태 조회"""
    if game_id not in games:
        raise HTTPException(404, "게임을 찾을 수 없습니다")
    return games[game_id].to_dict()


@app.post("/api/game/{game_id}/start-round")
async def start_round(game_id: str):
    """새 라운드 시작"""
    if game_id not in games:
        raise HTTPException(404, "게임을 찾을 수 없습니다")
    game = games[game_id]
    game.start_round()
    await manager.broadcast(game_id, {
        "type": "round_start",
        "data": game.to_dict(),
    })
    return game.to_dict()


@app.post("/api/game/{game_id}/submit")
async def submit_answer(game_id: str, req: SubmitRequest):
    """팀 의사결정 제출"""
    if game_id not in games:
        raise HTTPException(404, "게임을 찾을 수 없습니다")
    game = games[game_id]
    if game.status != "playing":
        raise HTTPException(400, "현재 라운드가 진행 중이 아닙니다")

    # 시뮬레이션 실행
    params = CostParams(
        price=req.params.price,
        yields=YieldRates(
            tft=req.params.tft_yield, cf=req.params.cf_yield,
            cell=req.params.cell_yield, module=req.params.module_yield,
        ),
        bom=BOMMaterial(
            tft=req.params.bom_tft, cf=req.params.bom_cf,
            cell=req.params.bom_cell, module=req.params.bom_module,
        ),
        processing=ProcessingCost(
            panel=ProcessingCostItem(
                labor=req.params.panel_labor, expense=req.params.panel_expense,
                depreciation=req.params.panel_depreciation,
            ),
            module=ProcessingCostItem(
                labor=req.params.module_labor, expense=req.params.module_expense,
                depreciation=req.params.module_depreciation,
            ),
        ),
        sga=SGA(
            direct_dev=req.params.sga_direct_dev, transport=req.params.sga_transport,
            business_unit=req.params.sga_business_unit,
            operation=req.params.sga_operation,
            corporate_oh=req.params.sga_corporate_oh,
        ),
        loading=req.params.loading,
    )
    result = calculate(params).to_dict()
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
    """돌발 이벤트 발생"""
    if game_id not in games:
        raise HTTPException(404, "게임을 찾을 수 없습니다")
    game = games[game_id]
    event = get_surprise_event()
    game.surprise_event = event
    await manager.broadcast(game_id, {
        "type": "surprise_event",
        "data": event,
    })
    return event


@app.get("/api/game/{game_id}/leaderboard")
async def get_leaderboard(game_id: str):
    """리더보드 조회"""
    if game_id not in games:
        raise HTTPException(404, "게임을 찾을 수 없습니다")
    return {"leaderboard": games[game_id].get_leaderboard()}


# ── WebSocket ──

@app.websocket("/ws/game/{game_id}")
async def websocket_endpoint(websocket: WebSocket, game_id: str):
    await manager.connect(game_id, websocket)
    try:
        if game_id in games:
            await websocket.send_json({
                "type": "game_state",
                "data": games[game_id].to_dict(),
            })
        while True:
            data = await websocket.receive_text()
            # 클라이언트 메시지 처리 (확장 가능)
    except WebSocketDisconnect:
        manager.disconnect(game_id, websocket)


# ── AI 채팅 ──

class ChatRequest(BaseModel):
    message: str
    context: Optional[dict] = None


@app.post("/api/chat")
async def chat(req: ChatRequest):
    """AI 어시스턴트 채팅"""
    if ai.ai_enabled:
        try:
            response = ai.client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=500,
                system=(
                    "당신은 디스플레이/반도체 제조업의 개발원가 전문가입니다. "
                    "COP(Cost of Product) 구조, 수율, 가공비, BOM 등에 대해 "
                    "실무적이고 간결한 답변을 해주세요. 한국어로 응답하세요."
                ),
                messages=[{"role": "user", "content": req.message}],
            )
            return {"response": response.content[0].text, "ai_powered": True}
        except Exception as e:
            pass

    # 템플릿 기반 응답
    msg = req.message.lower()
    if "수율" in msg:
        answer = ("수율은 각 공정(TFT, CF, Cell, Module)별로 양품률을 의미합니다. "
                  "누적수율 = TFT수율 × CF수율 × Cell수율 × Module수율이며, "
                  "소요재료비에 직접 영향을 줍니다. 수율 1%p 개선 시 소요재료비가 약 1% 감소합니다.")
    elif "가공비" in msg or "loading" in msg.lower():
        answer = ("가공비는 고정비(노무비+경비+상각비)를 생산량으로 나눈 것입니다. "
                  "Loading(가동률)이 하락하면 단위당 가공비가 상승합니다. "
                  "예: Loading 70%→50%로 하락 시 가공비가 약 1.4배(70/50) 증가합니다.")
    elif "재료비" in msg or "bom" in msg.lower():
        answer = ("BOM 재료비는 TFT, CF, Cell, Module 각 공정의 재료비 합계입니다. "
                  "소요재료비 = 각 공정 BOM ÷ (해당 공정~최종 누적수율)의 합입니다. "
                  "재료비 절감은 수익성 개선의 가장 직접적인 방법입니다.")
    elif "cop" in msg.lower() or "원가" in msg:
        answer = ("COP = COM(제조원가) + SG&A(판관비)입니다. "
                  "COM = 소요재료비 + 가공비. "
                  "영업이익 = Price - COP. "
                  "Cash Cost = COP - 상각비, EBITDA = Price - Cash Cost.")
    else:
        answer = ("원가 시뮬레이션에 대해 질문해주세요. "
                  "수율, 가공비, 재료비, Loading, COP 구조 등에 대해 설명드릴 수 있습니다.")

    return {"response": answer, "ai_powered": False}
