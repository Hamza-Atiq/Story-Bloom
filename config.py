import os
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise ValueError("Set GEMINI_API_KEY in your .env file")

STORY_MODEL = "gemini-2.5-flash-lite"

# Model for real-time voice interaction (Gemini Live API)
LIVE_MODEL = "gemini-2.0-flash-live-001"

# Model for scene image generation (Gemini native image output)
IMAGE_MODEL = "gemini-2.5-flash-image"

# Model for story narration (Gemini native TTS — sounds far better than gTTS)
TTS_MODEL = "gemini-2.5-flash-preview-tts"
TTS_VOICE = "Aoede"  # Warm, expressive voice — great for children's stories

MAX_HISTORY_TURNS = 10
