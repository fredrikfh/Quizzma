from fastapi import APIRouter, WebSocket

router = APIRouter()


@router.websocket("/responses")
async def responses(websocket: WebSocket):
    await websocket.accept()


@router.websocket("/analysis")
async def analysis(websocket: WebSocket):
    await websocket.accept()


@router.websocket("/session")
async def session(websocket: WebSocket):
    await websocket.accept()
