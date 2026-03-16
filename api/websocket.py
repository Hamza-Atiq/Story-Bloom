"""
Two WebSocket handlers for StoryBloom.
"""
import asyncio
from fastapi import WebSocket, WebSocketDisconnect
from agents.story_engine import start_story, continue_story
from agents.memory_agent import create_session, get_session, update_last_image_prompt
from agents.gemini_live_agent import transcribe_audio
from services.image_services import generate_image
from services.tts_service import generate_audio
from services.streaming_service import send_json, send_error, send_status


async def _send_scene(ws: WebSocket, session_id: str, scene) -> None:
    """Generate image & audio then send the full scene to the frontend."""
    # Store image_prompt so the video endpoint can use it
    update_last_image_prompt(session_id, scene.image_prompt)

    image_url, audio_url = await asyncio.gather(
        generate_image(scene.image_prompt),
        generate_audio(scene.scene_text),
    )

    session = get_session(session_id)

    await send_json(ws, {
        "type": "scene",
        "session_id": session_id,
        "scene_number": session.scene_number if session else 1,
        "scene_text": scene.scene_text,
        "image_url": image_url,
        "audio_base64": audio_url,
        "choices": scene.choices,
    })


async def story_websocket_handler(ws: WebSocket):
    await ws.accept()
    session_id = "unknown"

    try:
        while True:
            data = await ws.receive_json()
            msg_type = data.get("type")
            session_id = data.get("session_id", "unknown")

            if not session_id or session_id == "unknown":
                await send_error(ws, "session_id is required in every message")
                continue

            if msg_type == "init":
                hero_name = data.get("hero_name", "Hero")
                world_name = data.get("world_name", "Magical Land")
                genre = data.get("genre", "fantasy")
                animal = data.get("animal")  # optional

                create_session(session_id, hero_name, world_name, genre, animal)
                await send_status(ws, "generating")

                scene = await start_story(session_id)
                await _send_scene(ws, session_id, scene)

            elif msg_type in ("choice", "text", "voice_text"):
                session = get_session(session_id)
                if not session:
                    await send_error(ws, "Session not found. Send 'init' first.")
                    continue

                content = data.get("content", "").strip()
                if not content:
                    await send_error(ws, "'content' field is required and cannot be empty")
                    continue

                await send_status(ws, "generating")
                scene = await continue_story(session_id, content)
                await _send_scene(ws, session_id, scene)

            else:
                await send_error(ws, f"Unknown message type: '{msg_type}'")

    except WebSocketDisconnect:
        print(f"[websocket] Client disconnected: {session_id}")

    except Exception as e:
        print(f"[websocket] Error for session {session_id}: {e}")
        try:
            await send_error(ws, f"Server error: {str(e)}")
        except Exception:
            pass


async def voice_websocket_handler(ws: WebSocket, session_id: str):
    await ws.accept()
    audio_chunks: list[bytes] = []

    try:
        while True:
            message = await ws.receive()

            if "bytes" in message:
                audio_chunks.append(message["bytes"])

            elif "text" in message:
                text = message["text"]

                if text == "END_OF_SPEECH":
                    if not audio_chunks:
                        await send_error(ws, "No audio received before END_OF_SPEECH")
                        continue

                    await send_status(ws, "transcribing")
                    transcription = await transcribe_audio(audio_chunks)
                    audio_chunks = []

                    if not transcription:
                        await send_error(ws, "Could not understand the audio. Please try again.")
                        continue

                    await send_json(ws, {"type": "transcription", "text": transcription})

                    session = get_session(session_id)
                    if not session:
                        await send_error(ws, f"Session '{session_id}' not found.")
                        continue

                    await send_status(ws, "generating")
                    scene = await continue_story(session_id, transcription)
                    await _send_scene(ws, session_id, scene)

    except WebSocketDisconnect:
        print(f"[voice_ws] Voice client disconnected: {session_id}")

    except Exception as e:
        print(f"[voice_ws] Error: {e}")
        try:
            await send_error(ws, str(e))
        except Exception:
            pass
