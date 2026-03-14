"""
HTTP REST endpoints for StoryBloom.

"""
import asyncio
from fastapi import APIRouter, HTTPException
from models.story_models import SessionInit, StoryResponse
from agents.memory_agent import create_session, get_session
from agents.story_engine import start_story
from services.image_services import generate_image
from services.tts_service import generate_audio

router = APIRouter(prefix="/api", tags=["Story"])

@router.post("/session", response_model=StoryResponse, summary="Start a new story")
async def create_story_session(data: SessionInit):
    """
    Initialize a story session and return the first scene.

    """
    # Create the session in memory
    create_session(
        session_id=data.session_id,
        hero_name=data.hero_name,
        world_name=data.world_name,
        genre=data.genre,
    )

    # Generate the opening scene
    scene = await start_story(data.session_id)

    # Generate image and audio AT THE SAME TIME (parallel, faster!)
    image_url, audio_b64 = await asyncio.gather(
        generate_image(scene.image_prompt),
        generate_audio(scene.scene_text),
    )

    session = get_session(data.session_id)

    return StoryResponse(
        session_id=data.session_id,
        scene_number=session.scene_number,
        scene_text=scene.scene_text,
        image_url=image_url,
        audio_base64=audio_b64,
        choices=scene.choices,
    )


@router.get("/session/{session_id}", summary="Get session info")
async def get_session_info(session_id: str):
    """Return session metadata (for debugging or reconnecting)."""
    
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return {
        "session_id": session.session_id,
        "hero_name": session.hero_name,
        "world_name": session.world_name,
        "genre": session.genre,
        "scene_number": session.scene_number,
        "history_length": len(session.history),
    }
