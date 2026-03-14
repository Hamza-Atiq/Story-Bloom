"""
Handles real-time VOICE input using the Gemini Live API.

"""
from google import genai
from google.genai import types
from config import GEMINI_API_KEY, LIVE_MODEL

client = genai.Client(api_key=GEMINI_API_KEY, http_options={"api_version": "v1alpha"},)

TRANSCRIBE_INSTRUCTION = """
You are a transcription assistant for a children's storytelling app.
Listen carefully and transcribe exactly what the child says.
Return ONLY the transcription text, nothing else.
"""

async def transcribe_audio(audio_chunks: list[bytes]) -> str:
    """
    Send audio chunks to Gemini Live API and get back a text transcription.

    """
    config = types.LiveConnectConfig(
        response_modalities=["TEXT"],
        system_instruction=TRANSCRIBE_INSTRUCTION,
    )

    transcription = ""

    async with client.aio.live.connect(model=LIVE_MODEL, config=config) as session:
        # Send each audio chunk to Gemini Live
        for chunk in audio_chunks:
            await session.send(
                input=types.Blob(data=chunk, mime_type="audio/pcm;rate=16000")
            )

        # Signal that the child has finished speaking
        await session.send(input=" ", end_of_turn=True)

        # Collect the transcription from the response stream
        async for response in session.receive():
            if response.text:
                transcription += response.text

    return transcription.strip()
