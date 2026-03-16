'use client'

// =============================================
// HOME / SETUP PAGE
// Children pick a hero name, world name, and genre
// then POST to the backend to start their story
// =============================================

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Backend URL comes from .env.local
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

// Genre options with emoji, label, and a short teaser description
const GENRES = [
  {
    id: 'fantasy',
    emoji: '🧙‍♂️',
    label: 'Fantasy',
    desc: 'Magic spells, dragons & enchanted kingdoms',
  },
  {
    id: 'adventure',
    emoji: '🗺️',
    label: 'Adventure',
    desc: 'Daring quests, hidden treasures & brave heroes',
  },
  {
    id: 'mystery',
    emoji: '🔍',
    label: 'Mystery',
    desc: 'Puzzles, secrets & tricky clues to solve',
  },
  {
    id: 'space',
    emoji: '🚀',
    label: 'Space',
    desc: 'Alien worlds, starships & cosmic wonders',
  },
]

// Generate a unique session ID based on current timestamp
function generateSessionId() {
  return `session_${Date.now()}`
}

// ─── StarField Component ─────────────────────────────────────────────────────
// Renders many small twinkling stars in the background
function StarField() {
  // We build 80 stars with random positions and animation timings
  const stars = Array.from({ length: 80 }, (_, i) => ({
    id: i,
    top: `${Math.random() * 100}%`,
    left: `${Math.random() * 100}%`,
    delay: `${(Math.random() * 5).toFixed(1)}s`,
    duration: `${(2 + Math.random() * 4).toFixed(1)}s`,
    large: Math.random() > 0.7,
  }))

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      {stars.map((star) => (
        <span
          key={star.id}
          className={`star ${star.large ? 'star-lg' : ''}`}
          style={{
            top: star.top,
            left: star.left,
            '--twinkle-delay': star.delay,
            '--twinkle-duration': star.duration,
          }}
        />
      ))}
    </div>
  )
}

// ─── Main Page Component ─────────────────────────────────────────────────────
export default function HomePage() {
  const router = useRouter()

  // Form state
  const [heroName, setHeroName] = useState('')
  const [worldName, setWorldName] = useState('')
  const [selectedGenre, setSelectedGenre] = useState(null)

  // UI state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // ── Start the adventure ───────────────────────────────────────────────────
  async function handleStart() {
    // Basic validation
    if (!heroName.trim()) {
      setError('Please give your hero a name! 🦸')
      return
    }
    if (!worldName.trim()) {
      setError('Your magical world needs a name! 🌍')
      return
    }
    if (!selectedGenre) {
      setError('Pick a story type to begin! ✨')
      return
    }

    setError('')
    setLoading(true)

    const sessionId = generateSessionId()

    try {
      // POST to the backend to create a new story session
      const response = await fetch(`${BACKEND_URL}/api/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          hero_name: heroName.trim(),
          world_name: worldName.trim(),
          genre: selectedGenre,
        }),
      })

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`)
      }

      const firstScene = await response.json()

      // Save everything to localStorage so the story page can read it
      localStorage.setItem(
        'storybloom_session',
        JSON.stringify({
          sessionId,
          heroName: heroName.trim(),
          worldName: worldName.trim(),
          genre: selectedGenre,
          firstScene,
        })
      )

      // Navigate to the story experience
      router.push('/story')
    } catch (err) {
      console.error('Failed to start story:', err)
      setError(
        'Could not reach the story server. Is it running at ' + BACKEND_URL + '? 🔌'
      )
      setLoading(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center px-4 py-12">
      {/* Animated star background */}
      <StarField />

      {/* Main content card */}
      <div className="relative z-10 w-full max-w-2xl flex flex-col items-center gap-8">

        {/* ── Title ── */}
        <div className="text-center">
          <div className="text-7xl mb-4 float-anim select-none">📖</div>
          <h1
            className="text-6xl font-bold tracking-tight glow-title"
            style={{
              background: 'linear-gradient(135deg, #c084fc, #818cf8, #f472b6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            StoryBloom
          </h1>
          <p className="mt-3 text-purple-300 text-lg">
            Where every child becomes the hero of their own magical tale ✨
          </p>
        </div>

        {/* ── Setup Card ── */}
        <div
          className="w-full rounded-2xl p-8 flex flex-col gap-6"
          style={{
            background: 'rgba(30, 27, 75, 0.7)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            boxShadow: '0 0 40px rgba(109, 40, 217, 0.2)',
          }}
        >

          {/* Hero Name Input */}
          <div className="flex flex-col gap-2">
            <label className="text-purple-300 font-semibold text-sm uppercase tracking-widest">
              🦸 Hero Name
            </label>
            <input
              type="text"
              placeholder="What's your hero's name?"
              value={heroName}
              onChange={(e) => setHeroName(e.target.value)}
              maxLength={30}
              className="w-full rounded-xl px-5 py-4 text-xl text-white placeholder-purple-400
                         outline-none transition-all duration-200"
              style={{
                background: 'rgba(76, 29, 149, 0.4)',
                border: '2px solid rgba(139, 92, 246, 0.4)',
              }}
              onFocus={(e) =>
                (e.target.style.border = '2px solid rgba(168, 85, 247, 0.9)')
              }
              onBlur={(e) =>
                (e.target.style.border = '2px solid rgba(139, 92, 246, 0.4)')
              }
            />
          </div>

          {/* World Name Input */}
          <div className="flex flex-col gap-2">
            <label className="text-purple-300 font-semibold text-sm uppercase tracking-widest">
              🌍 World Name
            </label>
            <input
              type="text"
              placeholder="Name your magical world..."
              value={worldName}
              onChange={(e) => setWorldName(e.target.value)}
              maxLength={40}
              className="w-full rounded-xl px-5 py-4 text-xl text-white placeholder-purple-400
                         outline-none transition-all duration-200"
              style={{
                background: 'rgba(76, 29, 149, 0.4)',
                border: '2px solid rgba(139, 92, 246, 0.4)',
              }}
              onFocus={(e) =>
                (e.target.style.border = '2px solid rgba(168, 85, 247, 0.9)')
              }
              onBlur={(e) =>
                (e.target.style.border = '2px solid rgba(139, 92, 246, 0.4)')
              }
            />
          </div>

          {/* Genre Selection Grid */}
          <div className="flex flex-col gap-3">
            <label className="text-purple-300 font-semibold text-sm uppercase tracking-widest">
              📚 Story Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              {GENRES.map((genre) => (
                <button
                  key={genre.id}
                  onClick={() => setSelectedGenre(genre.id)}
                  className={`genre-card rounded-xl p-4 text-left ${
                    selectedGenre === genre.id ? 'selected' : ''
                  }`}
                  style={{
                    background:
                      selectedGenre === genre.id
                        ? 'rgba(109, 40, 217, 0.6)'
                        : 'rgba(76, 29, 149, 0.3)',
                    border:
                      selectedGenre === genre.id
                        ? '2px solid #a855f7'
                        : '2px solid rgba(139, 92, 246, 0.25)',
                  }}
                >
                  <div className="text-4xl mb-1">{genre.emoji}</div>
                  <div className="text-white font-bold text-lg">{genre.label}</div>
                  <div className="text-purple-300 text-sm mt-1 leading-snug">
                    {genre.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div
              className="rounded-xl px-4 py-3 text-center text-red-200 text-sm font-medium"
              style={{ background: 'rgba(185, 28, 28, 0.3)', border: '1px solid rgba(239, 68, 68, 0.4)' }}
            >
              {error}
            </div>
          )}

          {/* Start Button */}
          <button
            onClick={handleStart}
            disabled={loading}
            className="w-full rounded-2xl py-5 text-2xl font-bold text-white
                       transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              background: loading
                ? 'linear-gradient(135deg, #4c1d95, #5b21b6)'
                : 'linear-gradient(135deg, #7c3aed, #a855f7, #ec4899)',
              boxShadow: loading
                ? 'none'
                : '0 0 30px rgba(168, 85, 247, 0.5), 0 4px 15px rgba(0,0,0,0.3)',
              transform: loading ? 'scale(0.98)' : 'scale(1)',
            }}
            onMouseEnter={(e) => {
              if (!loading) e.currentTarget.style.transform = 'scale(1.02)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)'
            }}
          >
            {loading ? '✨ Creating your world...' : 'Start Adventure! 🚀'}
          </button>
        </div>

        {/* Footer */}
        <p className="text-purple-500 text-sm text-center">
          Powered by AI magic ✨ • Every story is unique just for you
        </p>
      </div>
    </main>
  )
}
