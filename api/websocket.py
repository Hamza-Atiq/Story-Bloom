from fastapi import WebSocket
from services.streaming_service import send_json
from agents.story_engine import process_story
from agents.gemini_agent import generate_story
from services.image_services import generate_image
from services.tts_service import generate_audio

async def websocket_handler(ws: WebSocket):
    await ws.accept()
    print("WebSocket connection accepted")

    while True:

        data = await ws.receive_json()
        print(f"Received data: {data}")

        session_id = data.get("session_id")
        input = data.get("input")

        story_text = await process_story(session_id, input, generate_story)

        image_url = await generate_image(story_text)

        audio_url = await generate_audio(story_text)

        await send_json(ws, {
            "type": "story_response",
            "story": story_text,
            "image": image_url,
            "audio": audio_url
        })

        await ws.close()

