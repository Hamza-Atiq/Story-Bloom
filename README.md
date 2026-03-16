# 📖 StoryBloom

> **AI-powered interactive storytelling for children — built for the [Gemini Live Agent Challenge](https://geminiliveagentchallenge.devpost.com/)**

StoryBloom lets children become the hero of their own adventure. They pick a name, a world, and a genre, then guide the story by tapping choices, typing ideas, or **speaking out loud**. Every scene is illustrated and narrated in real time by Gemini AI.

---

## Demo

> _Add your 4-minute demo video link here_

---

## Architecture

```
╔══════════════════════════════════════════════════════════════════════════╗
║                      Child's Browser (Vercel — Next.js 18)              ║
║                                                                          ║
║  ┌─────────────────────┐   ┌──────────────────┐   ┌───────────────────┐ ║
║  │   Home Page         │   │   Story Page      │   │  Animal Selector  │ ║
║  │  - Hero name        │   │  - Scene text     │   │  - 18 animals     │ ║
║  │  - World name       │   │  - AI illustration│   │  - Real sounds    │ ║
║  │  - Genre picker     │   │  - Audio narration│   │    (animal-       │ ║
║  │  - Voice input 🎤   │   │  - Choice buttons │   │    sounds.org)    │ ║
║  │    Web Speech API   │   │  - Text input     │   │  - Browser        │ ║
║  │    (browser native) │   │  - Voice input 🎤 │   │    SpeechSynthesis│ ║
║  └────────┬────────────┘   └────────┬──────────┘   └───────────────────┘ ║
║           │ POST /api/session        │ WS /ws/story                       ║
║           │ (HTTP REST)              │ WS /ws/voice/{session_id}          ║
║           │                         │ POST /api/video/{session_id}        ║
╚═══════════╪═════════════════════════╪════════════════════════════════════╝
            │                         │
            ▼                         ▼
╔══════════════════════════════════════════════════════════════════════════╗
║               FastAPI Backend  ──  Google Cloud Run                      ║
║                                                                          ║
║  ┌─────────────────────────────────────────────────────────────────────┐ ║
║  │  POST /api/session  ──►  Story Engine  ──►  Memory Agent            │ ║
║  │                               │              (session + history)    │ ║
║  │  WS /ws/story  ───────────────┤                                     │ ║
║  │  (init / choice / text /      │                                     │ ║
║  │   voice_text messages)        ▼                                     │ ║
║  │                    ┌──────────────────────┐                         │ ║
║  │                    │  gemini-2.5-flash-lite│  ◄── Story generation  │ ║
║  │                    │  Structured JSON out  │      scene text +      │ ║
║  │                    │  (Pydantic schema)    │      3 choices         │ ║
║  │                    └──────────┬───────────┘                         │ ║
║  │                               │ scene ready — parallel calls        │ ║
║  │                    ┌──────────┴───────────┐                         │ ║
║  │                    │                      │                         │ ║
║  │                    ▼                      ▼                         │ ║
║  │       ┌────────────────────┐  ┌───────────────────────┐            │ ║
║  │       │gemini-2.5-flash-   │  │gemini-2.5-flash-      │            │ ║
║  │       │     -image         │  │   preview-tts          │            │ ║
║  │       │ Native PNG image   │  │ Aoede voice — WAV      │            │ ║
║  │       │ saved → /images/   │  │ 24kHz PCM → wave mod   │            │ ║
║  │       └────────┬───────────┘  └──────────┬────────────┘            │ ║
║  │                │  image_url               │  audio_url              │ ║
║  │                └──────────────┬───────────┘                         │ ║
║  │                               │ scene JSON sent to browser          │ ║
║  │                               ▼                                     │ ║
║  │  WS /ws/voice  ──► gemini-2.0-flash-live-001                        │ ║
║  │  (raw PCM audio    Gemini Live API — real-time                      │ ║
║  │   chunks +         speech transcription                             │ ║
║  │   END_OF_SPEECH)   → transcription → story continue                 │ ║
║  │                                                                     │ ║
║  │  POST /api/video  ──► veo-2.0-generate-001                          │ ║
║  │  (on demand,           8-sec animated video                         │ ║
║  │   triggered by         polling loop (30–90s)                        │ ║
║  │   Watch Video btn)     saved → /videos/                             │ ║
║  │                                                                     │ ║
║  │  GET /api/animal-sound ──► Wikimedia Commons proxy                  │ ║
║  │  (fallback only —          returns OGG audio bytes                  │ ║
║  │   browser loads direct)                                             │ ║
║  │                                                                     │ ║
║  │  Static file serving:                                               │ ║
║  │    /images/* ──► images_temp/   (PNG scene illustrations)           │ ║
║  │    /audio/*  ──► audio_temp/    (WAV narration files)               │ ║
║  │    /videos/* ──► videos_temp/   (MP4 Veo 2 clips)                   │ ║
║  └─────────────────────────────────────────────────────────────────────┘ ║
╚══════════════════════════════════════════════════════════════════════════╝
            │
            ▼
╔══════════════════════════════════════════════════════════════════════════╗
║                     Google Cloud Infrastructure                          ║
║                                                                          ║
║   Cloud Run          Cloud Build         Secret Manager                  ║
║   (auto-scaling      (Docker image       (GEMINI_API_KEY                 ║
║    container host)    CI/CD builds)       stored securely)               ║
║                                                                          ║
║   Container Registry                                                     ║
║   (Docker image storage)                                                 ║
╚══════════════════════════════════════════════════════════════════════════╝

Data flow summary
─────────────────
1. Child picks animal → browser plays real sound (animal-sounds.org, no backend)
2. Child clicks Start → POST /api/session → story + image + audio generated in parallel
3. Child taps choice → WS /ws/story → next scene (text + image + audio)
4. Child speaks → WS /ws/voice → Gemini Live transcribes → next scene generated
5. Child taps Watch Video → POST /api/video → Veo 2 polls → MP4 returned
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

## Reproducible Testing

Follow these steps to run a complete end-to-end test of StoryBloom from scratch.

### Prerequisites

- Python 3.11+, Node.js 18+
- A Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
- Chrome or Edge browser (required for Web Speech API voice input)

---

### Step 1 — Clone & set up the backend

```bash
git clone https://github.com/your-username/storybloom.git
cd storybloom

python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
```

Create a `.env` file in the project root:

```
GEMINI_API_KEY=your_gemini_api_key_here
```

Start the backend:

```bash
uvicorn main:app --reload --port 8000
```

Verify it's running — open `http://localhost:8000/docs` in your browser. You should see the FastAPI Swagger UI with the `/api/session`, `/api/video/{session_id}`, and `/api/animal-sound/{animal_id}` endpoints.

---

### Step 2 — Set up the frontend

In a **new terminal**:

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:

```
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

Start the frontend:

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

---

### Step 3 — Test: Animal sound + auto-start

1. On the home page, click any animal (e.g. **Cow** 🐄)
2. You should hear the browser speak **"Cow"** then play a real mooing sound
3. The banner at the top of the right column should show **"Cow joins the story!"**
4. Click **Start Adventure!** without filling in any fields
5. The story should start automatically with hero name **"Little Hero"** in **"Sunny Farm"**

---

### Step 4 — Test: Full story setup

1. Refresh the page
2. Type a hero name (e.g. **"Amir"**) and world name (e.g. **"Crystal Mountains"**)
3. Select a genre (e.g. **Fantasy**)
4. Click **Start Adventure!**
5. Wait ~10 seconds — you should see:
   - A story scene with 2-3 paragraphs of text
   - An AI-generated scene illustration
   - Audio narration starts playing automatically (Aoede voice)
   - Three story choice buttons at the bottom

---

### Step 5 — Test: Continuing the story

On the story page, test all three input methods:

**A — Choice buttons**
- Click any of the three choice buttons
- A new scene with image and audio should appear within ~10 seconds

**B — Text input**
- Type something in the text box at the bottom (e.g. *"I want to find the hidden cave"*)
- Press Enter or click Send
- A new custom scene should be generated

**C — Voice input (Chrome/Edge only)**
- Click the microphone button 🎤
- Say something out loud (e.g. *"Let's go find the dragon"*)
- Your speech is transcribed via Gemini Live API and shown on screen
- A new scene is generated from your spoken words

---

### Step 6 — Test: Video generation (optional, slow)

On the story page, click **Watch Video 🎬**

- A loading spinner appears (this takes 30–90 seconds — Veo 2 is generating an 8-second video)
- A video modal should appear and play automatically when ready

---

### Step 7 — Test the REST API directly

You can also test the backend without the frontend using the Swagger UI at `http://localhost:8000/docs`:

**POST `/api/session`** — start a story:
```json
{
  "session_id": "test_001",
  "hero_name": "Zara",
  "world_name": "Crystal Forest",
  "genre": "fantasy",
  "animal": "owl"
}
```
Expected: `200 OK` with `scene_text`, `image_url`, `audio_url`, and `choices` fields populated.

**GET `/api/session/test_001`** — check session state:
Expected: `200 OK` with `scene_number: 1` and `history_length: 2`.

**GET `/api/animal-sound/cow`** — fetch animal sound proxy:
Expected: `200 OK` with `audio/ogg` content (or `503` if no internet — browser will load sounds directly in that case).

---

### Expected results summary

| Test | Expected outcome |
|------|-----------------|
| Animal click | Name spoken + real animal sound plays |
| Animal-only start | Story begins with smart defaults (no manual input needed) |
| Story generation | Scene text + image + audio within ~10s |
| Choice tap | Next scene generated seamlessly |
| Text input | Custom scene based on typed input |
| Voice input | Speech transcribed live, new scene generated |
| Video button | 8-second Veo 2 video generated and played |
| `/api/session` POST | `200` with all scene fields populated |

---

## Hackathon

Built for the **[Gemini Live Agent Challenge](https://geminiliveagentchallenge.devpost.com/)** — Category: **Creative Storytellers**

- Uses Gemini Live API for real-time voice interaction
- Full multimodal output: text + AI-generated images + expressive audio narration
- Entire AI stack powered by Google GenAI SDK
- Backend deployed on Google Cloud Run
