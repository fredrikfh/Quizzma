import logging
from typing import Annotated
from dotenv import load_dotenv
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.internal.session_manager import SessionManager
from firebase_admin import auth
import cachetools

from typing import Generator
from sqlmodel import Session
from .database.setup import SessionLocal

logger = logging.getLogger("app")

load_dotenv()

def get_db_session() -> Generator[Session, None, None]:
    """Get a new database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Cache for token verification
token_cache = cachetools.TTLCache(
    maxsize=1000, ttl=300
)  # Cache up to 1000 tokens for 5 minutes


def verify_firebase_token(token: str) -> str:
    """Verify Firebase token with caching to reduce Firebase calls."""
    if token in token_cache:
        return token_cache[token]

    try:
        decoded_token = auth.verify_id_token(token)
        user_id: str = decoded_token.get("uid")
        if not user_id:
            raise ValueError("Token has no 'uid'")

        # Store result in cache
        token_cache[token] = user_id
        return user_id

    except Exception as e:
        logger.error("Firebase token verification failed", exc_info=True)
        raise HTTPException(
            status_code=403,
            detail=f"Authentication failed: {e}",
        )


async def authenticate(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(HTTPBearer())],
) -> str:
    """Authenticate user using Firebase ID token."""
    session_token = credentials.credentials
    user_id = verify_firebase_token(session_token)
    logger.info("Authentication successful", extra={"user_id": user_id})
    return user_id


_session_manager = SessionManager()


async def get_session_manager() -> SessionManager:
    """Retrieves a singleton instance of the SessionManger"""
    return _session_manager
