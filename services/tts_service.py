"""
tts_service.py
--------------
Converts story text to spoken audio using gTTS (Google Text-to-Speech).

Instead of returning a huge base64 string, we save the audio as a temp file
and return a short URL like /audio/abc123.mp3.
The frontend fetches the audio from that URL and plays it.

Files are stored in the 'audio_temp' folder which FastAPI serves as static files.
"""
import asyncio
import uuid
import os
from functools import partial
from pathlib import Path

# Folder where audio files are saved (created automatically)
AUDIO_DIR = Path("audio_temp")
AUDIO_DIR.mkdir(exist_ok=True)


async def generate_audio(text: str, lang: str = "en") -> str | None:
    """
    Convert text to MP3 and save it as a file.

    Returns:
        URL path like "/audio/abc123.mp3" that the frontend can fetch
        or None if TTS failed
    """
    try:
        loop = asyncio.get_event_loop()
        filename = await loop.run_in_executor(None, partial(_sync_tts, text, lang))
        return f"/audio/{filename}"

    except Exception as e:
        print(f"[tts_service] TTS failed: {e}")
        return None


def _sync_tts(text: str, lang: str) -> str:
    """Synchronous gTTS call — runs in a thread pool to not block FastAPI."""
    from gtts import gTTS

    filename = f"{uuid.uuid4().hex}.mp3"
    filepath = AUDIO_DIR / filename

    tts = gTTS(text=text, lang=lang, slow=False)
    tts.save(str(filepath))

    return filename
