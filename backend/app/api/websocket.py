"""WebSocket for real-time events."""
import asyncio
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from backend.app.core.message_bus import message_bus
import structlog

logger = structlog.get_logger()
router = APIRouter()

# Only these event prefixes may be published by WebSocket clients.
# This prevents clients from impersonating system/agent/workflow events.
ALLOWED_CLIENT_EVENTS = frozenset({"client.message", "client.ping"})

# Maximum incoming message size (bytes) to prevent memory exhaustion
MAX_MESSAGE_SIZE = 4096


class ConnectionManager:
    def __init__(self):
        self.active: list[WebSocket] = []
        self._lock = asyncio.Lock()

    async def connect(self, ws: WebSocket):
        await ws.accept()
        async with self._lock:
            self.active.append(ws)

    async def disconnect(self, ws: WebSocket):
        async with self._lock:
            try:
                self.active.remove(ws)
            except ValueError:
                pass

    async def broadcast(self, data: dict):
        async with self._lock:
            snapshot = self.active[:]
        for ws in snapshot:
            try:
                await ws.send_json(data)
            except Exception:
                async with self._lock:
                    try:
                        self.active.remove(ws)
                    except ValueError:
                        pass


manager = ConnectionManager()


async def _ws_handler(message: dict):
    await manager.broadcast(message)

message_bus.subscribe("workflow.*", _ws_handler)
message_bus.subscribe("agent.*", _ws_handler)
message_bus.subscribe("approval.*", _ws_handler)


@router.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await manager.connect(ws)
    try:
        while True:
            data = await ws.receive_text()
            # Reject oversized messages
            if len(data) > MAX_MESSAGE_SIZE:
                await ws.send_json({"error": "Message too large"})
                continue
            # Handle incoming messages (e.g., commands from frontend)
            try:
                msg = json.loads(data)
                event_name = msg.get("event", "client.message")
                # Only allow whitelisted event prefixes from clients
                if event_name not in ALLOWED_CLIENT_EVENTS:
                    await ws.send_json({"error": f"Event '{event_name}' not allowed from clients"})
                    continue
                await message_bus.publish(event_name, msg.get("data"), source="client")
            except json.JSONDecodeError:
                await ws.send_json({"error": "Invalid JSON"})
    except WebSocketDisconnect:
        await manager.disconnect(ws)
    except Exception:
        await manager.disconnect(ws)
