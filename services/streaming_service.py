"""
Helper functions for sending WebSocket messages.

"""
import json
from fastapi import WebSocket


async def send_json(ws: WebSocket, data: dict) -> None:
    """Send a JSON message to the WebSocket client."""
    await ws.send_text(json.dumps(data))


async def send_error(ws: WebSocket, message: str) -> None:
    """Send an error message to the client."""
    await send_json(ws, {"type": "error", "message": message})


async def send_status(ws: WebSocket, status: str) -> None:
    """
    Send a status update so the frontend can show a loading indicator.
    """
    await send_json(ws, {"type": "status", "status": status})
