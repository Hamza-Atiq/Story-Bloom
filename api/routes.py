"""
HTTP REST endpoints for StoryBloom.
"""
import asyncio
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from models.story_models import SessionInit, StoryResponse
from agents.memory_agent import create_session, get_session, update_last_image_prompt
from agents.story_engine import start_story
from services.image_services import generate_image
from services.tts_service import generate_audio
from services.video_service import generate_video
from services.animal_sound_service import get_animal_sound_bytes, ANIMAL_SEARCH_TERMS

router = APIRouter(prefix="/api", tags=["Story"])


@router.post("/session", response_model=StoryResponse, summary="Start a new story")
async def create_story_session(data: SessionInit):
    create_session(
        session_id=data.session_id,
        hero_name=data.hero_name,
        world_name=data.world_name,
        genre=data.genre,
        animal=data.animal,
    )

    scene = await start_story(data.session_id)

    # Store image_prompt for video generation later
    update_last_image_prompt(data.session_id, scene.image_prompt)

    image_url, audio_url = await asyncio.gather(
        generate_image(scene.image_prompt),
        generate_audio(scene.scene_text),
    )

    session = get_session(data.session_id)

    return StoryResponse(
        session_id=data.session_id,
        scene_number=session.scene_number,
        scene_text=scene.scene_text,
        image_url=image_url,
        audio_base64=audio_url,
        choices=scene.choices,
    )


@router.get("/session/{session_id}", summary="Get session info")
async def get_session_info(session_id: str):
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return {
        "session_id": session.session_id,
        "hero_name": session.hero_name,
        "world_name": session.world_name,
        "genre": session.genre,
        "animal": session.animal,
        "scene_number": session.scene_number,
        "history_length": len(session.history),
    }


@router.post("/video/{session_id}", summary="Generate a scene video with Veo")
async def generate_scene_video(session_id: str):
    """
    Generate an 8-second animated video for the current story scene.
    This is slow (30-90 seconds) and only triggered when the child clicks
    the 'Watch Video' button.
    """
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    video_url = await generate_video(
        hero_name=session.hero_name,
        world_name=session.world_name,
        genre=session.genre,
        animal=session.animal,
        image_prompt=session.last_image_prompt,
    )

    if not video_url:
        raise HTTPException(status_code=500, detail="Video generation failed. Please try again.")

    return {"video_url": video_url}


@router.get("/animal-sound/{animal_id}", summary="Get real animal sound audio")
async def get_animal_sound(animal_id: str):
    """
    Fetches a real animal sound recording from Wikimedia Commons and
    streams it back to the browser. Results are cached in memory.

    The backend handles the Wikimedia HTTP request server-side,
    so there are no CORS issues for the frontend.
    """
    if animal_id not in ANIMAL_SEARCH_TERMS:
        raise HTTPException(status_code=404, detail=f"Unknown animal: {animal_id}")

    audio_bytes = await get_animal_sound_bytes(animal_id)

    if not audio_bytes:
        raise HTTPException(
            status_code=503,
            detail=f"Could not fetch sound for '{animal_id}'. Check internet connection.",
        )

    return Response(
        content=audio_bytes,
        media_type="audio/ogg",
        headers={"Cache-Control": "public, max-age=86400"},  # browser caches for 1 day
    )
