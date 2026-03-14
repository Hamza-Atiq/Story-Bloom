"""
Handles all communication with the Gemini API for story generation.

"""
from google import genai
from google.genai import types
from config import GEMINI_API_KEY, STORY_MODEL
from models.story_models import StoryScene

client = genai.Client(api_key=GEMINI_API_KEY)

async def generate_story_scene(prompt: str, system_prompt: str) -> StoryScene:
    """
    Send a prompt to Gemini and get back a structured StoryScene.
    """
    try:
        response = await client.aio.models.generate_content(
            model=STORY_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                response_mime_type="application/json",
                response_schema=StoryScene,
                temperature=0.9,
            ),
        )
        return StoryScene.model_validate_json(response.text)

    except Exception as e:
        error_msg = str(e)
        if "429" in error_msg or "RESOURCE_EXHAUSTED" in error_msg:
            raise RuntimeError(
                f"Gemini API quota exceeded for model '{STORY_MODEL}'. "
            )
        raise
