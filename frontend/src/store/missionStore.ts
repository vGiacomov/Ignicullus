import { create } from 'zustand'
import type { RocketConfig, AtmosphereConfig, SimConfig,
              TelemetryPoint, MissionEvent, Scenario } from '../types'

const DEFAULT_ROCKET: RocketConfig = {
  stage1: { dry_mass:800,  prop_mass:18000, thrust:320000, isp_vac:310, isp_sl:272, burn_time:150 },
  stage2: { dry_mass:120,  prop_mass:4200,  thrust:42000,  isp_vac:340, isp_sl:300, burn_time:380 },
  payload_kg: 30, fairing_kg: 60, diameter_m: 1.2, cd_base: 0.35
}
const DEFAULT_ATM: AtmosphereConfig = {
  wind_speed_ms: 3, temperature_delta_k: 0, humidity_pct: 50, pressure_hpa: 1013.25
}
const DEFAULT_SIM: SimConfig = { dt: 0.1, max_time: 900, leo_alt_km: 400, leo_vel_ms: 7700 }

interface MissionStore {
  rocket:      RocketConfig
  atmosphere:  AtmosphereConfig
  simConfig:   SimConfig
  scenarioId:  string
  scenarios:   Scenario[]
  telemetry:   TelemetryPoint[]
  events:      MissionEvent[]
  status:      'idle'|'running'|'complete'|'failed'
  orbitAchieved: boolean
  failReason:  string
  ttsEnabled:  boolean
  ttsVoice:    string
  ttsStatus:   string
  animSpeed:   number
  simPaused:   boolean
  wsRef:       WebSocket | null

  setRocket:     (p: Partial<RocketConfig>) => void
  setStage1:     (p: Partial<RocketConfig['stage1']>) => void
  setStage2:     (p: Partial<RocketConfig['stage2']>) => void
  setAtmosphere: (p: Partial<AtmosphereConfig>) => void
  setSimConfig:  (p: Partial<SimConfig>) => void
  setScenario:   (id: string) => void
  setScenarios:  (s: Scenario[]) => void
  addTelemetry:  (p: TelemetryPoint) => void
  addEvent:      (e: MissionEvent) => void
  setStatus:     (s: MissionStore['status']) => void
  setOrbit:      (ok: boolean, reason: string) => void
  setTTS:        (on: boolean) => void
  setTTSVoice:   (voice: string) => void
  setTTSStatus:  (status: string) => void
  setAnimSpeed:  (s: number) => void
  setSimPaused:  (paused: boolean) => void
  setWs:         (ws: WebSocket | null) => void
  reset:         () => void
}

export const useMissionStore = create<MissionStore>((set) => ({
  rocket: DEFAULT_ROCKET, atmosphere: DEFAULT_ATM, simConfig: DEFAULT_SIM,
  scenarioId: 'nominal', scenarios: [], telemetry: [], events: [],
  status: 'idle', orbitAchieved: false, failReason: '',
  ttsEnabled: true, ttsVoice: 'F4', ttsStatus: 'ready', animSpeed: 10.0, simPaused: false, wsRef: null,

  setRocket:     (p) => set(s => ({ rocket: { ...s.rocket, ...p } })),
  setStage1:     (p) => set(s => ({ rocket: { ...s.rocket, stage1: { ...s.rocket.stage1, ...p } } })),
  setStage2:     (p) => set(s => ({ rocket: { ...s.rocket, stage2: { ...s.rocket.stage2, ...p } } })),
  setAtmosphere: (p) => set(s => ({ atmosphere: { ...s.atmosphere, ...p } })),
  setSimConfig:  (p) => set(s => ({ simConfig: { ...s.simConfig, ...p } })),
  setScenario:   (id) => set({ scenarioId: id }),
  setScenarios:  (scenarios) => set({ scenarios }),
  addTelemetry:  (p) => set(s => ({ telemetry: [...s.telemetry, p] })),
  addEvent:      (e) => set(s => ({ events: [...s.events, e] })),
  setStatus:     (status) => set({ status }),
  setOrbit:      (orbitAchieved, failReason) => set({ orbitAchieved, failReason }),
  setTTS:        (ttsEnabled) => set({ ttsEnabled }),
  setTTSVoice:   (ttsVoice) => set({ ttsVoice }),
  setTTSStatus:  (ttsStatus) => set({ ttsStatus }),
  setAnimSpeed:  (animSpeed) => set({ animSpeed }),
  setSimPaused:  (simPaused) => set({ simPaused }),
  setWs:         (wsRef) => set({ wsRef }),
  reset:         () => set({ telemetry: [], events: [], status: 'idle',
                              orbitAchieved: false, failReason: '', simPaused: false }),
}))
