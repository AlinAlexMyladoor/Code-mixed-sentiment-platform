import json
import logging
from typing import Any

from fastapi import WebSocket

logger = logging.getLogger("sentiment_ws_manager")

class ConnectionManager:
    def __init__(self) -> None:
        self.active: list[WebSocket] = []

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active.append(websocket)
        logger.info(f"WebSocket connected. Total active clients: {len(self.active)}")

    def disconnect(self, websocket: WebSocket) -> None:
        if websocket in self.active:
            self.active.remove(websocket)
            logger.info(f"WebSocket disconnected. Total active clients: {len(self.active)}")

    async def broadcast(self, message: dict[str, Any]) -> None:
        dead: list[WebSocket] = []
        payload = json.dumps(message)
        logger.info(f"Broadcasting message to {len(self.active)} clients: {payload[:200]}")
        for connection in self.active:
            try:
                await connection.send_text(payload)
            except Exception as e:
                logger.error(f"Error sending message to client: {e}")
                dead.append(connection)
        for connection in dead:
            self.disconnect(connection)


manager = ConnectionManager()
