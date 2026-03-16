"""
Entry point for the StoryBloom backend.
"""
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from api.routes import router
from api.websocket import story_websocket_handler, voice_websocket_handler

app = FastAPI(
    title="StoryBloom",
    description="AI-powered interactive storyteller for children",
    version="1.0.0",
)

# ── CORS: allow the Next.js frontend to connect ───────────────────────────────
# In production, replace "*" with your frontend URL e.g. "https://storybloom.vercel.app"
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Serve generated audio files at /audio/filename.mp3 ───────────────────────
audio_dir = Path("audio_temp")
audio_dir.mkdir(exist_ok=True)
app.mount("/audio", StaticFiles(directory=audio_dir), name="audio")

# ── Serve generated images at /images/filename.png ───────────────────────────
images_dir = Path("images_temp")
images_dir.mkdir(exist_ok=True)
app.mount("/images", StaticFiles(directory=images_dir), name="images")

# ── HTTP routes ───────────────────────────────────────────────────────────────
app.include_router(router)

@app.get("/", tags=["Health"])
async def root():
    return {
        "status": "running",
        "app": "StoryBloom",
        "endpoints": {
            "create_session": "POST /api/session",
            "session_info": "GET /api/session/{session_id}",
            "story_websocket": "WS /ws/story",
            "voice_websocket": "WS /ws/voice/{session_id}",
        },
    }


# ── WebSocket routes ──────────────────────────────────────────────────────────

@app.websocket("/ws/story")
async def story_ws(ws: WebSocket):
    """WebSocket for text and choice-based story interaction."""
    await story_websocket_handler(ws)


@app.websocket("/ws/voice/{session_id}")
async def voice_ws(ws: WebSocket, session_id: str):
    """WebSocket for raw microphone audio via Gemini Live API."""
    await voice_websocket_handler(ws, session_id)
