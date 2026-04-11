"""서버 실행 스크립트"""
import uvicorn
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from api.config import settings

if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    uvicorn.run(
        "api.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.RELOAD,
        log_level=settings.LOG_LEVEL.lower(),
    )
