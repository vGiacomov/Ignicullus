import { useMissionStore } from '../store/missionStore'

let ttsQueue: string[] = []
let ttsActive = false
let ttsUnlocked = false
let cachedVoice: SpeechSynthesisVoice | null = null

const TTS_SETTINGS = {
  rate: 1.05,
  pitch: 1.0,
  f4Pitch: 1.15,
  volume: 1.0,
  maxQueue: 120,
  preferredFemaleVoice: [
    'f4',
    'f-4',
    'female',
    'zira',
    'samantha',
    'hazel',
    'susan',
    'amelia',
    'aria',
    'candice',
    'helen',
    'ivy',
    'jenny',
    'karen',
    'luna',
    'olivia',
    'sara',
    'sarah',
  ],
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

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.addEventListener('voiceschanged', () => {
    cachedVoice = null
  })
}

function canUseTTS() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

function unlockTTS() {
  if (!canUseTTS()) return
  if (ttsUnlocked) return

  try {
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(' ')
    utterance.lang = 'en-US'
    utterance.volume = 0

    window.speechSynthesis.speak(utterance)
    ttsUnlocked = true
  } catch (error) {
    console.warn('TTS unlock error:', error)
  }
}

function resolveCachedVoice() {
  if (!canUseTTS()) return null
  if (cachedVoice) return cachedVoice

  const voices = window.speechSynthesis.getVoices()
  if (!voices.length) return null

  const toLower = (value: string) => value.toLowerCase()
  const isFemaleHint = (v: SpeechSynthesisVoice) => {
    const candidate = `${v.name} ${v.voiceURI}`.toLowerCase()
    return TTS_SETTINGS.preferredFemaleVoice.some(hint => candidate.includes(hint))
  }

  const f4ByExact = voices.find(v => toLower(v.name).includes('f4') || toLower(v.voiceURI).includes('f4'))
  const likelyFemale = voices.find(v => toLower(v.lang).startsWith('en') && isFemaleHint(v))
  const anyFemale = voices.find(v => isFemaleHint(v))

  cachedVoice =
    f4ByExact ||
    likelyFemale ||
    anyFemale ||
    voices.find(v => v.lang === 'en-US') ||
    voices.find(v => v.lang.startsWith('en')) ||
    voices[0] ||
    null

  return cachedVoice
}

function getVoice() {
  return resolveCachedVoice()
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
  if (!canUseTTS()) return

  unlockTTS()
  enqueueTts(text)
}

function flushTTS() {
  if (!canUseTTS()) {
    ttsActive = false
    return
  }

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

  const utterance = new SpeechSynthesisUtterance(text)
  const voice = getVoice()
  const hasFemalePreference = !!(voice && (
    `${voice.name} ${voice.voiceURI}`.toLowerCase().includes('f4') ||
    TTS_SETTINGS.preferredFemaleVoice.some((hint) =>
      `${voice.name} ${voice.voiceURI}`.toLowerCase().includes(hint)
    )
  ))

  if (voice) {
    utterance.voice = voice
  }

  utterance.lang = voice?.lang || 'en-US'
  utterance.rate = TTS_SETTINGS.rate
  utterance.pitch = hasFemalePreference ? TTS_SETTINGS.f4Pitch : TTS_SETTINGS.pitch
  utterance.volume = TTS_SETTINGS.volume

  utterance.onend = () => {
    flushTTS()
  }

  utterance.onerror = () => {
    flushTTS()
  }

  window.speechSynthesis.speak(utterance)
}

export function launchSimulation() {
  unlockTTS()

  const store = useMissionStore.getState()

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
      speed: store.animSpeed,
    }

    ws.send(JSON.stringify(payload))
  }

  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data)
    const s = useMissionStore.getState()

    if (msg.type === 'start') {
      speak(`Launch sequence initiated. ${msg.rocket_name}, ${msg.scenario} scenario. T minus zero.`)
    } else if (msg.type === 'telemetry') {
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

      if (msg.orbit) {
        speak('Mission complete. Orbit achieved.')
      } else {
        speak(`Mission failed. ${msg.fail_reason || 'Orbit was not achieved.'}`)
      }

      ws.close()
    } else if (msg.type === 'error') {
      s.setStatus('failed')
      s.setOrbit(false, msg.message)
      speak(`Mission error. ${msg.message}`)
    }
  }

  ws.onerror = () => {
    useMissionStore.getState().setStatus('failed')
    useMissionStore.getState().setOrbit(false, 'WebSocket connection error')
    speak('WebSocket connection error. Mission failed.')
  }
}

export function abortSimulation() {
  const ws = useMissionStore.getState().wsRef

  if (ws) {
    ws.close()
  }

  if (canUseTTS()) {
    window.speechSynthesis.cancel()
  }

  ttsQueue = []
  ttsActive = false

  useMissionStore.getState().setStatus('idle')
}
