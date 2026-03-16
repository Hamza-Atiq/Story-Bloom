"""
tts_service.py
--------------
Converts story narration to audio using Gemini TTS
(gemini-2.5-flash-preview-tts) — far more expressive than gTTS.

Gemini returns raw 24kHz 16-bit mono PCM, which we wrap into a
standard .wav file and serve at /audio/<uuid>.wav.
"""
import asyncio
import uuid
import wave
from pathlib import Path
from google import genai
from google.genai import types
from config import GEMINI_API_KEY, TTS_MODEL, TTS_VOICE

AUDIO_DIR = Path("audio_temp")
AUDIO_DIR.mkdir(exist_ok=True)

_client = genai.Client(api_key=GEMINI_API_KEY)


async def generate_audio(text: str, lang: str = "en") -> str | None:
    """
    Convert story text to a WAV file using Gemini TTS.

    Returns:
        URL path like "/audio/<uuid>.wav" for the frontend to play,
        or None on failure.
    """
    try:
        # Gemini TTS is synchronous — run in a thread to stay non-blocking
        filename = await asyncio.to_thread(_sync_gemini_tts, text)
        return f"/audio/{filename}"

    except Exception as e:
        print(f"[tts_service] Gemini TTS failed: {e}")
        return None


def _sync_gemini_tts(text: str) -> str:
    """
    Calls Gemini TTS, saves PCM data as a .wav file, returns the filename.
    Runs in a thread pool — never call directly from async code.
    """
    response = _client.models.generate_content(
        model=TTS_MODEL,
        contents=text,
        config=types.GenerateContentConfig(
            response_modalities=["AUDIO"],
            speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(
                        voice_name=TTS_VOICE,
                    )
                )
            ),
        ),
    )

    pcm_data = response.candidates[0].content.parts[0].inline_data.data

    filename = f"{uuid.uuid4().hex}.wav"
    filepath = AUDIO_DIR / filename

    # Wrap raw PCM in a WAV container (24kHz, 16-bit, mono)
    with wave.open(str(filepath), "wb") as wf:
        wf.setnchannels(1)    # mono
        wf.setsampwidth(2)    # 16-bit = 2 bytes per sample
        wf.setframerate(24000)  # 24kHz sample rate
        wf.writeframes(pcm_data)

    return filename
