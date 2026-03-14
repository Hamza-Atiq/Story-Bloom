from agents.memory_agent import get_memory, update_memory
from utils.prompts import STORY_PROMPT
from models.story_models import StoryResponse
from typing import Callable

async def build_prompt(session_id: str, user_input: str) -> str:

    memory = "\n".join(get_memory(session_id))

    return STORY_PROMPT.format(memory= memory, input= user_input)

async def process_story(session_id: str, user_input: str, gemini_fn: Callable) -> StoryResponse:
    prompt = await build_prompt(session_id, user_input)

    story_text = await gemini_fn(prompt)

    update_memory(session_id, user_input)

    return story_text