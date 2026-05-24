import { useMissionStore } from '../store/missionStore'

let ttsQueue: string[] = []
let ttsActive = false
let playbackQueue: any[] = []
let playbackTimer: ReturnType<typeof window.setTimeout> | null = null
let currentAudio: HTMLAudioElement | null = null
let audioContext: AudioContext | null = null
let audioUnlocked = false

const TTS_SETTINGS = {
  defaultVoice: 'F4',
  lang: 'en',
  maxQueue: 120,
}

const TTS_EVENT_MESSAGES: Record<string, string> = {
  'GRAVITY TURN': 'Gravity turn initiated.',
  'MECO': 'Main engine cutoff. Stage one burnout.',
  'STAGE SEP': 'Stage separation confirmed.',
  'SES-1': 'Stage two ignition.',
  'FAIRING SEP': 'Payload fairing jettisoned.',
  'SECO': 'Second engine cutoff.',
  'PAYLOAD SEP': 'Payload separation. Satellite deployment.',
  'MAX-Q': 'Max Q.',
  'ENGINE FAILURE': 'Warning. Engine failure detected.',
  'ORBIT ACHIEVED': 'Orbit achieved. Mission success.',
  'ABORT': 'Mission abort.',
  'IMPACT': 'Vehicle impact. Mission terminated.',
}

function setTtsStatus(status: string) {
  useMissionStore.getState().setTTSStatus(status)
}

function unlockBrowserAudio() {
  if (audioUnlocked) return

  const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext
  if (!AudioContextCtor) return

  audioContext = audioContext || new AudioContextCtor()

  if (audioContext.state === 'suspended') {
    audioContext.resume().catch(() => undefined)
  }

  const source = audioContext.createBufferSource()
  const gain = audioContext.createGain()
  const buffer = audioContext.createBuffer(1, 1, 22050)

  gain.gain.value = 0
  source.buffer = buffer
  source.connect(gain)
  gain.connect(audioContext.destination)
  source.start(0)

  audioUnlocked = true
}

function enqueueTts(text: string) {
  const cleaned = text.trim()
  if (!cleaned) return

  if (ttsQueue.length >= TTS_SETTINGS.maxQueue) {
    ttsQueue = ttsQueue.slice(1)
  }

  ttsQueue.push(cleaned)

  if (!ttsActive) {
    flushTTS()
  }
}

function speak(text: string) {
  const store = useMissionStore.getState()

  if (!store.ttsEnabled) return

  enqueueTts(text)
}

async function fetchTtsAudio(body: string, query: string) {
  const backendOrigin = `${window.location.protocol}//${window.location.hostname}:8000`
  const attempts = [
    {
      url: `/api/tts/supertonic?t=${Date.now()}`,
      init: {
        method: 'POST',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
        body,
      },
    },
    {
      url: `/api/tts/supertonic?${query}`,
      init: {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    },
    {
      url: `${backendOrigin}/api/tts/supertonic?${query}`,
      init: {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    },
  ] as const

  let lastError: unknown = null

  for (const attempt of attempts) {
    try {
      const response = await fetch(attempt.url, attempt.init)

      if (response.status === 404 || response.status === 405) {
        lastError = new Error(`${response.status} ${response.statusText}`)
        continue
      }

      return response
    } catch (error) {
      lastError = error
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('TTS backend is not reachable')
}

async function flushTTS() {
  if (ttsQueue.length === 0) {
    ttsActive = false
    return
  }

  ttsActive = true

  const text = ttsQueue.shift()

  if (!text) {
    ttsActive = false
    return
  }

  try {
    const store = useMissionStore.getState()
    setTtsStatus(`generating ${store.ttsVoice} - wait`)
    console.info('[IGNICULLUS TTS] request start', {
      voice: store.ttsVoice || TTS_SETTINGS.defaultVoice,
      chars: text.length,
    })

    const startedAt = performance.now()
    const body = JSON.stringify({
      text,
      voice: store.ttsVoice || TTS_SETTINGS.defaultVoice,
      lang: TTS_SETTINGS.lang,
    })
    const query = new URLSearchParams({
      t: String(Date.now()),
      text,
      voice: store.ttsVoice || TTS_SETTINGS.defaultVoice,
      lang: TTS_SETTINGS.lang,
    }).toString()

    const response = await fetchTtsAudio(body, query)

    if (!response.ok) {
      throw new Error(await response.text())
    }

    setTtsStatus(`downloading audio ${store.ttsVoice}`)
    const blob = await response.blob()
    console.info('[IGNICULLUS TTS] audio received', {
      voice: store.ttsVoice || TTS_SETTINGS.defaultVoice,
      bytes: blob.size,
      ms: Math.round(performance.now() - startedAt),
    })

    const url = URL.createObjectURL(blob)
    const audio = new Audio(url)

    currentAudio = audio

    audio.onended = () => {
      URL.revokeObjectURL(url)
      currentAudio = null
      setTtsStatus('ready')
      flushTTS()
    }

    audio.onerror = () => {
      URL.revokeObjectURL(url)
      currentAudio = null
      setTtsStatus('audio playback error')
      flushTTS()
    }

    setTtsStatus(`playing ${store.ttsVoice}`)
    await audio.play()
  } catch (error) {
    console.warn('Supertonic TTS error:', error)
    setTtsStatus(error instanceof Error ? error.message : 'Supertonic TTS error')
    flushTTS()
  }
}

function clearPlayback() {
  playbackQueue = []

  if (playbackTimer) {
    window.clearTimeout(playbackTimer)
    playbackTimer = null
  }
}

function processSimulationMessage(msg: any) {
  const s = useMissionStore.getState()

  if (msg.type === 'telemetry') {
    s.addTelemetry(msg)
  } else if (msg.type === 'event') {
    s.addEvent({
      time: msg.time,
      name: msg.name,
      desc: msg.desc,
      icon: msg.icon
    })

    const ttsText = TTS_EVENT_MESSAGES[msg.name]
    if (ttsText) {
      if (msg.name === 'MAX-Q') {
        speak(`Max Q. ${msg.desc}`)
        return
      }
      if (msg.name === 'ABORT') {
        speak(`Mission abort. ${msg.desc}`)
        return
      }
      speak(ttsText)
    }
  } else if (msg.type === 'complete') {
    s.setOrbit(msg.orbit, msg.fail_reason || '')
    s.setStatus(msg.orbit ? 'complete' : 'failed')
    s.setSimPaused(false)
    s.wsRef?.close()

    if (msg.orbit) {
      speak('Mission complete. Orbit achieved.')
    } else {
      speak(`Mission failed. ${msg.fail_reason || 'Orbit was not achieved.'}`)
    }
  } else if (msg.type === 'error') {
    s.setStatus('failed')
    s.setOrbit(false, msg.message)
    s.setSimPaused(false)
    s.wsRef?.close()
    speak(`Mission error. ${msg.message}`)
  }
}

function schedulePlayback() {
  if (playbackTimer) return

  const store = useMissionStore.getState()
  if (store.simPaused || store.status !== 'running') return
  if (playbackQueue.length === 0) return

  const msg = playbackQueue.shift()
  processSimulationMessage(msg)

  const speed = Math.max(1, Math.min(useMissionStore.getState().animSpeed, 30))
  const delayMs = Math.max(4, 80 / speed)

  playbackTimer = window.setTimeout(() => {
    playbackTimer = null
    schedulePlayback()
  }, delayMs)
}

function enqueueSimulationMessage(msg: any) {
  playbackQueue.push(msg)
  schedulePlayback()
}

export function launchSimulation() {
  unlockBrowserAudio()
  const store = useMissionStore.getState()

  if (currentAudio) {
    currentAudio.pause()
    currentAudio = null
  }

  ttsQueue = []
  ttsActive = false

  clearPlayback()
  store.reset()
  store.setStatus('running')

  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
  const host = window.location.hostname
  const ws = new WebSocket(`${proto}://${host}:8000/ws/simulate`)

  store.setWs(ws)

  ws.onopen = () => {
    const payload = {
      rocket: store.rocket,
      scenario: store.scenarioId,
      atmosphere: store.atmosphere,
      sim: store.simConfig,
      speed: 30,
    }

    ws.send(JSON.stringify(payload))
  }

  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data)

    if (msg.type === 'start') {
      speak(`Launch sequence initiated. ${msg.rocket_name}, ${msg.scenario} scenario. T minus zero.`)
      return
    }

    enqueueSimulationMessage(msg)
  }

  ws.onerror = () => {
    useMissionStore.getState().setStatus('failed')
    useMissionStore.getState().setOrbit(false, 'WebSocket connection error')
    speak('WebSocket connection error. Mission failed.')
  }
}

export function abortSimulation() {
  const ws = useMissionStore.getState().wsRef

  clearPlayback()

  if (ws) {
    ws.close()
  }

  if (currentAudio) {
    currentAudio.pause()
    currentAudio = null
  }

  ttsQueue = []
  ttsActive = false

  useMissionStore.getState().setStatus('idle')
  useMissionStore.getState().setSimPaused(false)
}

export function pauseSimulation() {
  useMissionStore.getState().setSimPaused(true)

  if (playbackTimer) {
    window.clearTimeout(playbackTimer)
    playbackTimer = null
  }
}

export function resumeSimulation() {
  useMissionStore.getState().setSimPaused(false)
  schedulePlayback()
}

export function getAvailableTtsVoices() {
  return ['F4', 'F1', 'F2', 'F3', 'F5', 'M1', 'M2', 'M3', 'M4', 'M5'].map(voice => ({
    id: voice,
    name: `Supertonic 3 ${voice}`,
    lang: 'en',
  }))
}

export function testTtsVoice() {
  unlockBrowserAudio()

  if (currentAudio) {
    currentAudio.pause()
    currentAudio = null
  }

  ttsQueue = []
  ttsActive = false
  speak('Supertonic three voice test. Ignicullus telemetry online.')
}
