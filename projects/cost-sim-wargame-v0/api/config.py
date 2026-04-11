"""
환경 설정 (Pydantic BaseSettings)
"""

import os


class Settings:
    """환경변수 기반 설정. python-dotenv 없이도 동작."""

    def __init__(self):
        self.HOST: str = os.environ.get("HOST", "0.0.0.0")
        self.PORT: int = int(os.environ.get("PORT", "8000"))
        self.RELOAD: bool = os.environ.get("RELOAD", "true").lower() == "true"
        self.LOG_LEVEL: str = os.environ.get("LOG_LEVEL", "INFO")
        self.DB_PATH: str = os.environ.get("DB_PATH", "data/wargame.db")
        self.ANTHROPIC_API_KEY: str = os.environ.get("ANTHROPIC_API_KEY", "")
        self.MAX_TEAMS: int = int(os.environ.get("MAX_TEAMS", "6"))
        self.ROUND_DURATION: int = int(os.environ.get("ROUND_DURATION", "180"))
        self.GAME_TTL_HOURS: int = int(os.environ.get("GAME_TTL_HOURS", "24"))

    @property
    def is_production(self) -> bool:
        return not self.RELOAD


settings = Settings()
