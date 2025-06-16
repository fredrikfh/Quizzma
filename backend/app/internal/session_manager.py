import asyncio
import logging
import random
import uuid

from fastapi import WebSocket

from app.internal.session import Session
from app.internal.ws_helpers import (
    SessionErrorPayload,
    ServerSessionMessageType,
    send_session_message,
)


logger = logging.getLogger("app")


class SessionManager:

    sessions: dict[str, Session] = {}

    async def create_session(self, user_id: str, quiz_id: uuid.UUID) -> Session | None:
        """Create a new active session with a random session id"""
        # Generate a unique 4-digit session ID
        tries = 0
        while (session_id := f"{random.randint(1000, 9999)}") in self.sessions:
            tries += 1
            if tries >= 100:
                return

        session = Session(id=session_id, owner_id=user_id, quiz_id=quiz_id)
        self.sessions[session.id] = session
        logger.info("New session created", extra={"session_id": session.id})

        return session

    async def get_session(self, session_id: str) -> Session | None:
        """Retrieve a session by id"""
        return self.sessions.get(session_id, None)

    async def get_session_from_quiz(self, quiz_id: uuid.UUID) -> Session | None:
        """Retrieve a session by quiz id"""
        for session in self.sessions.values():
            if session.quiz_id == quiz_id:
                return session
        return None

    async def kill_session(self, session: Session) -> None:
        """Closes all related connections and removes the session from the manager"""
        await session.shut_down()
        self.sessions.pop(session.id, None)
        logger.debug(
            "Session killed",
            extra={"session_id": session.id, "owner_id": session.owner_id},
        )

    async def join_session(self, session_id: str, connection: WebSocket) -> Session:
        """Add a websocket connection to a session"""
        session = await self.get_session(session_id=session_id)
        if not session:
            logger.debug(
                "Tried connecting to a non-existant session",
                extra={"session_id": session_id},
            )
            return

        session.register_connection(connection)
        logger.debug(
            "New connection added to session",
            extra={"session_id": session_id},
        )

        return session

    async def leave_session(self, session_id: str, connection: WebSocket) -> None:
        session = await self.get_session(session_id=session_id)
        if not session:
            return

        try:
            session.remove_connection(connection)
            logger.debug(
                "Removed connection from session",
                extra={"session_id": session_id},
            )
        except ValueError:
            logger.debug(
                "Connection was already removed from session",
                extra={"session_id": session_id},
            )

    async def broadcast(
        self,
        session: Session,
        message_type: ServerSessionMessageType = ServerSessionMessageType.Sync,
        error: SessionErrorPayload | None = None,
    ) -> None:
        """Broadcast a message to all clients connected to a specific session"""
        for connection in session.connections:
            await send_session_message(
                socket=connection,
                session=session,
                message_type=message_type,
                error=error,
            )
