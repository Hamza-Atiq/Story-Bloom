"""
The brain of the storytelling pipeline.
"""
from agents.gemini_agent import generate_story_scene
from agents.memory_agent import get_session, add_to_history, get_history_text, increment_scene
from utils.prompts import SYSTEM_PROMPT, build_start_prompt, build_continue_prompt
from models.story_models import StoryScene


async def start_story(session_id: str) -> StoryScene:
    session = get_session(session_id)
    if not session:
        raise ValueError(f"Session '{session_id}' not found. Call create_session first.")

    prompt = build_start_prompt(
        hero_name=session.hero_name,
        world_name=session.world_name,
        genre=session.genre,
        animal=session.animal,
    )

    scene = await generate_story_scene(prompt, SYSTEM_PROMPT)
    add_to_history(session_id, "story", scene.scene_text)
    increment_scene(session_id)
    return scene


async def continue_story(session_id: str, user_input: str) -> StoryScene:
    session = get_session(session_id)
    if not session:
        raise ValueError(f"Session '{session_id}' not found.")

    history = get_history_text(session_id)
    add_to_history(session_id, "user", user_input)

    prompt = build_continue_prompt(
        hero_name=session.hero_name,
        world_name=session.world_name,
        genre=session.genre,
        history=history,
        user_input=user_input,
        animal=session.animal,
    )

    scene = await generate_story_scene(prompt, SYSTEM_PROMPT)
    add_to_history(session_id, "story", scene.scene_text)
    increment_scene(session_id)
    return scene
