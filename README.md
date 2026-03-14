# StoryBloom

AI-powered interactive storyteller for children

---

## What This Does

StoryBloom is a backend that powers a live AI storytelling experience for children. The child picks a hero name and world, then the AI generates a story scene by scene. After each scene the child gets 3 choices to guide the story. They can pick a choice by clicking a button **or by speaking** using their voice.

**Pipeline per scene:**
```
Child input (text / choice / voice)
        ↓
Gemini 2.5 Flash Lite  →  generates story scene (structured JSON)
        ↓                         ↓
  Pollinations.ai          gTTS (Google TTS)
  (scene illustration)     (audio narration)
        ↓                         ↓
         Frontend receives scene_text + image_url + audio_url + choices
```

---

## Tech Stack

| Layer | Tool |
|---|---|
| Backend framework | FastAPI (Python) |
| Story generation | Gemini 2.5 Flash Lite |
| Voice input | Gemini Live API (`gemini-2.0-flash-live-001`) |
| Image generation | Pollinations.ai (free) |
| Text-to-speech | gTTS (free) |
| Real-time | WebSocket |

---

## Project Structure

```
story_bloom/
├── main.py                  # FastAPI app entry point
├── config.py                # API keys and model names
├── requirements.txt         # Python dependencies
├── .env                     # Your API key
│
├── models/
│   └── story_models.py      # Pydantic data models
│
├── agents/
│   ├── gemini_agent.py      # Calls Gemini for story generation
│   ├── gemini_live_agent.py # Calls Gemini Live for voice transcription
│   ├── memory_agent.py      # Stores session history in memory
│   └── story_engine.py      # Orchestrates the full story pipeline
│
├── services/
│   ├── image_services.py    # Image generation via Pollinations.ai
│   ├── tts_service.py       # Text-to-speech via gTTS
│   └── streaming_service.py # WebSocket helper functions
│
├── api/
│   ├── routes.py            # HTTP REST endpoints
│   └── websocket.py         # WebSocket handlers
│
├── utils/
│   └── prompts.py           # All Gemini prompts in one place
│
└── audio_temp/              # Auto-created, stores generated MP3 files
```

---

## Setup

### 1. Clone and create virtual environment
```bash
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux
```

### 2. Install dependencies
```bash
pip install -r requirements.txt
```

### 3. Create your `.env` file
Create a file named `.env` in the project root:
```
GEMINI_API_KEY= your_gemini_api_key_here
```
Get your free API key at: https://aistudio.google.com

### 4. Run the server
```bash
uvicorn main:app --reload
```

Server runs at: `http://localhost:8000`
Interactive API docs: `http://localhost:8000/docs`

---

## API Reference

### HTTP Endpoints

#### `GET /`
Health check. Confirms server is running.

**Response:**
```json
{
  "status": "running",
  "app": "StoryBloom"
}
```

---

#### `POST /api/session`
Start a new story session. Returns the opening scene.

**Request body:**
```json
{
  "session_id": "user123",
  "hero_name": "Zara",
  "world_name": "Crystal Forest",
  "genre": "fantasy"
}
```

> `genre` options: `"fantasy"` `"adventure"` `"mystery"` `"space"`

**Response:**
```json
{
  "type": "scene",
  "session_id": "user123",
  "scene_number": 1,
  "scene_text": "Zara stood at the edge of the Crystal Forest...",
  "image_url": "https://image.pollinations.ai/prompt/...",
  "audio_url": "/audio/abc123.mp3",
  "choices": [
    "Enter the forest bravely",
    "Look for a hidden path",
    "Call out to see if anyone is home"
  ]
}
```

---

#### `GET /api/session/{session_id}`
Get current session info (useful for debugging or reconnecting).

**Response:**
```json
{
  "session_id": "user123",
  "hero_name": "Zara",
  "world_name": "Crystal Forest",
  "genre": "fantasy",
  "scene_number": 3,
  "history_length": 6
}
```

---

#### `GET /audio/{filename}`
Fetch a generated audio file.

The `audio_url` field in scene responses already points here.
The frontend just needs to play it:
```js
const audio = new Audio("http://localhost:8000" + scene.audio_url);
audio.play();
```

---

### WebSocket Endpoints

> **Note:** WebSocket endpoints do not appear in `/docs` — this is normal. Use Postman or a WebSocket client to test them.

---

#### `WS /ws/story`
Main real-time story endpoint. Handles text input, button choices, and browser-transcribed voice.

**Keep the connection open** — send multiple messages to keep the story going.

**Message 1 — Initialize story** (send this first):
```json
{
  "type": "init",
  "session_id": "user123",
  "hero_name": "Zara",
  "world_name": "Crystal Forest",
  "genre": "fantasy"
}
```

**Message 2 — Send a choice** (when child clicks a button):
```json
{
  "type": "choice",
  "session_id": "user123",
  "content": "Enter the forest bravely"
}
```

**Message 3 — Send typed text** (when child types freely):
```json
{
  "type": "text",
  "session_id": "user123",
  "content": "I want to find the dragon"
}
```

**Message 4 — Send browser-transcribed voice** (Web Speech API result):
```json
{
  "type": "voice_text",
  "session_id": "user123",
  "content": "let's go find the treasure"
}
```

**Server responses:**

Status update (shows while generating):
```json
{ "type": "status", "status": "generating" }
```

Scene response (the full story scene):
```json
{
  "type": "scene",
  "session_id": "user123",
  "scene_number": 2,
  "scene_text": "Zara stepped into the forest...",
  "image_url": "https://image.pollinations.ai/prompt/...",
  "audio_url": "/audio/def456.mp3",
  "choices": ["...", "...", "..."]
}
```

Error message:
```json
{ "type": "error", "message": "Session not found. Send init first." }
```

---

#### `WS /ws/voice/{session_id}`
Raw audio input via Gemini Live API. For when the frontend captures microphone audio directly (not browser speech-to-text).

**Audio format required:** PCM, 16kHz, 16-bit, mono

**Protocol:**
1. Connect to `ws://localhost:8000/ws/voice/user123`
2. Send binary frames — raw PCM audio chunks from `MediaRecorder`
3. Send text `"END_OF_SPEECH"` when the child stops speaking
4. Server transcribes with Gemini Live, then generates the next scene

**Server responses:**

Transcription (what Gemini heard):
```json
{ "type": "transcription", "text": "let's go find the treasure" }
```

Then a full scene response (same format as above).

---