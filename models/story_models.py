from pydantic import BaseModel, Field
from typing import List, Optional, Literal


# ── What the frontend sends to START a story ──────────────────────────────────
class SessionInit(BaseModel):
    session_id: str
    hero_name: str
    world_name: str
    genre: Literal["fantasy", "adventure", "mystery", "space"] = "fantasy"


# ── What the frontend sends when the child picks a choice or types ─────────────
class UserInput(BaseModel):
    session_id: str
    input_type: Literal["choice", "text", "voice_text"]
    content: str  # e.g. "I want to go into the forest" or choice "1"


# ── Gemini will return EXACTLY this structure (structured JSON output) ─────────
class StoryScene(BaseModel):
    scene_text: str = Field(
        description="Story narrative in 2-3 short, vivid paragraphs. Child-friendly language."
    )
    image_prompt: str = Field(
        description="Detailed visual description of the scene for image generation."
    )
    choices: List[str] = Field(
        description="Exactly 3 choices for what the hero does next."
    )


# ── Internal session memory stored on the server ──────────────────────────────
class SessionMemory(BaseModel):
    session_id: str
    hero_name: str
    world_name: str
    genre: str
    scene_number: int = 0
    # Each entry: {"role": "user" or "story", "content": "..."}
    history: List[dict] = []


# ── What the backend sends back to the frontend ────────────────────────────────
class StoryResponse(BaseModel):
    type: str = "scene"
    session_id: str
    scene_number: int
    scene_text: str
    image_url: Optional[str] = None       # base64 data URI or None
    audio_base64: Optional[str] = None    # base64 data URI or None
    choices: List[str]
