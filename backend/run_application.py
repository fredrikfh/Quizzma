import os
from dotenv import load_dotenv
import uvicorn

from app.main import app
from app.logger import logging_config

load_dotenv()

if __name__ == "__main__":
    hostname = os.getenv("FASTAPI_HOST", "127.0.0.1")
    port = int(os.getenv("FASTAPI_PORT", 8000))
    log_level = "debug" if os.getenv("DEBUG", False) == "true" else "info"

    uvicorn.run(
        app,
        host=hostname,
        port=port,
        log_level=log_level,
        log_config=logging_config,
    )
