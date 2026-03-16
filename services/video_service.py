"""
Generates an 8-second animated video for the story scene using Google Veo 2.
Video generation takes 30-90 seconds — only triggered by explicit user request.
"""
import asyncio
import uuid
import time
from pathlib import Path
from google import genai
from google.genai import types
from config import GEMINI_API_KEY, VIDEO_MODEL

VIDEOS_DIR = Path("videos_temp")
VIDEOS_DIR.mkdir(exist_ok=True)

_client = genai.Client(api_key=GEMINI_API_KEY)


async def generate_video(
    hero_name: str,
    world_name: str,
    genre: str,
    animal: str | None = None,
    image_prompt: str = "",
) -> str | None:
    """
    Generate an 8-second children's story video using Veo 2.
    Returns a URL path like /videos/<uuid>.mp4, or None on failure.
    This is slow (30-90s) — only call when the user explicitly requests it.
    """
    try:
        # Build a rich video prompt
        animal_part = f" A friendly {animal} is the main character." if animal else ""
        scene_detail = f" Scene: {image_prompt[:300]}" if image_prompt else ""

        video_prompt = (
            f"Children's colorful storybook animation, cartoon style, safe for kids, "
            f"magical and enchanting. Hero named {hero_name} in {world_name}, "
            f"{genre} adventure.{animal_part}{scene_detail} "
            f"Smooth animation, vibrant colors, warm lighting, 8 seconds."
        )

        filename = await asyncio.to_thread(_sync_generate_video, video_prompt)
        return f"/videos/{filename}" if filename else None

    except Exception as e:
        print(f"[video_service] Video generation failed: {e}")
        return None


def _sync_generate_video(prompt: str) -> str | None:
    """Synchronous Veo call — runs in thread pool."""
    try:
        operation = _client.models.generate_videos(
            model=VIDEO_MODEL,
            prompt=prompt,
            config=types.GenerateVideosConfig(
                number_of_videos=1,
                duration_seconds=8,
                aspect_ratio="16:9",
                enhance_prompt=True,
            ),
        )

        # Poll every 10 seconds, max 6 minutes
        max_polls = 36
        for _ in range(max_polls):
            if operation.done:
                break
            time.sleep(10)
            operation = _client.operations.get(operation)

        if not operation.done:
            print("[video_service] Timed out waiting for Veo video")
            return None

        generated_video = operation.response.generated_videos[0]
        filename = f"{uuid.uuid4().hex}.mp4"
        filepath = VIDEOS_DIR / filename

        # Try SDK file download first, fall back to httpx
        try:
            import httpx
            video_uri = generated_video.video.uri
            r = httpx.get(
                video_uri,
                headers={"X-Goog-Api-Key": GEMINI_API_KEY},
                timeout=120.0,
            )
            r.raise_for_status()
            filepath.write_bytes(r.content)
        except Exception:
            # Fallback: try SDK download
            video_bytes = _client.files.download(file=generated_video.video)
            filepath.write_bytes(video_bytes)

        return filename

    except Exception as e:
        print(f"[video_service] _sync_generate_video error: {e}")
        return None
