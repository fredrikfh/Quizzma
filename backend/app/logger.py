from logging.config import dictConfig
import os

from dotenv import load_dotenv

load_dotenv()

logging_config = dictConfig(
    {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "default": {
                "()": "uvicorn.logging.DefaultFormatter",
                "fmt": "%(levelprefix)s %(message)s",
                "use_colors": None,
            },
            "access": {
                "()": "uvicorn.logging.AccessFormatter",
                "fmt": '%(levelprefix)s %(client_addr)s - "%(request_line)s" %(status_code)s',
            },
            "betterstack": {"()": "logtail.LogtailFormatter"},
        },
        "handlers": {
            "default": {
                "formatter": "default",
                "class": "logging.StreamHandler",
                "stream": "ext://sys.stderr",
            },
            "access": {
                "formatter": "access",
                "class": "logging.StreamHandler",
                "stream": "ext://sys.stdout",
            },
            "betterstack": {
                "formatter": "betterstack",
                "class": "logtail.LogtailHandler",
                "source_token": os.getenv("SOURCE_TOKEN", ""),
            },
        },
        "loggers": {
            "processing": {
                "handlers": ["default", "betterstack"],
                "level": "DEBUG",
                "propagate": False,
            },
            "app": {
                "handlers": ["default", "betterstack"],
                "level": "DEBUG",
                "propagate": False,
            },
            "uvicorn": {
                "handlers": ["default"],
                "level": "INFO",
                "propagate": False,
            },
            "uvicorn.error": {
                "level": "INFO",
            },
            "uvicorn.access": {
                "handlers": ["access"],
                "level": "INFO",
                "propagate": False,
            },
        },
    }
)
"""
- Extension of the Uvicorn LOGGING_CONFIG.
- Creates an app logger for custom logging that sends logs to betterstack: access with logging.getLogger("app")
"""
