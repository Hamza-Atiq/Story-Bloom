import json
from fastapi import WebSocket

async def send_json(ws : WebSocket, data: dict) -> None:

    await ws.send_text(json.dumps(data))