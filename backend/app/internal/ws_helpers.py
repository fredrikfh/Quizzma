from enum import Enum
from humps import camelize, decamelize

from fastapi import WebSocket
from pydantic import BaseModel, ConfigDict

from app.internal.session import Session


class ClientSessionMessageType(str, Enum):
    """Websocket message types sent by client to server"""

    Answer = "answer"


class ClientSessionMessage(BaseModel):
    """A websocket message sent by client to server"""

    type: ClientSessionMessageType
    payload: dict | None

    model_config = ConfigDict(use_enum_values=True)


async def receive_session_message(socket: WebSocket) -> ClientSessionMessage:
    """Receive a session websocket message, parse and validate it"""
    message = await socket.receive_json()
    message = decamelize(message)
    message = ClientSessionMessage.model_validate(message)
    return message


class ServerSessionMessageType(str, Enum):
    """Websocket message types sent by server to client"""

    Sync = "sync"
    Error = "error"


class SessionErrorPayload(BaseModel):
    """Websocket payload containing information on an error"""

    message: str
    details: str | None = None


class ServerSessionMessage(BaseModel):
    """A websocket message sent by server to client"""

    type: ServerSessionMessageType
    session: dict
    error: dict | None

    model_config = ConfigDict(use_enum_values=True)


async def send_session_message(
    socket: WebSocket,
    session: Session,
    message_type: ServerSessionMessageType = ServerSessionMessageType.Sync,
    error: SessionErrorPayload | None = None,
) -> None:
    """Send a session websocket message as json with camelCase keys"""
    session_public = session.get_public()
    session_public = session_public.model_dump()
    session_public = camelize(session_public)

    if error is not None:
        message_type = ServerSessionMessageType.Error
        error = error.model_dump()
        error = camelize(error)

    message = ServerSessionMessage(
        type=message_type,
        session=session_public,
        error=error,
    )
    message = message.model_dump_json()
    await socket.send_text(message)
