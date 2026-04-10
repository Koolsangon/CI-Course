"""
개발원가 War Game - FastAPI 백엔드 (v0.4.0: Production-hardened)
"""

import sys
import os
import uuid
import time
import json
import logging
from typing import Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Request, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field, field_validator

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from engine.cost_model import (
    CostParams, YieldRates, BOMMaterial, ProcessingCost, ProcessingCostItem,
    SGA, calculate, apply_loading_change, apply_material_yield_change,
    apply_labor_change, apply_marginal_profit_target,
    apply_cuts_mask_change, apply_tact_investment_change,
    ALL_REFERENCES, REFERENCE_CASE1, REFERENCE_CASE2,
)
from ai.assistant import AIAssistant, get_scenario, get_surprise_event, get_round_cards, STRATEGY_CARDS
from api.config import settings
from api.database import Database

# ── 로깅 설정 ──

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format='%(asctime)s %(levelname)s %(name)s %(message)s' if not settings.is_production
    else '{"time":"%(asctime)s","level":"%(levelname)s","logger":"%(name)s","msg":"%(message)s"}',
    datefmt='%Y-%m-%dT%H:%M:%S',
)
logger = logging.getLogger("wargame")

# ── 앱 초기화 ──

app = FastAPI(title="개발원가 War Game", version="0.4.0")
_start_time = time.time()

frontend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend")
app.mount("/static", StaticFiles(directory=frontend_dir), name="static")

ai = AIAssistant()
games: dict = {}
db = Database(settings.DB_PATH)

logger.info("Server starting: version=0.4.0 ai_enabled=%s db=%s", ai.ai_enabled, settings.DB_PATH)


# ── 요청 타이밍 미들웨어 ──

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    duration_ms = (time.time() - start) * 1000
    if request.url.path.startswith("/api/"):
        logger.info("%s %s %d %.0fms", request.method, request.url.path, response.status_code, duration_ms)
    return response


# ── 게임 세션 ──

class GameSession:
    def __init__(self, game_id: str, team_names: list[str], total_rounds: int = 3):
        self.game_id = game_id
        self.teams = {name: {"score": 0, "submissions": {}, "tokens": 5, "used_cards": []} for name in team_names}
        self.current_round = 0
        self.total_rounds = total_rounds
        self.status = "lobby"
        self.round_scenario = None
        self.round_cards = []
        self.surprise_event = None
        self.previous_leader = None
        self.created_at = time.time()

    def start_round(self):
        # Save current leader for comeback detection
        if self.current_round > 0:
            lb = self.get_leaderboard()
            self.previous_leader = lb[0]["team"] if lb else None
        self.current_round += 1
        self.status = "playing"
        self.round_scenario = get_scenario(self.current_round)
        self.round_cards = get_round_cards(3)
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
            "team_tokens": {name: data["tokens"] for name, data in self.teams.items()},
            "current_round": self.current_round,
            "total_rounds": self.total_rounds,
            "status": self.status,
            "scenario": self.round_scenario,
            "round_cards": self.round_cards,
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


# ── Pydantic 모델 (입력 검증 강화) ──

class SimulateRequest(BaseModel):
    price: float = Field(200.0, ge=1.0, le=10000.0)
    loading: float = Field(0.70, ge=0.01, le=1.0)
    tft_yield: float = Field(0.99, ge=0.5, le=1.0)
    cf_yield: float = Field(1.0, ge=0.5, le=1.0)
    cell_yield: float = Field(0.95, ge=0.5, le=1.0)
    module_yield: float = Field(0.972, ge=0.5, le=1.0)
    bom_tft: float = Field(6.0, ge=0.0, le=1000.0)
    bom_cf: float = Field(5.0, ge=0.0, le=1000.0)
    bom_cell: float = Field(1.5, ge=0.0, le=1000.0)
    bom_module: float = Field(75.0, ge=0.0, le=1000.0)
    panel_labor: float = Field(21.3, ge=0.0, le=1000.0)
    panel_expense: float = Field(11.5, ge=0.0, le=1000.0)
    panel_depreciation: float = Field(16.2, ge=0.0, le=1000.0)
    module_labor: float = Field(8.7, ge=0.0, le=1000.0)
    module_expense: float = Field(5.3, ge=0.0, le=1000.0)
    module_depreciation: float = Field(7.5, ge=0.0, le=1000.0)
    sga_direct_dev: float = Field(4.7, ge=0.0, le=1000.0)
    sga_transport: float = Field(0.3, ge=0.0, le=1000.0)
    sga_business_unit: float = Field(16.0, ge=0.0, le=1000.0)
    sga_operation: float = Field(1.2, ge=0.0, le=1000.0)
    sga_corporate_oh: float = Field(6.2, ge=0.0, le=1000.0)


class CreateGameRequest(BaseModel):
    team_names: list[str] = Field(..., min_length=2, max_length=6)
    total_rounds: int = Field(3, ge=1, le=10)

    @field_validator("team_names")
    @classmethod
    def validate_team_names(cls, v):
        seen = set()
        for name in v:
            name = name.strip()
            if not name or len(name) > 20:
                raise ValueError("팀 이름은 1~20자여야 합니다")
            if name in seen:
                raise ValueError(f"중복된 팀 이름: {name}")
            seen.add(name)
        return [n.strip() for n in v]


class SubmitRequest(BaseModel):
    team_name: str = Field(..., min_length=1, max_length=20)
    params: SimulateRequest
    card_id: Optional[str] = None


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=500)
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
async def simulate_loading(loading: float = Query(0.50, ge=0.01, le=1.0)):
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
async def simulate_labor(multiplier: float = Query(1.5, ge=0.1, le=10.0)):
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
async def simulate_marginal_profit(target_rate: float = Query(0.60, ge=0.01, le=0.99)):
    base = ALL_REFERENCES[3]
    result = apply_marginal_profit_target(base, target_rate)
    return result


@app.post("/api/simulate/material-yield")
async def simulate_material_yield(
    material_change_pct: float = Query(-0.05, ge=-1.0, le=1.0),
    module_yield_change: float = Query(-0.04, ge=-0.5, le=0.5),
):
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
    new_cuts: int = Query(29, ge=1, le=100),
    new_mask: int = Query(6, ge=1, le=20),
):
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
    tact_multiplier: float = Query(1.2, ge=0.1, le=10.0),
    investment_delta: float = Query(1.9, ge=0.0, le=100.0),
):
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
    db.save_game(game_id, game.status, req.team_names, req.total_rounds, 0)
    logger.info("Game created: id=%s teams=%s rounds=%d", game_id, req.team_names, req.total_rounds)
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
    if game.status == "finished":
        raise HTTPException(400, "이미 종료된 게임입니다")
    if game.current_round >= game.total_rounds and game.status != "lobby":
        raise HTTPException(400, "모든 라운드가 완료되었습니다")
    game.start_round()
    db.update_game_status(game_id, game.status, game.current_round)
    logger.info("Round started: game=%s round=%d", game_id, game.current_round)
    await manager.broadcast(game_id, {"type": "round_start", "data": game.to_dict()})
    return game.to_dict()


def _apply_card_effects(params: SimulateRequest, card_id: Optional[str]) -> SimulateRequest:
    """전략 카드 효과를 파라미터에 적용"""
    if not card_id:
        return params
    card = next((c for c in STRATEGY_CARDS if c["id"] == card_id), None)
    if not card:
        return params

    d = params.model_dump()
    effects = card["effects"]

    if "processing_mult" in effects:
        for k in ["panel_labor", "panel_expense", "panel_depreciation",
                   "module_labor", "module_expense", "module_depreciation"]:
            d[k] *= effects["processing_mult"]
    if "depreciation_add" in effects:
        d["panel_depreciation"] += effects["depreciation_add"] / 2
        d["module_depreciation"] += effects["depreciation_add"] / 2
    if "bom_mult" in effects:
        for k in ["bom_tft", "bom_cf", "bom_cell", "bom_module"]:
            d[k] *= effects["bom_mult"]
    if "labor_mult" in effects:
        d["panel_labor"] *= effects["labor_mult"]
        d["module_labor"] *= effects["labor_mult"]
    if "yield_add" in effects:
        d["module_yield"] = max(0.5, min(1.0, d["module_yield"] + effects["yield_add"]))
    if "loading_add" in effects:
        d["loading"] = max(0.01, min(1.0, d["loading"] + effects["loading_add"]))
    if "expense_add" in effects:
        d["panel_expense"] += effects["expense_add"]

    return SimulateRequest(**d)


def _compute_impact_breakdown(base_params: SimulateRequest, final_params: SimulateRequest) -> dict:
    """각 파라미터 변경의 영업이익 기여도 계산"""
    base_result = calculate(req_to_params(base_params))
    final_result = calculate(req_to_params(final_params))
    base_profit = base_result.operating_profit

    # Isolate each factor's contribution
    breakdown = {}

    # Loading impact
    isolated = base_params.model_dump()
    isolated["loading"] = final_params.loading
    for k in ["panel_labor", "panel_expense", "panel_depreciation",
              "module_labor", "module_expense", "module_depreciation"]:
        isolated[k] = final_params.__dict__[k]
    loading_profit = calculate(req_to_params(SimulateRequest(**isolated))).operating_profit
    breakdown["loading"] = round(loading_profit - base_profit, 1)

    # Material impact
    isolated2 = base_params.model_dump()
    isolated2["bom_module"] = final_params.bom_module
    mat_profit = calculate(req_to_params(SimulateRequest(**isolated2))).operating_profit
    breakdown["material"] = round(mat_profit - base_profit, 1)

    # Yield impact
    isolated3 = base_params.model_dump()
    isolated3["module_yield"] = final_params.module_yield
    yield_profit = calculate(req_to_params(SimulateRequest(**isolated3))).operating_profit
    breakdown["yield"] = round(yield_profit - base_profit, 1)

    # Card impact (residual)
    total_individual = sum(breakdown.values())
    total_actual = round(final_result.operating_profit - base_profit, 1)
    breakdown["card"] = round(total_actual - total_individual, 1)

    return breakdown


@app.post("/api/game/{game_id}/submit")
async def submit_answer(game_id: str, req: SubmitRequest):
    if game_id not in games:
        raise HTTPException(404, "게임을 찾을 수 없습니다")
    game = games[game_id]
    if game.status != "playing":
        raise HTTPException(400, "현재 라운드가 진행 중이 아닙니다")

    # Apply card effects
    base_params = req.params
    final_params = _apply_card_effects(req.params, req.card_id)

    # Track card usage
    if req.card_id and req.team_name in game.teams:
        game.teams[req.team_name]["used_cards"].append(req.card_id)

    # Calculate result with card-modified params
    result = calculate(req_to_params(final_params)).to_dict()
    game.submit(req.team_name, result)
    coaching = ai.generate_coaching(result)

    # Compute impact breakdown
    ref_result = calculate(req_to_params(SimulateRequest()))  # default/reference params
    impact = _compute_impact_breakdown(SimulateRequest(), final_params)

    db.save_submission(game_id, req.team_name, game.current_round,
                       final_params.model_dump(), result)
    logger.info("Submission: game=%s team=%s round=%d profit=%.1f card=%s",
                game_id, req.team_name, game.current_round,
                result.get("operating_profit", 0), req.card_id or "none")

    await manager.broadcast(game_id, {
        "type": "team_submitted",
        "data": {"team": req.team_name, "leaderboard": game.get_leaderboard()},
    })

    response = {
        "result": result,
        "coaching": coaching,
        "impact_breakdown": impact,
        "card_used": req.card_id,
    }

    if game.all_submitted():
        game.end_round()
        db.update_game_status(game_id, game.status, game.current_round)

        # Detect round drama
        lb = game.get_leaderboard()
        drama = _detect_round_drama(game, lb)

        analysis = ai.analyze_teams(
            {name: data["submissions"].get(game.current_round, {})
             for name, data in game.teams.items()}
        )
        await manager.broadcast(game_id, {
            "type": "round_end",
            "data": {**game.to_dict(), "analysis": analysis, "drama": drama},
        })
        response["round_complete"] = True
        response["analysis"] = analysis
        response["game_status"] = game.status
        response["leaderboard"] = lb
        response["drama"] = drama
        logger.info("Round ended: game=%s round=%d status=%s drama=%s",
                    game_id, game.current_round, game.status, drama.get("type", "none"))

    return response


def _detect_round_drama(game: GameSession, lb: list) -> dict:
    """라운드 드라마 감지: 접전, 역전, 대승 등"""
    if len(lb) < 2:
        return {"type": "none"}

    first = lb[0]
    second = lb[1]
    gap = abs(first["operating_profit"] - second["operating_profit"])

    # Check comeback (leader changed)
    current_leader = first["team"]
    if game.previous_leader and game.previous_leader != current_leader:
        return {
            "type": "comeback",
            "message": f"역전! {current_leader} 팀이 {game.previous_leader} 팀을 추월했습니다!",
            "team": current_leader,
        }

    # Close match
    if gap <= 3.0:
        return {
            "type": "close",
            "message": f"접전! {first['team']}과 {second['team']} 팀의 차이가 ${gap:.1f}!",
            "gap": gap,
        }

    # Dominant win
    if gap >= 15.0:
        return {
            "type": "dominant",
            "message": f"{first['team']} 팀이 ${gap:.1f} 차이로 압도적 리드!",
            "team": first["team"],
        }

    return {"type": "normal", "message": f"{first['team']} 팀이 라운드 1위!"}


@app.post("/api/game/{game_id}/surprise")
async def trigger_surprise(game_id: str):
    if game_id not in games:
        raise HTTPException(404, "게임을 찾을 수 없습니다")
    game = games[game_id]
    event = get_surprise_event()
    game.surprise_event = event
    logger.info("Surprise: game=%s event=%s", game_id, event["title"])
    await manager.broadcast(game_id, {"type": "surprise_event", "data": event})
    return event


@app.get("/api/game/{game_id}/leaderboard")
async def get_leaderboard(game_id: str):
    if game_id not in games:
        raise HTTPException(404, "게임을 찾을 수 없습니다")
    return {"leaderboard": games[game_id].get_leaderboard()}


@app.post("/api/game/{game_id}/spend-token")
async def spend_token(game_id: str, team_name: str = Query(...), action: str = Query(...)):
    """토큰 소모 행동: peek (경쟁팀 엿보기, 2토큰), shield (서프라이즈 방어, 1토큰)"""
    if game_id not in games:
        raise HTTPException(404, "게임을 찾을 수 없습니다")
    game = games[game_id]
    if team_name not in game.teams:
        raise HTTPException(400, "존재하지 않는 팀입니다")

    costs = {"peek": 2, "shield": 1}
    if action not in costs:
        raise HTTPException(400, f"유효하지 않은 행동: {action}")

    team_data = game.teams[team_name]
    cost = costs[action]
    if team_data["tokens"] < cost:
        raise HTTPException(400, f"토큰이 부족합니다 (보유: {team_data['tokens']}, 필요: {cost})")

    team_data["tokens"] -= cost
    logger.info("Token spent: game=%s team=%s action=%s remaining=%d", game_id, team_name, action, team_data["tokens"])

    if action == "peek":
        # Return other teams' current round profits
        others = {}
        for name, data in game.teams.items():
            if name != team_name:
                sub = data["submissions"].get(game.current_round)
                others[name] = sub.get("operating_profit", "미제출") if sub else "미제출"
        return {"action": "peek", "data": others, "tokens_remaining": team_data["tokens"]}

    if action == "shield":
        team_data["surprise_immune"] = True
        return {"action": "shield", "tokens_remaining": team_data["tokens"]}

    return {"tokens_remaining": team_data["tokens"]}


@app.get("/api/game/{game_id}/history")
async def get_game_history(game_id: str):
    """과거 게임 기록 조회 (SQLite)"""
    history = db.get_game_history(game_id)
    if not history:
        raise HTTPException(404, "게임 기록을 찾을 수 없습니다")
    return history


@app.get("/api/games")
async def list_games(limit: int = 20):
    """최근 게임 목록"""
    return {"games": db.list_games(limit)}


@app.websocket("/ws/game/{game_id}")
async def websocket_endpoint(websocket: WebSocket, game_id: str):
    await manager.connect(game_id, websocket)
    logger.info("WS connected: game=%s", game_id)
    try:
        if game_id in games:
            await websocket.send_json({"type": "game_state", "data": games[game_id].to_dict()})
        while True:
            raw = await websocket.receive_text()
            try:
                msg = json.loads(raw)
                if msg.get("type") == "ping":
                    await websocket.send_json({"type": "pong"})
            except (json.JSONDecodeError, TypeError):
                pass
    except WebSocketDisconnect:
        manager.disconnect(game_id, websocket)
        logger.info("WS disconnected: game=%s", game_id)


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


@app.post("/api/game/{game_id}/ask-ai")
async def game_ask_ai(game_id: str, req: ChatRequest):
    """라운드 중 AI에게 전략 질문"""
    if game_id not in games:
        raise HTTPException(404, "게임을 찾을 수 없습니다")
    game = games[game_id]
    scenario = game.round_scenario or {}

    context_prompt = (
        f"현재 라운드 {game.current_round}/{game.total_rounds}입니다.\n"
        f"시나리오: {scenario.get('title', '')} — {scenario.get('description', '')}\n"
        f"과제: {scenario.get('challenge', '')}\n"
        f"학습목표: {scenario.get('learning_objective', '')}\n\n"
        f"팀의 질문: {req.message}\n\n"
        "이 시나리오 맥락에서 실무적으로 도움이 되는 힌트를 주되, "
        "정답을 직접 알려주지 말고 사고를 유도하세요. 2-3문장으로 답하세요."
    )

    if ai.ai_enabled:
        try:
            response = ai.client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=400,
                system=(
                    "당신은 디스플레이/반도체 제조업의 개발원가 전문 코치입니다. "
                    "팀이 시뮬레이션 게임 중 전략적 질문을 합니다. "
                    "직접적인 정답보다는 사고의 방향을 제시하세요. 한국어로 답하세요."
                ),
                messages=[{"role": "user", "content": context_prompt}],
            )
            return {"response": response.content[0].text, "ai_powered": True}
        except Exception as e:
            logger.warning("Game AI chat error: %s", e)

    # 템플릿 기반 폴백
    round_hints = {
        1: "Loading이 하락하면 고정비인 가공비가 단위당으로 상승합니다. 가공비 = 고정비 / 생산량이라는 관계를 떠올려보세요. 어떤 항목이 가장 크게 영향받을까요?",
        2: "재료비 절감과 수율 하락은 서로 상충합니다. 소요재료비 = BOM / 누적수율 공식에서, BOM이 줄어도 수율이 떨어지면 소요재료비가 오히려 늘 수 있습니다. 두 효과의 크기를 비교해보세요.",
        3: "복합 위기에서는 한 번에 하나씩 변수를 조정하며 영향도를 파악하는 것이 좋습니다. Price 하락, BOM 상승, 수율 개선 각각의 영업이익 영향을 먼저 분리해서 생각해보세요.",
    }
    return {
        "response": round_hints.get(game.current_round, "원가 구조의 핵심은 COM(제조원가) = 소요재료비 + 가공비입니다. 어떤 항목을 조정하면 가장 큰 효과가 있을지 생각해보세요."),
        "ai_powered": False,
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
        except Exception as e:
            logger.warning("AI chat error: %s", e)

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


# ── Health Check ──

@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "version": "0.4.0",
        "uptime_seconds": round(time.time() - _start_time),
        "active_games": len(games),
        "ai_enabled": ai.ai_enabled,
    }


# ── Startup 이벤트 ──

@app.on_event("startup")
async def startup():
    cleaned = db.cleanup_old_games(settings.GAME_TTL_HOURS)
    if cleaned:
        logger.info("Cleaned up %d old games", cleaned)
