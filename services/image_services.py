"""
Generates story illustrations using Gemini 2.5 Flash Image —
returns a locally-served /images/<filename>.png URL.
"""
import uuid
import asyncio
from pathlib import Path
from google import genai
from google.genai import types
from config import GEMINI_API_KEY, IMAGE_MODEL

# Folder where generated PNGs are saved (served at /images/ by main.py)
IMAGES_DIR = Path("images_temp")
IMAGES_DIR.mkdir(exist_ok=True)

_client = genai.Client(api_key=GEMINI_API_KEY)


async def generate_image(image_prompt: str) -> str | None:
    """
    Generate a children's storybook illustration with Gemini 2.5 Flash Image.
    Returns a URL path like /images/<uuid>.png, or None on failure.
    """
    try:
        styled_prompt = (
            "Children's storybook illustration, colorful cartoon style, "
            "vibrant and safe for kids, digital art: "
            + image_prompt[:300]
        )

        # Gemini image generation is synchronous — run in thread to stay async
        response = await asyncio.to_thread(
            _client.models.generate_content,
            model=IMAGE_MODEL,
            contents=[styled_prompt],
            config=types.GenerateContentConfig(
                response_modalities=["IMAGE", "TEXT"],
            ),
        )

        for part in response.candidates[0].content.parts:
            if part.inline_data is not None:
                filename = f"{uuid.uuid4().hex}.png"
                filepath = IMAGES_DIR / filename
                filepath.write_bytes(part.inline_data.data)
                return f"/images/{filename}"

        print("[image_services] Gemini returned no image data.")
        return None

    except Exception as e:
        print(f"[image_services] Image generation failed: {e}")
        return None
