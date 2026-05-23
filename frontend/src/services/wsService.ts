import { useMissionStore } from '../store/missionStore'

let ttsQueue: string[] = []
let ttsActive = false

function speak(text: string) {
  if (!useMissionStore.getState().ttsEnabled) return
  ttsQueue.push(text)
  if (!ttsActive) flushTTS()
}
function flushTTS() {
  if (ttsQueue.length === 0) { ttsActive = false; return }
  ttsActive = true
  const u = new SpeechSynthesisUtterance(ttsQueue.shift()!)
  u.lang = 'en-US'; u.rate = 1.05; u.volume = 1.0
  u.onend = flushTTS
  window.speechSynthesis.speak(u)
}

export function launchSimulation() {
  const store = useMissionStore.getState()
  store.reset()
  store.setStatus('running')

  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
  const host  = window.location.hostname
  const ws    = new WebSocket(`${proto}://${host}:8000/ws/simulate`)
  store.setWs(ws)

  ws.onopen = () => {
    const payload = {
      rocket:     store.rocket,
      scenario:   store.scenarioId,
      atmosphere: store.atmosphere,
      sim:        store.simConfig,
      speed:      store.animSpeed,
    }
    ws.send(JSON.stringify(payload))
  }

  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data)
    const s = useMissionStore.getState()

    if (msg.type === 'start') {
      speak(`Launch sequence initiated. ${msg.rocket_name}, ${msg.scenario} scenario. T minus zero.`)
    }
    else if (msg.type === 'telemetry') {
      s.addTelemetry(msg)
    }
    else if (msg.type === 'event') {
      s.addEvent({ time: msg.time, name: msg.name, desc: msg.desc, icon: msg.icon })
      const ttsMap: Record<string, string> = {
        'GRAVITY TURN': 'Gravity turn initiated.',
        'MECO':         'Main engine cutoff. Stage one burnout.',
        'STAGE SEP':    'Stage separation confirmed.',
        'SES-1':        'Stage two ignition.',
        'FAIRING SEP':  'Payload fairing jettisoned.',
        'SECO':         'Second engine cutoff.',
        'PAYLOAD SEP':  'Payload separation. Satellite deployment.',
        'MAX-Q':        `Max Q. ${msg.desc}`,
        'ENGINE FAILURE':'Warning! Engine failure detected!',
        'ORBIT ACHIEVED':'Orbit achieved! Mission success!',
        'ABORT':        `Mission abort. ${msg.desc}`,
        'IMPACT':       'Vehicle impact. Mission terminated.',
      }
      if (ttsMap[msg.name]) speak(ttsMap[msg.name])
    }
    else if (msg.type === 'complete') {
      s.setOrbit(msg.orbit, msg.fail_reason || '')
      s.setStatus(msg.orbit ? 'complete' : 'failed')
      ws.close()
    }
    else if (msg.type === 'error') {
      s.setStatus('failed')
      s.setOrbit(false, msg.message)
    }
  }

  ws.onerror = () => {
    useMissionStore.getState().setStatus('failed')
    useMissionStore.getState().setOrbit(false, 'WebSocket connection error')
  }
}

export function abortSimulation() {
  const ws = useMissionStore.getState().wsRef
  if (ws) ws.close()
  useMissionStore.getState().setStatus('idle')
}
