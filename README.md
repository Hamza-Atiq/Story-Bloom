# 📖 StoryBloom

> **AI-powered interactive storytelling for children — built for the [Gemini Live Agent Challenge](https://geminiliveagentchallenge.devpost.com/)**

StoryBloom lets children become the hero of their own adventure. They pick a name, a world, and a genre — then guide the story by tapping choices, typing ideas, or **speaking out loud**. Every scene is illustrated and narrated in real time by Gemini AI.

---

## Demo

> _Add your 4-minute demo video link here_

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     Child's Browser                          │
│  Next.js 18 frontend (Vercel)                                │
│  ┌──────────────┐  ┌────────────────┐  ┌─────────────────┐  │
│  │  Story Page  │  │  Voice Input   │  │  Audio Player   │  │
│  │  (choices /  │  │  Web Speech    │  │  (WAV narration)│  │
│  │   text input)│  │  API (browser) │  └─────────────────┘  │
│  └──────┬───────┘  └───────┬────────┘                        │
│         │  WebSocket       │  WebSocket                      │
└─────────┼──────────────────┼─────────────────────────────────┘
          │                  │
          ▼                  ▼
┌──────────────────────────────────────────────────────────────┐
│              FastAPI Backend (Google Cloud Run)               │
│                                                              │
│  /ws/story ──► Story Engine ──► Gemini 2.5 Flash Lite        │
│                    │                (scene text + choices)   │
│                    │                                         │
│                    ├──► Gemini 2.5 Flash Image               │
│                    │        (scene illustration PNG)         │
│                    │                                         │
│                    └──► Gemini 2.5 Flash Preview TTS         │
│                             (WAV narration — Aoede voice)    │
│                                                              │
│  /ws/voice ──► Gemini Live API (gemini-2.0-flash-live-001)   │
│                    (real-time voice transcription)           │
└──────────────────────────────────────────────────────────────┘
          │
          ▼
┌──────────────────────────────────────────────────────────────┐
│               Google Cloud Services                          │
│  Cloud Run · Cloud Build · Secret Manager · Container Registry│
└──────────────────────────────────────────────────────────────┘
```

---

## Gemini Models Used

| Feature | Model | Purpose |
|---|---|---|
| Story generation | `gemini-2.5-flash-lite` | Fast structured JSON — scene text + 3 choices |
| Scene images | `gemini-2.5-flash-image` | Native image generation per scene |
| Audio narration | `gemini-2.5-flash-preview-tts` | Expressive Aoede voice narration |
| Voice input | `gemini-2.0-flash-live-001` | Real-time speech transcription (Gemini Live API) |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI + Uvicorn (Python 3.11) |
| Frontend | Next.js 18 + React 18 + Tailwind CSS |
| Real-time | WebSocket (story stream + voice stream) |
| AI SDK | Google GenAI SDK (`google-genai`) |
| Hosting | Google Cloud Run (backend) + Vercel (frontend) |

---

## Local Development

### Prerequisites
- Python 3.11+
- Node.js 18+
- A [Gemini API key](https://aistudio.google.com/app/apikey)

### 1. Backend

```bash
# Clone the repo
git clone https://github.com/your-username/storybloom.git
cd storybloom

# Create and activate a virtual environment
python -m venv venv

# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
echo "GEMINI_API_KEY=your_key_here" > .env

# Start the backend
uvicorn main:app --reload --port 8000
```

Backend runs at `http://localhost:8000`
API docs at `http://localhost:8000/docs`

### 2. Frontend

```bash
cd frontend

# Install dependencies
npm install

# Create env file
cp .env.local.example .env.local
# Leave NEXT_PUBLIC_BACKEND_URL=http://localhost:8000 for local dev

# Start the frontend
npm run dev
```

Frontend runs at `http://localhost:3000`

---

## Google Cloud Run Deployment

### Prerequisites
- [gcloud CLI](https://cloud.google.com/sdk/docs/install) installed
- A Google Cloud project with billing enabled

### Deploy backend

```bash
# 1. Login
gcloud auth login

# 2. Edit deploy.sh — set your PROJECT_ID at the top
# 3. Run it
bash deploy.sh
```

The script handles everything:
- Enables Cloud APIs (Cloud Run, Cloud Build, Secret Manager)
- Stores your `GEMINI_API_KEY` in Secret Manager (not in the container)
- Builds the Docker image with Cloud Build
- Deploys to Cloud Run with 1Gi RAM
- Prints the live backend URL

### Deploy frontend to Vercel

```bash
npm install -g vercel
cd frontend
vercel
# Set env var: NEXT_PUBLIC_BACKEND_URL = https://your-cloud-run-url.run.app
```

---

## API Reference

### HTTP Endpoints

#### `POST /api/session`
Start a new story. Returns the opening scene.

**Request:**
```json
{
  "session_id": "session_123",
  "hero_name": "Zara",
  "world_name": "Crystal Forest",
  "genre": "fantasy"
}
```
Genre options: `fantasy` · `adventure` · `mystery` · `space`

**Response:**
```json
{
  "type": "scene",
  "scene_number": 1,
  "scene_text": "Zara stood at the edge of the Crystal Forest...",
  "image_url": "/images/abc123.png",
  "audio_url": "/audio/def456.wav",
  "choices": ["Enter the forest bravely", "Look for a hidden path", "Call out to see if anyone is home"]
}
```

#### `GET /api/session/{session_id}`
Get session metadata (scene count, hero name, history length).

---

### WebSocket Endpoints

#### `WS /ws/story`
Main real-time story endpoint. Send one of these message types:

```json
{ "type": "init",       "session_id": "...", "hero_name": "...", "world_name": "...", "genre": "..." }
{ "type": "choice",     "session_id": "...", "content": "Enter the forest bravely" }
{ "type": "text",       "session_id": "...", "content": "I want to find the dragon" }
{ "type": "voice_text", "session_id": "...", "content": "let's go find the treasure" }
```

Server responds with `status` (generating) then `scene` (full scene data) or `error`.

#### `WS /ws/voice/{session_id}`
Raw microphone audio via Gemini Live API.
- Send binary PCM audio chunks (16kHz, 16-bit, mono)
- Send text `"END_OF_SPEECH"` to trigger transcription
- Server responds with `transcription` then the next `scene`

---

## Project Structure

```
storybloom/
├── main.py                  # FastAPI entry point + static file serving
├── config.py                # API keys + model names
├── requirements.txt         # Python dependencies
├── Dockerfile               # Cloud Run container
├── deploy.sh                # One-command Cloud Run deploy
│
├── agents/
│   ├── gemini_agent.py      # Story generation (Gemini 2.5 Flash Lite)
│   ├── gemini_live_agent.py # Voice transcription (Gemini Live API)
│   ├── memory_agent.py      # Session + conversation history
│   └── story_engine.py      # Story pipeline orchestration
│
├── services/
│   ├── image_services.py    # Scene illustrations (Gemini 2.5 Flash Image)
│   ├── tts_service.py       # Audio narration (Gemini TTS — Aoede voice)
│   └── streaming_service.py # WebSocket helpers
│
├── api/
│   ├── routes.py            # HTTP endpoints
│   └── websocket.py         # WebSocket handlers
│
├── models/
│   └── story_models.py      # Pydantic data models
│
├── utils/
│   └── prompts.py           # All Gemini prompts
│
└── frontend/                # Next.js app (deploy to Vercel)
    ├── app/page.js           # Home / setup page
    ├── app/story/page.js     # Interactive story page
    └── .env.local.example   # Frontend env template
```

---

## Hackathon

Built for the **[Gemini Live Agent Challenge](https://geminiliveagentchallenge.devpost.com/)** — Category: **Creative Storytellers**

- Uses Gemini Live API for real-time voice interaction
- Full multimodal output: text + AI-generated images + expressive audio narration
- Entire AI stack powered by Google GenAI SDK
- Backend deployed on Google Cloud Run
