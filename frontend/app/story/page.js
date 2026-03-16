'use client'

// =============================================
// STORY PAGE
// The main storytelling experience.
// - Reads first scene from localStorage
// - Connects to WebSocket for subsequent scenes
// - Shows scene image, story text, and choice buttons
// - Supports voice input and free-text input
// =============================================

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

// Backend URL from environment variable
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

// Convert http:// → ws:// for the WebSocket connection
const WS_URL = BACKEND_URL.replace(/^http/, 'ws')

// Emoji prefix for each of the three choice buttons
const CHOICE_EMOJIS = ['🗡️', '🧠', '💚']

// CSS class names for the three gradient choice buttons
const CHOICE_STYLES = ['btn-choice-purple', 'btn-choice-pink', 'btn-choice-green']

// ─── StarField ───────────────────────────────────────────────────────────────
// Stars are generated client-side only (useEffect) to avoid SSR hydration mismatch
// caused by Math.random() producing different values on server vs client.
function StarField() {
  const [stars, setStars] = useState([])

  useEffect(() => {
    setStars(Array.from({ length: 60 }, (_, i) => ({
      id: i,
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      delay: `${(Math.random() * 5).toFixed(1)}s`,
      duration: `${(2 + Math.random() * 4).toFixed(1)}s`,
      large: Math.random() > 0.7,
    })))
  }, [])

  if (stars.length === 0) return null

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      {stars.map((s) => (
        <span
          key={s.id}
          className={`star ${s.large ? 'star-lg' : ''}`}
          style={{
            top: s.top,
            left: s.left,
            '--twinkle-delay': s.delay,
            '--twinkle-duration': s.duration,
          }}
        />
      ))}
    </div>
  )
}

// ─── ImagePanel ──────────────────────────────────────────────────────────────
// Shows the scene image, or a shimmer placeholder while loading,
// or a star emoji if no image URL was provided
function ImagePanel({ imageUrl, sceneNumber }) {
  const [loaded, setLoaded] = useState(false)
  const [errored, setErrored] = useState(false)

  // Reset loading state whenever the image URL changes
  useEffect(() => {
    setLoaded(false)
    setErrored(false)
  }, [imageUrl])

  const fullUrl = imageUrl ? `${BACKEND_URL}${imageUrl}` : null

  return (
    <div
      className="relative rounded-2xl overflow-hidden aspect-square w-full"
      style={{
        background: 'rgba(30, 27, 75, 0.6)',
        border: '1px solid rgba(139, 92, 246, 0.3)',
        minHeight: '280px',
      }}
    >
      {/* Shimmer loading placeholder — shows until image is ready */}
      {!loaded && !errored && fullUrl && (
        <div className="absolute inset-0 shimmer rounded-2xl" />
      )}

      {/* Fallback when no image URL provided or image fails to load */}
      {(!fullUrl || errored) && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-8xl float-anim select-none">⭐</span>
        </div>
      )}

      {/* Actual scene image */}
      {fullUrl && !errored && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={fullUrl}
          alt={`Scene ${sceneNumber}`}
          className={`w-full h-full object-cover rounded-2xl transition-opacity duration-500 ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
        />
      )}

      {/* Scene number badge */}
      <div
        className="absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-bold text-white"
        style={{ background: 'rgba(109, 40, 217, 0.8)' }}
      >
        Scene {sceneNumber}
      </div>
    </div>
  )
}

// ─── Main Story Page ─────────────────────────────────────────────────────────
export default function StoryPage() {
  const router = useRouter()

  // Session data loaded from localStorage
  const [session, setSession] = useState(null)

  // The current scene being displayed
  const [currentScene, setCurrentScene] = useState(null)

  // Whether we're waiting for the next scene to arrive
  const [generating, setGenerating] = useState(false)

  // WebSocket connection status
  const [wsConnected, setWsConnected] = useState(false)

  // Whether the free-text input box is visible
  const [showTextInput, setShowTextInput] = useState(false)

  // The text the child types in the custom input
  const [customText, setCustomText] = useState('')

  // Voice transcription result (shown briefly after recording)
  const [transcription, setTranscription] = useState('')

  // Whether the microphone is currently recording
  const [recording, setRecording] = useState(false)

  // General error messages
  const [error, setError] = useState('')

  // Video generation state
  const [videoLoading, setVideoLoading] = useState(false)
  const [videoUrl, setVideoUrl] = useState(null)
  const [showVideo, setShowVideo] = useState(false)

  // Refs — persist between renders without causing re-renders
  const wsRef = useRef(null)         // WebSocket instance
  const audioRef = useRef(null)      // Hidden <audio> element for narration
  const recognitionRef = useRef(null) // SpeechRecognition instance

  // ── Load session from localStorage ───────────────────────────────────────
  useEffect(() => {
    const raw = localStorage.getItem('storybloom_session')
    if (!raw) {
      // No session found — send them back to setup
      router.push('/')
      return
    }

    try {
      const data = JSON.parse(raw)
      setSession(data)
      // Display the first scene immediately
      setCurrentScene(data.firstScene)
    } catch {
      router.push('/')
    }
  }, [router])

  // ── Play audio narration whenever a new scene arrives ─────────────────────
  useEffect(() => {
    if (!currentScene?.audio_url) return
    if (!audioRef.current) return

    audioRef.current.src = `${BACKEND_URL}${currentScene.audio_url}`
    audioRef.current.play().catch((err) => {
      // Browsers may block autoplay — that's okay, narration is optional
      console.warn('Audio autoplay blocked:', err)
    })
  }, [currentScene])

  // ── Connect WebSocket once session is loaded ──────────────────────────────
  useEffect(() => {
    if (!session) return

    const ws = new WebSocket(`${WS_URL}/ws/story`)
    wsRef.current = ws

    ws.onopen = () => {
      console.log('WebSocket connected')
      setWsConnected(true)
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)

        if (msg.type === 'scene') {
          // A new scene has arrived — display it
          setCurrentScene(msg)
          setGenerating(false)
          setError('')
        } else if (msg.type === 'status' && msg.status === 'generating') {
          // Backend is still writing the scene
          setGenerating(true)
        } else if (msg.type === 'error') {
          setError(msg.message || 'Something went wrong 😔')
          setGenerating(false)
        }
      } catch (e) {
        console.error('Failed to parse WS message:', e)
      }
    }

    ws.onclose = () => {
      console.log('WebSocket disconnected')
      setWsConnected(false)
    }

    ws.onerror = (err) => {
      console.error('WebSocket error:', err)
      setError('Lost connection to the story server 🔌')
    }

    // Cleanup: close socket when component unmounts
    return () => {
      ws.close()
    }
  }, [session])

  // ── Send a message through the WebSocket ─────────────────────────────────
  const sendMessage = useCallback(
    (type, content) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        setError('Not connected to story server. Please refresh the page.')
        return
      }
      if (!session) return

      setGenerating(true)
      setError('')

      wsRef.current.send(
        JSON.stringify({
          type,
          session_id: session.sessionId,
          content,
        })
      )
    },
    [session]
  )

  // ── Handle a choice button click ──────────────────────────────────────────
  function handleChoice(choiceText) {
    sendMessage('choice', choiceText)
  }

  // ── Handle sending free-text input ───────────────────────────────────────
  function handleSendText() {
    const trimmed = customText.trim()
    if (!trimmed) return
    sendMessage('text', trimmed)
    setCustomText('')
    setShowTextInput(false)
  }

  // Allow Enter key to submit custom text
  function handleTextKeyDown(e) {
    if (e.key === 'Enter') handleSendText()
  }

  async function handleGenerateVideo() {
    if (!session) return
    setVideoLoading(true)
    setVideoUrl(null)
    try {
      const res = await fetch(`${BACKEND_URL}/api/video/${session.sessionId}`, { method: 'POST' })
      if (!res.ok) throw new Error('Video generation failed')
      const data = await res.json()
      setVideoUrl(data.video_url)
      setShowVideo(true)
    } catch (err) {
      console.error('Video error:', err)
      setError('Could not generate video. Please try again. 🎬')
    } finally {
      setVideoLoading(false)
    }
  }

  // ── Voice input via Web Speech API ───────────────────────────────────────
  function handleVoice() {
    // Check browser support
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognition) {
      setError('Voice input is not supported in this browser 🎤')
      return
    }

    // Stop if already recording
    if (recording && recognitionRef.current) {
      recognitionRef.current.stop()
      return
    }

    const recognition = new SpeechRecognition()
    recognitionRef.current = recognition
    recognition.lang = 'en-US'
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onstart = () => setRecording(true)

    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript
      setTranscription(text)

      // Send the transcribed text as a voice_text message
      sendMessage('voice_text', text)

      // Clear the transcription display after 4 seconds
      setTimeout(() => setTranscription(''), 4000)
    }

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error)
      setError('Could not hear you — please try again 🎤')
      setRecording(false)
    }

    recognition.onend = () => setRecording(false)

    recognition.start()
  }

  // ── Loading / redirect states ─────────────────────────────────────────────
  if (!session || !currentScene) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <StarField />
        <div className="text-center z-10">
          <div className="text-6xl mb-4 animate-spin">✨</div>
          <p className="text-purple-300 text-xl">Loading your adventure...</p>
        </div>
      </main>
    )
  }

  // ── Main Render ───────────────────────────────────────────────────────────
  return (
    <main className="relative min-h-screen flex flex-col pb-8">
      {/* Star background */}
      <StarField />

      {/* Hidden audio element for narration */}
      <audio ref={audioRef} style={{ display: 'none' }} />

      {/* ── Header ── */}
      <header
        className="relative z-10 flex items-center justify-between px-4 py-4 gap-2"
        style={{
          background: 'rgba(15, 10, 30, 0.8)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(139, 92, 246, 0.2)',
        }}
      >
        {/* Back to home button */}
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-1 px-4 py-2 rounded-xl text-purple-300
                     hover:text-white transition-colors text-sm font-medium"
          style={{ background: 'rgba(76, 29, 149, 0.3)' }}
        >
          ← New Story
        </button>

        {/* Hero name */}
        <h1
          className="text-xl font-bold text-center truncate max-w-[40%]"
          style={{
            background: 'linear-gradient(135deg, #c084fc, #818cf8)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          {session.heroName}'s Story
        </h1>

        {/* Scene counter */}
        <div
          className="px-4 py-2 rounded-xl text-sm font-bold text-purple-300"
          style={{ background: 'rgba(76, 29, 149, 0.3)' }}
        >
          Scene {currentScene.scene_number || 1}
        </div>
      </header>

      {/* ── Main Content ── */}
      <div className="relative z-10 flex-1 w-full max-w-5xl mx-auto px-4 pt-6 flex flex-col gap-6">

        {/* Two-column grid on large screens, single column on mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Left column: scene image */}
          <ImagePanel
            imageUrl={currentScene.image_url}
            sceneNumber={currentScene.scene_number || 1}
          />

          {/* Right column: story text */}
          <div
            className="rounded-2xl p-6 flex flex-col justify-center"
            style={{
              background: 'rgba(30, 27, 75, 0.6)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(139, 92, 246, 0.25)',
              minHeight: '280px',
            }}
          >
            {/* World name badge */}
            <div className="mb-4">
              <span
                className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full"
                style={{ background: 'rgba(109, 40, 217, 0.4)', color: '#c084fc' }}
              >
                🌍 {session.worldName}
              </span>
            </div>

            {/* The actual story text */}
            <p className="story-text">
              {currentScene.scene_text}
            </p>
          </div>
        </div>

        {/* ── Choice / Input Section ── */}
        <div
          className="rounded-2xl p-6 flex flex-col gap-4"
          style={{
            background: 'rgba(30, 27, 75, 0.6)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(139, 92, 246, 0.25)',
          }}
        >

          {/* Error banner */}
          {error && (
            <div
              className="rounded-xl px-4 py-3 text-red-200 text-sm font-medium text-center"
              style={{ background: 'rgba(185, 28, 28, 0.3)', border: '1px solid rgba(239, 68, 68, 0.4)' }}
            >
              {error}
            </div>
          )}

          {/* Generating / loading state */}
          {generating ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="text-5xl animate-bounce select-none">✨</div>
              <p className="text-purple-300 text-lg font-medium">
                Writing the next chapter...
              </p>
              <p className="text-purple-500 text-sm">
                The magic is happening, hold tight!
              </p>
            </div>
          ) : (
            <>
              {/* "What does X do next?" label */}
              <p className="text-purple-300 text-center font-semibold text-lg">
                What does <span className="text-white">{session.heroName}</span> do next?
              </p>

              {/* Three choice buttons */}
              {currentScene.choices && currentScene.choices.length > 0 && (
                <div className="flex flex-col gap-3">
                  {currentScene.choices.map((choice, index) => (
                    <button
                      key={index}
                      onClick={() => handleChoice(choice)}
                      className={`w-full rounded-xl px-5 py-4 text-left text-white font-medium
                                  text-base ${CHOICE_STYLES[index % 3]}`}
                      style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}
                    >
                      <span className="mr-2 text-xl">{CHOICE_EMOJIS[index % 3]}</span>
                      {choice}
                    </button>
                  ))}
                </div>
              )}

              {/* Divider */}
              <div className="flex items-center gap-3 my-1">
                <div className="flex-1 h-px" style={{ background: 'rgba(139, 92, 246, 0.2)' }} />
                <span className="text-purple-500 text-xs uppercase tracking-widest">or</span>
                <div className="flex-1 h-px" style={{ background: 'rgba(139, 92, 246, 0.2)' }} />
              </div>

              {/* Action buttons row: voice + custom text */}
              <div className="flex gap-3 justify-center flex-wrap">

                {/* Microphone button */}
                <button
                  onClick={handleVoice}
                  className={`flex items-center gap-2 px-5 py-3 rounded-xl font-semibold
                              text-white transition-all duration-200 ${
                    recording ? 'animate-pulse' : ''
                  }`}
                  style={{
                    background: recording
                      ? 'linear-gradient(135deg, #dc2626, #ef4444)'
                      : 'linear-gradient(135deg, #1d4ed8, #3b82f6)',
                    boxShadow: recording
                      ? '0 0 20px rgba(239, 68, 68, 0.5)'
                      : '0 0 15px rgba(59, 130, 246, 0.3)',
                  }}
                >
                  🎤 {recording ? 'Listening...' : 'Tell with voice'}
                </button>

                {/* Type your own idea button */}
                <button
                  onClick={() => setShowTextInput((v) => !v)}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl font-semibold
                             text-white transition-all duration-200"
                  style={{
                    background: 'linear-gradient(135deg, #065f46, #059669)',
                    boxShadow: '0 0 15px rgba(5, 150, 105, 0.3)',
                  }}
                >
                  ✏️ Type your own idea
                </button>

                {/* Generate Video button */}
                <button
                  onClick={handleGenerateVideo}
                  disabled={videoLoading || generating}
                  className={`flex items-center gap-2 px-5 py-3 rounded-xl font-semibold
                              text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                    videoLoading ? 'animate-pulse' : ''
                  }`}
                  style={{
                    background: 'linear-gradient(135deg, #7c2d12, #ea580c)',
                    boxShadow: '0 0 15px rgba(234, 88, 12, 0.3)',
                  }}
                >
                  🎬 {videoLoading ? 'Making video... (~1 min)' : 'Watch Video'}
                </button>
              </div>

              {/* Voice transcription result — shown briefly after recording */}
              {transcription && (
                <div
                  className="rounded-xl px-4 py-3 text-center text-sm"
                  style={{
                    background: 'rgba(30, 58, 138, 0.4)',
                    border: '1px solid rgba(59, 130, 246, 0.4)',
                    color: '#93c5fd',
                  }}
                >
                  🎤 Heard: &ldquo;<em>{transcription}</em>&rdquo;
                </div>
              )}

              {/* Custom text input — toggles when ✏️ is clicked */}
              {showTextInput && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={`What should ${session.heroName} do?`}
                    value={customText}
                    onChange={(e) => setCustomText(e.target.value)}
                    onKeyDown={handleTextKeyDown}
                    autoFocus
                    className="flex-1 rounded-xl px-4 py-3 text-white placeholder-purple-400
                               outline-none text-base"
                    style={{
                      background: 'rgba(76, 29, 149, 0.4)',
                      border: '2px solid rgba(139, 92, 246, 0.5)',
                    }}
                    onFocus={(e) =>
                      (e.target.style.border = '2px solid rgba(168, 85, 247, 0.9)')
                    }
                    onBlur={(e) =>
                      (e.target.style.border = '2px solid rgba(139, 92, 246, 0.5)')
                    }
                  />
                  <button
                    onClick={handleSendText}
                    disabled={!customText.trim()}
                    className="px-6 py-3 rounded-xl font-bold text-white transition-all
                               disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                      boxShadow: '0 0 15px rgba(168, 85, 247, 0.4)',
                    }}
                  >
                    Send ✨
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* WebSocket status indicator (small, unobtrusive) */}
        <div className="flex justify-center">
          <span
            className="text-xs px-3 py-1 rounded-full"
            style={{
              background: wsConnected
                ? 'rgba(5, 150, 105, 0.2)'
                : 'rgba(185, 28, 28, 0.2)',
              color: wsConnected ? '#6ee7b7' : '#fca5a5',
              border: `1px solid ${wsConnected ? 'rgba(5, 150, 105, 0.3)' : 'rgba(185, 28, 28, 0.3)'}`,
            }}
          >
            {wsConnected ? '● Connected' : '○ Disconnected'}
          </span>
        </div>
      </div>

      {/* Video Modal */}
      {showVideo && videoUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
          onClick={() => setShowVideo(false)}
        >
          <div
            className="relative w-full max-w-2xl rounded-2xl overflow-hidden"
            style={{ border: '2px solid rgba(168, 85, 247, 0.6)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3"
              style={{ background: 'rgba(30, 27, 75, 0.95)' }}>
              <span className="text-white font-bold">🎬 Your Story Video</span>
              <button
                onClick={() => setShowVideo(false)}
                className="text-purple-300 hover:text-white text-2xl transition-colors"
              >✕</button>
            </div>
            <video
              src={`${BACKEND_URL}${videoUrl}`}
              controls
              autoPlay
              loop
              className="w-full"
              style={{ background: '#000' }}
            />
          </div>
        </div>
      )}
    </main>
  )
}
