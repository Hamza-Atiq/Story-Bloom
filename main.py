from fastapi import FastAPI, WebSocket
from api.websocket import websocket_handler

app = FastAPI(title = "Storyteller", description = "A storyteller app")

@app.get("/")
async def root():
    return {"message": "StoryBloom backend is running"}

@app.websocket("/ws/story")

async def story_ws(ws: WebSocket):

    await websocket_handler(ws)

