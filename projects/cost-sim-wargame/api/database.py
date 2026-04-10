"""
SQLite 데이터 영속성 (Python 내장 sqlite3)
"""

import sqlite3
import json
import time
import os
from typing import Optional


class Database:
    def __init__(self, db_path: str = "data/wargame.db"):
        os.makedirs(os.path.dirname(db_path) if os.path.dirname(db_path) else ".", exist_ok=True)
        self.db_path = db_path
        self._init_schema()

    def _conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        return conn

    def _init_schema(self):
        with self._conn() as conn:
            conn.executescript("""
                CREATE TABLE IF NOT EXISTS games (
                    game_id TEXT PRIMARY KEY,
                    status TEXT NOT NULL DEFAULT 'lobby',
                    team_names TEXT NOT NULL,
                    total_rounds INTEGER NOT NULL DEFAULT 3,
                    current_round INTEGER NOT NULL DEFAULT 0,
                    created_at REAL NOT NULL,
                    updated_at REAL NOT NULL
                );

                CREATE TABLE IF NOT EXISTS round_submissions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    game_id TEXT NOT NULL,
                    team_name TEXT NOT NULL,
                    round_num INTEGER NOT NULL,
                    params_json TEXT,
                    result_json TEXT,
                    score_awarded INTEGER DEFAULT 0,
                    submitted_at REAL NOT NULL,
                    FOREIGN KEY (game_id) REFERENCES games(game_id),
                    UNIQUE(game_id, team_name, round_num)
                );

                CREATE INDEX IF NOT EXISTS idx_submissions_game
                    ON round_submissions(game_id, round_num);
            """)

    def save_game(self, game_id: str, status: str, team_names: list[str],
                  total_rounds: int, current_round: int):
        now = time.time()
        with self._conn() as conn:
            conn.execute("""
                INSERT INTO games (game_id, status, team_names, total_rounds, current_round, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(game_id) DO UPDATE SET
                    status=excluded.status,
                    current_round=excluded.current_round,
                    updated_at=excluded.updated_at
            """, (game_id, status, json.dumps(team_names), total_rounds, current_round, now, now))

    def update_game_status(self, game_id: str, status: str, current_round: int):
        with self._conn() as conn:
            conn.execute(
                "UPDATE games SET status=?, current_round=?, updated_at=? WHERE game_id=?",
                (status, current_round, time.time(), game_id)
            )

    def save_submission(self, game_id: str, team_name: str, round_num: int,
                        params: dict, result: dict, score: int = 0):
        with self._conn() as conn:
            conn.execute("""
                INSERT INTO round_submissions (game_id, team_name, round_num, params_json, result_json, score_awarded, submitted_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(game_id, team_name, round_num) DO UPDATE SET
                    params_json=excluded.params_json,
                    result_json=excluded.result_json,
                    score_awarded=excluded.score_awarded,
                    submitted_at=excluded.submitted_at
            """, (game_id, team_name, round_num, json.dumps(params), json.dumps(result), score, time.time()))

    def get_game_history(self, game_id: str) -> Optional[dict]:
        with self._conn() as conn:
            game = conn.execute("SELECT * FROM games WHERE game_id=?", (game_id,)).fetchone()
            if not game:
                return None
            submissions = conn.execute(
                "SELECT * FROM round_submissions WHERE game_id=? ORDER BY round_num, submitted_at",
                (game_id,)
            ).fetchall()
            return {
                "game_id": game["game_id"],
                "status": game["status"],
                "team_names": json.loads(game["team_names"]),
                "total_rounds": game["total_rounds"],
                "current_round": game["current_round"],
                "created_at": game["created_at"],
                "submissions": [
                    {
                        "team_name": s["team_name"],
                        "round_num": s["round_num"],
                        "result": json.loads(s["result_json"]) if s["result_json"] else None,
                        "score": s["score_awarded"],
                    }
                    for s in submissions
                ],
            }

    def list_games(self, limit: int = 20) -> list[dict]:
        with self._conn() as conn:
            rows = conn.execute(
                "SELECT game_id, status, team_names, total_rounds, current_round, created_at "
                "FROM games ORDER BY created_at DESC LIMIT ?",
                (limit,)
            ).fetchall()
            return [
                {
                    "game_id": r["game_id"],
                    "status": r["status"],
                    "team_names": json.loads(r["team_names"]),
                    "total_rounds": r["total_rounds"],
                    "current_round": r["current_round"],
                    "created_at": r["created_at"],
                }
                for r in rows
            ]

    def cleanup_old_games(self, ttl_hours: int = 24):
        cutoff = time.time() - ttl_hours * 3600
        with self._conn() as conn:
            old_ids = [r["game_id"] for r in conn.execute(
                "SELECT game_id FROM games WHERE created_at < ?", (cutoff,)
            ).fetchall()]
            if old_ids:
                placeholders = ",".join("?" * len(old_ids))
                conn.execute(f"DELETE FROM round_submissions WHERE game_id IN ({placeholders})", old_ids)
                conn.execute(f"DELETE FROM games WHERE game_id IN ({placeholders})", old_ids)
            return len(old_ids)
