from pydantic import BaseModel, Field
from typing import List, Optional, Literal


class SessionInit(BaseModel):
    session_id: str
    hero_name: str
    world_name: str
    genre: Literal["fantasy", "adventure", "mystery", "space"] = "fantasy"
    animal: Optional[str] = None  # e.g. "cow", "lion" — optional animal companion


class UserInput(BaseModel):
    session_id: str
    input_type: Literal["choice", "text", "voice_text"]
    content: str


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


class SessionMemory(BaseModel):
    session_id: str
    hero_name: str
    world_name: str
    genre: str
    animal: Optional[str] = None        # animal companion for the story
    last_image_prompt: str = ""         # stored for video generation
    scene_number: int = 0
    history: List[dict] = []


class StoryResponse(BaseModel):
    type: str = "scene"
    session_id: str
    scene_number: int
    scene_text: str
    image_url: Optional[str] = None
    audio_base64: Optional[str] = None
    choices: List[str]
