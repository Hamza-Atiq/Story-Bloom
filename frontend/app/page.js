'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

const GENRES = [
  { id: 'fantasy',   emoji: '🧙‍♂️', label: 'Fantasy',   desc: 'Magic spells, dragons & enchanted kingdoms' },
  { id: 'adventure', emoji: '🗺️',  label: 'Adventure', desc: 'Daring quests, hidden treasures & brave heroes' },
  { id: 'mystery',   emoji: '🔍',  label: 'Mystery',   desc: 'Puzzles, secrets & tricky clues to solve' },
  { id: 'space',     emoji: '🚀',  label: 'Space',     desc: 'Alien worlds, starships & cosmic wonders' },
]

// Auto-fill world name when a child picks an animal but leaves world name empty
const ANIMAL_WORLDS = {
  cow: 'Sunny Farm',      goat: 'Green Meadow',    hen: 'Happy Barnyard',
  duck: 'Pond Village',   horse: 'Wild Prairie',   sheep: 'Woolly Hills',
  pig: 'Muddy Farm',      lion: 'Safari Kingdom',  elephant: 'Jungle Land',
  monkey: 'Treetop City', parrot: 'Parrot Island', owl: 'Enchanted Forest',
  cat: 'Magic Garden',    dog: 'Adventure Park',   rabbit: 'Bunny Burrow',
  frog: 'Lily Pond',      penguin: 'Icy World',    deer: 'Misty Forest',
}

// Base URL for verified animal sound files on animal-sounds.org
// These are direct WAV files — HTMLMediaElement loads them without CORS issues.
const S = 'https://www.animal-sounds.org'

const ANIMALS = [
  // Village animals — all have verified real recordings
  { id: 'cow',      emoji: '🐄', name: 'Cow',      sound: 'Mooo!',          soundUrl: `${S}/farm/Cow%20animals055.wav` },
  { id: 'goat',     emoji: '🐐', name: 'Goat',     sound: 'Baa baa!',       soundUrl: `${S}/farm/Goat%20animals115.wav` },
  { id: 'hen',      emoji: '🐔', name: 'Hen',      sound: 'Cluck cluck!',   soundUrl: `${S}/farm/Chicken%20coop%20animals050.wav` },
  { id: 'duck',     emoji: '🦆', name: 'Duck',     sound: 'Quack quack!',   soundUrl: `${S}/farm/Duck-quacking%20animals038.wav` },
  { id: 'horse',    emoji: '🐴', name: 'Horse',    sound: 'Neigh!',         soundUrl: `${S}/farm/Horse%20whinny%20animals126.wav` },
  { id: 'sheep',    emoji: '🐑', name: 'Sheep',    sound: 'Baa baa!',       soundUrl: `${S}/farm/Sheep%20animals057.wav` },
  { id: 'pig',      emoji: '🐷', name: 'Pig',      sound: 'Oink oink!',     soundUrl: `${S}/farm/Pig%20squeal%20animals024.wav` },
  // Wild & fun animals
  { id: 'lion',     emoji: '🦁', name: 'Lion',     sound: 'Roar!',          soundUrl: `${S}/jungle/Lion%20roar%20animals031.wav` },
  { id: 'elephant', emoji: '🐘', name: 'Elephant', sound: 'Pawoo!',         soundUrl: `${S}/jungle/Elephant%20trumpeting%20animals129.wav` },
  { id: 'monkey',   emoji: '🐒', name: 'Monkey',   sound: 'Ooh ooh aah!',  soundUrl: `${S}/jungle/Monkey%20chatter%20animals059.wav` },
  { id: 'parrot',   emoji: '🦜', name: 'Parrot',   sound: 'Squawk!',        soundUrl: `${S}/Air/Macaw%20parrot%20animals081.wav` },
  { id: 'owl',      emoji: '🦉', name: 'Owl',      sound: 'Hoo hoo!',       soundUrl: `${S}/Air/owl%20animals074.wav` },
  // These use voice fallback (not on animal-sounds.org)
  { id: 'cat',      emoji: '🐱', name: 'Cat',      sound: 'Meow meow!',     soundUrl: null },
  { id: 'dog',      emoji: '🐶', name: 'Dog',      sound: 'Woof woof!',     soundUrl: null },
  { id: 'rabbit',   emoji: '🐰', name: 'Rabbit',   sound: 'Squeak squeak!', soundUrl: null },
  { id: 'frog',     emoji: '🐸', name: 'Frog',     sound: 'Ribbit ribbit!', soundUrl: null },
  { id: 'penguin',  emoji: '🐧', name: 'Penguin',  sound: 'Squeak squeak!', soundUrl: null },
  { id: 'deer',     emoji: '🦌', name: 'Deer',     sound: 'Snort snort!',   soundUrl: null },
]

function generateSessionId() {
  return `session_${Date.now()}`
}

function StarField() {
  const [stars, setStars] = useState([])

  useEffect(() => {
    setStars(Array.from({ length: 80 }, (_, i) => ({
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
      {stars.map((star) => (
        <span
          key={star.id}
          className={`star ${star.large ? 'star-lg' : ''}`}
          style={{ top: star.top, left: star.left, '--twinkle-delay': star.delay, '--twinkle-duration': star.duration }}
        />
      ))}
    </div>
  )
}

export default function HomePage() {
  const router = useRouter()
  const [heroName, setHeroName] = useState('')
  const [worldName, setWorldName] = useState('')
  const [selectedGenre, setSelectedGenre] = useState(null)
  const [selectedAnimal, setSelectedAnimal] = useState(null)
  const [lastSoundAnimal, setLastSoundAnimal] = useState(null)
  const [listeningField, setListeningField] = useState(null) // 'hero' | 'world' | null
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const recognitionRef = useRef(null)

  function speakText(text, rate = 0.85, pitch = 1.2) {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window)) { resolve(); return }
      const utt = new SpeechSynthesisUtterance(text)
      utt.rate = rate
      utt.pitch = pitch
      utt.volume = 1.0
      utt.onend = resolve
      utt.onerror = resolve
      window.speechSynthesis.speak(utt)
    })
  }

  async function playAnimalSound(animal) {
    setSelectedAnimal(animal.id)
    setLastSoundAnimal(animal.id)
    setTimeout(() => setLastSoundAnimal(null), 600)

    // Step 1 — speak the animal's name clearly
    window.speechSynthesis?.cancel()
    await speakText(animal.name, 0.8, 1.2)

    // Step 2 — play verified real animal sound (HTMLMediaElement, no CORS restrictions)
    if (animal.soundUrl) {
      try {
        const audio = new Audio(animal.soundUrl)
        audio.volume = 1.0
        await audio.play()
        return  // real sound played — done
      } catch {
        // File failed to load — fall through to voice fallback
      }
    }

    // Step 3 — voice fallback for animals without a sound file
    const lowPitch = animal.id === 'lion' || animal.id === 'elephant'
    await speakText(animal.sound, 0.75, lowPitch ? 0.65 : 1.1)
  }

  function deselectAnimal() {
    setSelectedAnimal(null)
    window.speechSynthesis?.cancel()
  }

  function startVoiceForField(field) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setError('Voice input is not supported in this browser 🎤')
      return
    }

    // Tap again while listening → stop and keep whatever was captured
    if (listeningField === field) {
      recognitionRef.current?.stop()
      setListeningField(null)
      return
    }

    // Stop any previous recognition cleanly
    if (recognitionRef.current) {
      recognitionRef.current.abort()
      recognitionRef.current = null
    }
    window.speechSynthesis?.cancel()

    const recognition = new SpeechRecognition()
    recognitionRef.current = recognition
    recognition.lang = 'en-US'
    recognition.interimResults = true   // fill field in real-time as you speak
    recognition.continuous = false      // auto-stop after a single utterance
    recognition.maxAlternatives = 1

    recognition.onstart = () => { setListeningField(field); setError('') }

    recognition.onresult = (event) => {
      // Collect all results — interim (partial) and final
      let transcript = ''
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript
      }
      // Update the field live as words are recognised
      if (field === 'hero')  setHeroName(transcript)
      if (field === 'world') setWorldName(transcript)
    }

    recognition.onerror = (event) => {
      setListeningField(null)
      if (event.error === 'not-allowed') {
        setError('Microphone permission denied — please allow access in your browser.')
      } else if (event.error !== 'aborted') {
        setError(`Voice error: ${event.error}`)
      }
    }

    recognition.onend = () => {
      setListeningField(null)
      recognitionRef.current = null
    }

    try {
      recognition.start()
    } catch (e) {
      setError('Could not start voice input. Try again.')
      setListeningField(null)
    }
  }

  async function handleStart() {
    // When an animal is selected, missing fields get smart defaults —
    // so a child can start a story by just tapping an animal.
    const finalHero  = heroName.trim()  || (selectedAnimal ? 'Little Hero' : '')
    const finalWorld = worldName.trim() || (selectedAnimal ? (ANIMAL_WORLDS[selectedAnimal] ?? 'Magical Land') : '')
    const finalGenre = selectedGenre    || (selectedAnimal ? 'adventure' : null)

    if (!finalHero)  { setError('Please give your hero a name! 🦸'); return }
    if (!finalWorld) { setError('Your magical world needs a name! 🌍'); return }
    if (!finalGenre) { setError('Pick a story type to begin! ✨'); return }

    setError('')
    setLoading(true)
    const sessionId = generateSessionId()

    try {
      const response = await fetch(`${BACKEND_URL}/api/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          hero_name: finalHero,
          world_name: finalWorld,
          genre: finalGenre,
          animal: selectedAnimal || null,
        }),
      })
      if (!response.ok) throw new Error(`Server error: ${response.status}`)
      const firstScene = await response.json()

      localStorage.setItem('storybloom_session', JSON.stringify({
        sessionId,
        heroName: finalHero,
        worldName: finalWorld,
        genre: finalGenre,
        animal: selectedAnimal,
        firstScene,
      }))
      router.push('/story')
    } catch (err) {
      console.error('Failed to start story:', err)
      setError('Could not reach the story server. Is it running at ' + BACKEND_URL + '? 🔌')
      setLoading(false)
    }
  }

  return (
    <main className="relative h-screen overflow-hidden flex flex-col items-center px-4 py-6">
      <StarField />

      <div className="relative z-10 w-full max-w-6xl flex flex-col gap-4 h-full overflow-hidden">

        {/* Title */}
        <div className="text-center flex-shrink-0">
          <div className="text-4xl mb-1 float-anim select-none">📖</div>
          <h1 className="text-4xl font-bold tracking-tight glow-title"
            style={{ background: 'linear-gradient(135deg, #c084fc, #818cf8, #f472b6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            StoryBloom
          </h1>
          <p className="mt-1 text-purple-300 text-sm">
            Where every child becomes the hero of their own magical tale ✨
          </p>
        </div>

        {/* Two-column layout */}
        <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0">

          {/* ── LEFT COLUMN: Story Setup ── */}
          <div className="rounded-2xl p-6 flex flex-col gap-4 overflow-y-auto"
            style={{ background: 'rgba(30, 27, 75, 0.7)', backdropFilter: 'blur(12px)', border: '1px solid rgba(139, 92, 246, 0.3)', boxShadow: '0 0 40px rgba(109, 40, 217, 0.2)' }}>

            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">📝</span>
              <h2 className="text-xl font-bold text-white">Story Setup</h2>
            </div>

            {/* Hero Name */}
            <div className="flex flex-col gap-2">
              <label className="text-purple-300 font-semibold text-sm uppercase tracking-widest">🦸 Hero Name</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={selectedAnimal ? "Optional — will use 'Little Hero'" : "What's your hero's name?"}
                  value={heroName}
                  onChange={(e) => setHeroName(e.target.value)}
                  maxLength={30}
                  className="flex-1 rounded-xl px-5 py-4 text-xl text-white placeholder-purple-400 outline-none transition-all duration-200"
                  style={{ background: 'rgba(76, 29, 149, 0.4)', border: '2px solid rgba(139, 92, 246, 0.4)' }}
                  onFocus={(e) => (e.target.style.border = '2px solid rgba(168, 85, 247, 0.9)')}
                  onBlur={(e)  => (e.target.style.border = '2px solid rgba(139, 92, 246, 0.4)')}
                />
                <button
                  onClick={() => startVoiceForField('hero')}
                  title="Speak your hero's name"
                  className={`px-4 rounded-xl text-white text-xl font-bold transition-all duration-200 ${listeningField === 'hero' ? 'animate-pulse' : ''}`}
                  style={{
                    background: listeningField === 'hero'
                      ? 'linear-gradient(135deg, #dc2626, #ef4444)'
                      : 'linear-gradient(135deg, #4c1d95, #7c3aed)',
                    boxShadow: listeningField === 'hero' ? '0 0 16px rgba(239,68,68,0.6)' : 'none',
                    minWidth: '52px',
                  }}
                >
                  🎤
                </button>
              </div>
              {listeningField === 'hero' && (
                <p className="text-xs text-purple-300 animate-pulse">🎤 Listening for hero name... tap mic to stop</p>
              )}
            </div>

            {/* World Name */}
            <div className="flex flex-col gap-2">
              <label className="text-purple-300 font-semibold text-sm uppercase tracking-widest">🌍 World Name</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={selectedAnimal ? `Optional — will use '${ANIMAL_WORLDS[selectedAnimal] ?? 'Magical Land'}'` : 'Name your magical world...'}
                  value={worldName}
                  onChange={(e) => setWorldName(e.target.value)}
                  maxLength={40}
                  className="flex-1 rounded-xl px-5 py-4 text-xl text-white placeholder-purple-400 outline-none transition-all duration-200"
                  style={{ background: 'rgba(76, 29, 149, 0.4)', border: '2px solid rgba(139, 92, 246, 0.4)' }}
                  onFocus={(e) => (e.target.style.border = '2px solid rgba(168, 85, 247, 0.9)')}
                  onBlur={(e)  => (e.target.style.border = '2px solid rgba(139, 92, 246, 0.4)')}
                />
                <button
                  onClick={() => startVoiceForField('world')}
                  title="Speak your world's name"
                  className={`px-4 rounded-xl text-white text-xl font-bold transition-all duration-200 ${listeningField === 'world' ? 'animate-pulse' : ''}`}
                  style={{
                    background: listeningField === 'world'
                      ? 'linear-gradient(135deg, #dc2626, #ef4444)'
                      : 'linear-gradient(135deg, #4c1d95, #7c3aed)',
                    boxShadow: listeningField === 'world' ? '0 0 16px rgba(239,68,68,0.6)' : 'none',
                    minWidth: '52px',
                  }}
                >
                  🎤
                </button>
              </div>
              {listeningField === 'world' && (
                <p className="text-xs text-purple-300 animate-pulse">🎤 Listening for world name... tap mic to stop</p>
              )}
            </div>

            {/* Genre Selection */}
            <div className="flex flex-col gap-3">
              <label className="text-purple-300 font-semibold text-sm uppercase tracking-widest">📚 Story Type</label>
              <div className="grid grid-cols-2 gap-3">
                {GENRES.map((genre) => (
                  <button
                    key={genre.id}
                    onClick={() => setSelectedGenre(genre.id)}
                    className={`genre-card rounded-xl p-3 text-left ${selectedGenre === genre.id ? 'selected' : ''}`}
                    style={{
                      background: selectedGenre === genre.id ? 'rgba(109, 40, 217, 0.6)' : 'rgba(76, 29, 149, 0.3)',
                      border: selectedGenre === genre.id ? '2px solid #a855f7' : '2px solid rgba(139, 92, 246, 0.25)',
                    }}
                  >
                    <div className="text-3xl mb-1">{genre.emoji}</div>
                    <div className="text-white font-bold">{genre.label}</div>
                    <div className="text-purple-300 text-xs mt-1 leading-snug">{genre.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-xl px-4 py-3 text-center text-red-200 text-sm font-medium"
                style={{ background: 'rgba(185, 28, 28, 0.3)', border: '1px solid rgba(239, 68, 68, 0.4)' }}>
                {error}
              </div>
            )}

            {/* Start Button */}
            <button
              onClick={handleStart}
              disabled={loading}
              className="w-full rounded-2xl py-5 text-2xl font-bold text-white transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: loading ? 'linear-gradient(135deg, #4c1d95, #5b21b6)' : 'linear-gradient(135deg, #7c3aed, #a855f7, #ec4899)',
                boxShadow: loading ? 'none' : '0 0 30px rgba(168, 85, 247, 0.5), 0 4px 15px rgba(0,0,0,0.3)',
              }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.transform = 'scale(1.02)' }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
            >
              {loading ? '✨ Creating your world...' : 'Start Adventure! 🚀'}
            </button>
          </div>

          {/* ── RIGHT COLUMN: Animal Selection ── */}
          <div className="rounded-2xl p-6 flex flex-col gap-3 overflow-hidden"
            style={{ background: 'rgba(30, 27, 75, 0.7)', backdropFilter: 'blur(12px)', border: '1px solid rgba(139, 92, 246, 0.3)', boxShadow: '0 0 40px rgba(109, 40, 217, 0.2)' }}>

            <div className="flex items-center gap-2">
              <span className="text-2xl">🐾</span>
              <h2 className="text-xl font-bold text-white">Story Animal</h2>
              <span className="ml-auto text-xs px-2 py-1 rounded-full text-purple-300"
                style={{ background: 'rgba(109, 40, 217, 0.3)', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
                Optional
              </span>
            </div>

            <p className="text-purple-300 text-sm leading-relaxed">
              Tap any animal to hear its sound and add it as your story companion! 🎵
            </p>

            {/* Selected animal banner */}
            {selectedAnimal && (
              <div className="flex items-center justify-between rounded-xl px-4 py-3"
                style={{ background: 'rgba(109, 40, 217, 0.4)', border: '2px solid #a855f7' }}>
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{ANIMALS.find(a => a.id === selectedAnimal)?.emoji}</span>
                  <div>
                    <p className="text-white font-bold">{ANIMALS.find(a => a.id === selectedAnimal)?.name} joins the story!</p>
                    <p className="text-purple-300 text-xs">
                      {heroName.trim() ? heroName.trim() : 'Little Hero'} · {worldName.trim() ? worldName.trim() : ANIMAL_WORLDS[selectedAnimal]} · {selectedGenre ?? 'adventure'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={deselectAnimal}
                  className="text-purple-400 hover:text-white text-xl px-2 transition-colors"
                  title="Remove animal"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Animal grid — 6 columns on large screens = 3 rows × 6 = 18 animals, no scroll */}
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2 flex-1 min-h-0 content-evenly">
              {ANIMALS.map((animal) => {
                const isSelected = selectedAnimal === animal.id
                const isFlashing = lastSoundAnimal === animal.id
                return (
                  <button
                    key={animal.id}
                    onClick={() => isSelected ? deselectAnimal() : playAnimalSound(animal)}
                    className="flex flex-col items-center gap-1 rounded-xl p-2 transition-all duration-150"
                    style={{
                      background: isSelected
                        ? 'rgba(109, 40, 217, 0.6)'
                        : isFlashing
                        ? 'rgba(168, 85, 247, 0.4)'
                        : 'rgba(76, 29, 149, 0.3)',
                      border: isSelected
                        ? '2px solid #a855f7'
                        : '2px solid rgba(139, 92, 246, 0.2)',
                      transform: isFlashing ? 'scale(1.12)' : 'scale(1)',
                    }}
                  >
                    <span className="text-3xl select-none">{animal.emoji}</span>
                    <span className="text-white text-xs font-semibold text-center leading-tight">
                      {animal.name}
                    </span>
                    {isSelected && (
                      <span className="text-purple-300 text-xs">✓</span>
                    )}
                  </button>
                )
              })}
            </div>

            <p className="text-purple-500 text-xs text-center">
              🔊 Click to hear · Click again to remove
            </p>
          </div>
        </div>

        <p className="text-purple-500 text-xs text-center flex-shrink-0">
          Powered by Gemini AI ✨ • Every story is unique just for you
        </p>
      </div>
    </main>
  )
}
