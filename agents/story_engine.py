"""
The brain of the storytelling pipeline.

It connects:
  memory_agent  → knows what happened in the story so far
  gemini_agent  → calls Gemini to generate the next scene
  prompts       → builds the right prompt for each situation

Two main functions:
  start_story()    → generates the very first scene
  continue_story() → generates the next scene based on the child's choice
"""
from agents.gemini_agent import generate_story_scene
from agents.memory_agent import get_session, add_to_history, get_history_text, increment_scene
from utils.prompts import SYSTEM_PROMPT, build_start_prompt, build_continue_prompt
from models.story_models import StoryScene

async def start_story(session_id: str) -> StoryScene:
    """
    Generate the opening scene of the story.
    Called once when the child first starts a new adventure.
    """
    session = get_session(session_id)
    if not session:
        raise ValueError(f"Session '{session_id}' not found. Call create_session first.")

    prompt = build_start_prompt(
        hero_name=session.hero_name,
        world_name=session.world_name,
        genre=session.genre,
    )

    scene = await generate_story_scene(prompt, SYSTEM_PROMPT)

    # Save the AI's story output to memory
    add_to_history(session_id, "story", scene.scene_text)
    increment_scene(session_id)

    return scene


async def continue_story(session_id: str, user_input: str) -> StoryScene:
    """
    Generate the next scene based on what the child chose or said.

    """
    session = get_session(session_id)
    if not session:
        raise ValueError(f"Session '{session_id}' not found.")

    # Get formatted history to give Gemini context
    history = get_history_text(session_id)

    # Save child's input to memory BEFORE generating
    add_to_history(session_id, "user", user_input)

    prompt = build_continue_prompt(
        hero_name=session.hero_name,
        world_name=session.world_name,
        genre=session.genre,
        history=history,
        user_input=user_input,
    )

    scene = await generate_story_scene(prompt, SYSTEM_PROMPT)

    # Save AI's response to memory
    add_to_history(session_id, "story", scene.scene_text)
    increment_scene(session_id)

    return scene
