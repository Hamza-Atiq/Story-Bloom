from pydantic import BaseModel
from typing import List
from pydantic import Field

class Story(BaseModel):
    session_id: str
    hero_name: str = Field(description="The name of the hero in the story")
    world_name: str = Field(description="The name of the world in the story")
    past_events: List[str] = Field(description="The past events in the story")

class StoryResponse(BaseModel):
    scene_text: str = Field(description="The text of the current scene")
    narrations: str = Field(description="The narrations of the story")
    image_prompt: str = Field(description="The prompt for the image generation")
    choices: List[str] = Field(description="The choices for the next scene")

    
