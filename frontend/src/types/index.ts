export interface StageConfig {
  dry_mass: number; prop_mass: number; thrust: number
  isp_vac: number; isp_sl: number; burn_time: number
}
export interface RocketConfig {
  stage1: StageConfig; stage2: StageConfig
  payload_kg: number; fairing_kg: number
  diameter_m: number; cd_base: number
}
export interface AtmosphereConfig {
  wind_speed_ms: number; temperature_delta_k: number
  humidity_pct: number; pressure_hpa: number
}
export interface SimConfig {
  dt: number; max_time: number; leo_alt_km: number; leo_vel_ms: number
}
export interface TelemetryPoint {
  t: number; alt: number; vel: number; mach: number; accel_g: number
  q_kpa: number; downrange: number; thrust: number; drag: number
  mass: number; s1_prop: number; s2_prop: number; stage: number
  cd: number; stab: number
}
export interface MissionEvent {
  time: number; name: string; desc: string; icon: string
}
export interface Scenario {
  id: string; name: string; color: string
  outcome: string; description: string
}
export interface FlightRun {
  id: number
  created_at: string
  scenario: string
  success: number
  score: number
  final_time_s: number
  final_alt_km: number
  final_vel_ms: number
  max_alt_km: number
  max_vel_ms: number
  max_mach: number
  max_q_kpa: number
  payload_kg: number
  total_mass_kg: number
  fail_reason: string
}
