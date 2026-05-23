import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMissionStore } from '../store/missionStore'

function KpiCard({ label, value, unit, ok, warn }:
  { label: string; value: string | number; unit?: string; ok?: boolean; warn?: boolean }) {
  const color = ok === true ? '#00c896' : ok === false ? '#ff4444' : warn ? '#f0a500' : '#58a6ff'
  return (
    <div style={{
      background: '#161b22', border: '1px solid #21262d', borderRadius: 10,
      padding: '14px 18px', flex: 1
    }}>
      <div style={{
        fontSize: '0.62rem', color: '#8b949e', letterSpacing: '0.18em',
        textTransform: 'uppercase', fontFamily: 'var(--font-mono)', marginBottom: 6
      }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.3rem', fontWeight: 700, color }}>
        {value}<span style={{ fontSize: '0.75rem', marginLeft: 4, color: '#8b949e' }}>{unit}</span>
      </div>
    </div>
  )
}

function SliderField({ label, value, min, max, step, unit, onChange, help }:
  {
    label: string; value: number; min: number; max: number; step: number; unit?: string;
    onChange: (v: number) => void; help?: string
  }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <label style={{ fontSize: '0.75rem', color: '#8b949e', fontFamily: 'var(--font-mono)' }}>
          {label}
        </label>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: '0.78rem',
          color: '#f0a500', fontWeight: 600
        }}>{value} {unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(+e.target.value)}
        style={{ width: '100%', accentColor: '#f0a500', height: 4 }} />
      {help && <div style={{ fontSize: '0.65rem', color: '#484f58', marginTop: 3 }}>{help}</div>}
    </div>
  )
}

type ParameterLink = { label: string; target: string }
type RocketPreviewData = {
  stage1: { dry_mass: number; prop_mass: number; thrust: number; burn_time: number }
  stage2: { dry_mass: number; prop_mass: number; thrust: number; burn_time: number }
  payload_kg: number
  fairing_kg: number
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

const TAB_PARAMETER_LINKS: Record<number, ParameterLink[]> = {
  0: [
    { label: '🔧 Stage 1', target: '#vehicle-stage1' },
    { label: '🔵 Stage 2', target: '#vehicle-stage2' },
    { label: '⚙️ Symulacja', target: '#vehicle-sim-params' },
    { label: '🎯 Payload/Fairing', target: '#vehicle-stage2-payload' },
  ],
  1: [
    { label: '🌬️ Wiatr', target: '#weather-wind' },
    { label: '🌡️ Temperatura', target: '#weather-temperature' },
    { label: '💧 Wilgotność', target: '#weather-humidity' },
    { label: '📊 Wpływ atmosfery', target: '#weather-atmospheric' },
  ],
  2: [
    { label: '✅ Sprawdzenia', target: '#readiness-checklist' },
    { label: '📈 Wynik misji', target: '#readiness-score' },
  ],
}

function RocketWireframePanel({ tab, rocket }: { tab: number; rocket: RocketPreviewData }) {
  const links = TAB_PARAMETER_LINKS[tab] ?? []
  const propellantMass = rocket.stage1.prop_mass + rocket.stage2.prop_mass
  const dryMass = rocket.stage1.dry_mass + rocket.stage2.dry_mass + rocket.fairing_kg
  const totalThrust = rocket.stage1.thrust + rocket.stage2.thrust
  const burnTime = rocket.stage1.burn_time + rocket.stage2.burn_time
  const lengthScale = clamp(0.82 + propellantMass / 85000 + burnTime / 1800, 0.9, 1.55)
  const widthScale = clamp(0.82 + dryMass / 6500 + totalThrust / 1200000 + rocket.payload_kg / 1200, 0.9, 1.32)
  const previewHeight = Math.round(360 * lengthScale)
  const previewWidth = Math.round(250 * widthScale)

  return (
    <aside style={{
      background: '#161b22', border: '1px solid #21262d', borderRadius: 12, padding: 18,
      position: 'sticky', top: 116, minHeight: 520,
      display: 'flex', flexDirection: 'column', gap: 16,
      justifyContent: 'space-between',
    }}>
      <div style={{
        width: '100%',
        minHeight: 500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}>
        <img
          src="/racket-wireframe.png"
          alt="Wireframe rocket"
          style={{
            width: `min(100%, ${previewWidth}px)`,
            height: previewHeight,
            objectFit: 'contain',
            filter: 'drop-shadow(0 0 14px rgba(88,166,255,0.35))',
            transform: `scaleX(${widthScale.toFixed(3)})`,
            transformOrigin: 'center bottom',
            transition: 'width 0.18s ease, height 0.18s ease, transform 0.18s ease',
          }}
        />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <KpiCard label="Preview length" value={`${Math.round(lengthScale * 100)}%`} ok />
        <KpiCard label="Preview width" value={`${Math.round(widthScale * 100)}%`} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{
          fontSize: '0.72rem', color: '#f0a500', fontFamily: 'var(--font-mono)', letterSpacing: '0.14em',
          textTransform: 'uppercase'
        }}>
          Parametry tej zakładki
        </div>
        {links.map((link) => (
          <a key={link.target} href={link.target}
            style={{
              textDecoration: 'none', color: '#8b949e', fontFamily: 'var(--font-mono)', fontSize: '0.78rem',
              border: '1px solid #30363d', borderRadius: 8, padding: '9px 10px', background: '#0d1117'
            }}>
            {link.label}
          </a>
        ))}
      </div>
    </aside>
  )
}

const TABS = ['🚀 Vehicle', '🌍 Weather', '✅ Readiness']

export default function PreLaunchPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState(0)
  const store = useMissionStore()
  const { rocket, setStage1, setStage2, setRocket, atmosphere, setAtmosphere, simConfig, setSimConfig } = store

  const G0 = 9.80665
  const dv1 = rocket.stage1.isp_vac * G0 * Math.log((rocket.stage1.dry_mass + rocket.stage1.prop_mass + rocket.stage2.dry_mass + rocket.stage2.prop_mass + rocket.payload_kg + rocket.fairing_kg) / (rocket.stage2.dry_mass + rocket.stage2.prop_mass + rocket.payload_kg + rocket.fairing_kg + rocket.stage1.dry_mass))
  const dv2 = rocket.stage2.isp_vac * G0 * Math.log((rocket.stage2.dry_mass + rocket.stage2.prop_mass + rocket.payload_kg) / (rocket.stage2.dry_mass + rocket.payload_kg))
  const dvTotal = dv1 + dv2
  const totalMass = rocket.stage1.dry_mass + rocket.stage1.prop_mass + rocket.stage2.dry_mass + rocket.stage2.prop_mass + rocket.payload_kg + rocket.fairing_kg
  const twr = rocket.stage1.thrust / (totalMass * G0)

  const humFactor = 1 - (atmosphere.humidity_pct / 100) * 0.004
  const presFactor = atmosphere.pressure_hpa / 1013.25
  const tempFactor = 288.15 / Math.max(288.15 + atmosphere.temperature_delta_k, 200)
  const effRho = humFactor * presFactor * tempFactor

  const checks = [
    { label: 'ΔV Total > 9200 m/s', ok: dvTotal > 9200, val: `${dvTotal.toFixed(0)} m/s` },
    { label: 'ΔV Stage 1 > 3000 m/s', ok: dv1 > 3000, val: `${dv1.toFixed(0)} m/s` },
    { label: 'ΔV Stage 2 > 4000 m/s', ok: dv2 > 4000, val: `${dv2.toFixed(0)} m/s` },
    { label: 'TWR Stage 1 > 1.3', ok: twr > 1.3, val: twr.toFixed(2) },
    { label: 'Isp S1 > 250s', ok: rocket.stage1.isp_vac > 250, val: `${rocket.stage1.isp_vac}s` },
    { label: 'Isp S2 > 300s', ok: rocket.stage2.isp_vac > 300, val: `${rocket.stage2.isp_vac}s` },
    { label: 'Wind ≤ 15 m/s', ok: Math.abs(atmosphere.wind_speed_ms) <= 15, val: `${atmosphere.wind_speed_ms} m/s` },
    { label: 'Pressure 980–1040 hPa', ok: atmosphere.pressure_hpa >= 980 && atmosphere.pressure_hpa <= 1040, val: `${atmosphere.pressure_hpa} hPa` },
    { label: 'Temp offset < 25K', ok: Math.abs(atmosphere.temperature_delta_k) < 25, val: `ISA${atmosphere.temperature_delta_k >= 0 ? '+' : ''}${atmosphere.temperature_delta_k}K` },
    { label: 'Air density ±10%', ok: effRho >= 0.90 && effRho <= 1.10, val: `×${effRho.toFixed(3)}` },
  ]
  const score = Math.round(checks.filter(c => c.ok).length / checks.length * 100)

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1300 }}>
      <div style={{
        fontFamily: 'var(--font-hud)', fontSize: '1.5rem', fontWeight: 900,
        color: '#f0a500', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6
      }}>
        ⚙️ Pre-Launch Configuration
      </div>
      <div style={{
        fontSize: '0.72rem', color: '#8b949e', fontFamily: 'var(--font-mono)',
        letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 28
      }}>
        System Readiness · Vehicle Setup · Weather Assessment
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 28 }}>
        <KpiCard label="ΔV Total" value={dvTotal.toFixed(0)} unit="m/s" ok={dvTotal > 9200} />
        <KpiCard label="TWR S1" value={twr.toFixed(2)} ok={twr > 1.3} />
        <KpiCard label="Liftoff mass" value={(totalMass / 1000).toFixed(2)} unit="t" />
        <KpiCard label="Mission score" value={`${score}/100`} ok={score >= 90} warn={score >= 70 && score < 90} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24, alignItems: 'start' }}>
        <div>
          <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '1px solid #21262d' }}>
            {TABS.map((t, i) => (
              <button key={t} onClick={() => setTab(i)} style={{
                padding: '10px 20px', fontSize: '0.78rem', fontFamily: 'var(--font-mono)',
                background: 'transparent', border: 'none',
                borderBottom: tab === i ? '2px solid #f0a500' : '2px solid transparent',
                color: tab === i ? '#f0a500' : '#8b949e', cursor: 'pointer',
                transition: 'all 0.15s'
              }}>{t}</button>
            ))}
          </div>

          {tab === 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <div id="vehicle-stage1" style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 12, padding: '20px 24px' }}>
                <div id="vehicle-stage1-thrust" style={{
                  fontSize: '0.7rem', color: '#f0a500', fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 16
                }}>
                  🟠 Stage 1 — Booster
                </div>
                <SliderField label="Dry mass" value={rocket.stage1.dry_mass} min={100} max={5000} step={50} unit="kg" onChange={v => setStage1({ dry_mass: v })} />
                <SliderField label="Propellant" value={rocket.stage1.prop_mass} min={1000} max={80000} step={500} unit="kg" onChange={v => setStage1({ prop_mass: v })} />
                <SliderField label="Thrust" value={rocket.stage1.thrust} min={10000} max={900000} step={5000} unit="N" onChange={v => setStage1({ thrust: v })} />
                <SliderField label="Isp vac" value={rocket.stage1.isp_vac} min={200} max={450} step={5} unit="s" onChange={v => setStage1({ isp_vac: v })} />
                <SliderField label="Isp SL" value={rocket.stage1.isp_sl} min={180} max={380} step={5} unit="s" onChange={v => setStage1({ isp_sl: v })} />
                <SliderField label="Burn time" value={rocket.stage1.burn_time} min={30} max={500} step={5} unit="s" onChange={v => setStage1({ burn_time: v })} />
              </div>
              <div id="vehicle-stage2" style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 12, padding: '20px 24px' }}>
                <div id="vehicle-stage2-isp" style={{
                  fontSize: '0.7rem', color: '#58a6ff', fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 16
                }}>
                  🔵 Stage 2 — Upper Stage
                </div>
                <SliderField label="Dry mass" value={rocket.stage2.dry_mass} min={50} max={2000} step={10} unit="kg" onChange={v => setStage2({ dry_mass: v })} />
                <SliderField label="Propellant" value={rocket.stage2.prop_mass} min={200} max={15000} step={100} unit="kg" onChange={v => setStage2({ prop_mass: v })} />
                <SliderField label="Thrust" value={rocket.stage2.thrust} min={1000} max={120000} step={1000} unit="N" onChange={v => setStage2({ thrust: v })} />
                <SliderField label="Isp vac" value={rocket.stage2.isp_vac} min={200} max={460} step={5} unit="s" onChange={v => setStage2({ isp_vac: v })} />
                <SliderField label="Burn time" value={rocket.stage2.burn_time} min={30} max={800} step={10} unit="s" onChange={v => setStage2({ burn_time: v })} />
                <div id="vehicle-stage2-payload" style={{ borderTop: '1px solid #21262d', paddingTop: 12, marginTop: 4 }}>
                  <SliderField label="Payload" value={rocket.payload_kg} min={1} max={500} step={1} unit="kg" onChange={v => setRocket({ payload_kg: v })} />
                  <SliderField label="Fairing" value={rocket.fairing_kg} min={10} max={400} step={5} unit="kg" onChange={v => setRocket({ fairing_kg: v })} />
                </div>
              </div>
              <div id="vehicle-sim-params" style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 12, padding: '20px 24px', gridColumn: '1/-1' }}>
                <div style={{
                  fontSize: '0.7rem', color: '#bc8cff', fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 16
                }}>
                  ⚙️ Simulation Parameters
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16 }}>
                  <SliderField label="Time step dt" value={simConfig.dt} min={0.05} max={0.5} step={0.05} unit="s" onChange={v => setSimConfig({ dt: v })} help="Mniejszy = dokładniejszy" />
                  <SliderField label="Max sim time" value={simConfig.max_time} min={300} max={2000} step={60} unit="s" onChange={v => setSimConfig({ max_time: v })} />
                  <SliderField label="LEO alt target" value={simConfig.leo_alt_km} min={200} max={600} step={10} unit="km" onChange={v => setSimConfig({ leo_alt_km: v })} />
                  <SliderField label="Min LEO vel" value={simConfig.leo_vel_ms} min={7000} max={8000} step={50} unit="m/s" onChange={v => setSimConfig({ leo_vel_ms: v })} />
                </div>
              </div>
            </div>
          )}

          {tab === 1 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <div id="weather-launch" style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 12, padding: '20px 24px' }}>
                <div style={{ fontSize: '0.7rem', color: '#58a6ff', fontFamily: 'var(--font-mono)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 16 }}>
                  🌤️ Launch Site Weather
                </div>
                <div id="weather-wind">
                  <SliderField label="Wind speed" value={atmosphere.wind_speed_ms} min={-40} max={40} step={1} unit="m/s" onChange={v => setAtmosphere({ wind_speed_ms: v })} help="Ujemny = wiatr wschodni" />
                </div>
                <div id="weather-temperature">
                  <SliderField label="Temperature offset" value={atmosphere.temperature_delta_k} min={-30} max={40} step={1} unit="K" onChange={v => setAtmosphere({ temperature_delta_k: v })} help="Odchylenie od ISA standard" />
                </div>
                <div id="weather-humidity">
                  <SliderField label="Humidity" value={atmosphere.humidity_pct} min={0} max={100} step={5} unit="%" onChange={v => setAtmosphere({ humidity_pct: v })} />
                </div>
                <SliderField label="Surface pressure" value={atmosphere.pressure_hpa} min={950} max={1050} step={1} unit="hPa" onChange={v => setAtmosphere({ pressure_hpa: v })} help="ISA std: 1013.25 hPa" />
              </div>
              <div id="weather-atmospheric" style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 12, padding: '20px 24px' }}>
                <div style={{ fontSize: '0.7rem', color: '#00c896', fontFamily: 'var(--font-mono)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 16 }}>
                  📊 Atmospheric Impact
                </div>
                {[
                  ['Air density ×', effRho.toFixed(4), effRho >= 0.90 && effRho <= 1.10],
                  ['Humidity correction', `×${humFactor.toFixed(4)}`, true],
                  ['Pressure correction', `×${presFactor.toFixed(4)}`, atmosphere.pressure_hpa >= 980 && atmosphere.pressure_hpa <= 1040],
                  ['Temperature correction', `×${tempFactor.toFixed(4)}`, Math.abs(atmosphere.temperature_delta_k) < 20],
                  ['Wind drag penalty', `~${(Math.abs(atmosphere.wind_speed_ms) * 0.12).toFixed(1)} m/s ΔV`, Math.abs(atmosphere.wind_speed_ms) <= 15],
                ].map(([lbl, val, ok]) => (
                  <div key={lbl as string} style={{
                    display: 'flex', justifyContent: 'space-between',
                    padding: '8px 0', borderBottom: '1px solid #21262d', alignItems: 'center'
                  }}>
                    <span style={{ fontSize: '0.75rem', color: '#8b949e', fontFamily: 'var(--font-mono)' }}>{lbl}</span>
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontSize: '0.8rem',
                      color: ok ? '#00c896' : '#ff4444'
                    }}>{val}</span>
                  </div>
                ))}
                <div style={{
                  marginTop: 16, padding: '12px', borderRadius: 8,
                  background: Math.abs(atmosphere.wind_speed_ms) <= 15 && effRho >= 0.90 && effRho <= 1.10
                    ? 'rgba(0,200,150,0.1)' : 'rgba(255,68,68,0.1)',
                  border: `1px solid ${Math.abs(atmosphere.wind_speed_ms) <= 15 ? '#00c896' : '#ff4444'}40`,
                  fontFamily: 'var(--font-mono)', fontSize: '0.75rem',
                  color: Math.abs(atmosphere.wind_speed_ms) <= 15 ? '#00c896' : '#ff4444'
                }}>
                  {Math.abs(atmosphere.wind_speed_ms) <= 15 && effRho >= 0.90 && effRho <= 1.10
                    ? '🟢 GO — Weather conditions nominal' : '🔴 NO-GO — Adverse weather conditions'}
                </div>
              </div>
            </div>
          )}

          {tab === 2 && (
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
              <div id="readiness-checklist" style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 12, padding: '20px 24px' }}>
                <div style={{ fontSize: '0.7rem', color: '#f0a500', fontFamily: 'var(--font-mono)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 16 }}>
                  ✅ Launch Commit Criteria
                </div>
                {checks.map(c => (
                  <div key={c.label} style={{
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', padding: '9px 0', borderBottom: '1px solid #21262d'
                  }}>
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontSize: '0.76rem',
                      color: c.ok ? '#00c896' : '#ff4444'
                    }}>
                      {c.ok ? '✅' : '❌'} {c.label}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#8b949e' }}>
                      {c.val}
                    </span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div id="readiness-score" style={{
                  background: '#161b22', border: `1px solid ${score >= 90 ? '#00c896' : score >= 70 ? '#f0a500' : '#ff4444'}40`,
                  borderRadius: 12, padding: '24px', textAlign: 'center'
                }}>
                  <div style={{
                    fontFamily: 'var(--font-hud)', fontSize: '3rem', fontWeight: 900,
                    color: score >= 90 ? '#00c896' : score >= 70 ? '#f0a500' : '#ff4444'
                  }}>
                    {score}
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-mono)', fontSize: '0.65rem',
                    color: '#8b949e', letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 4
                  }}>
                    Mission Score / 100
                  </div>
                  <div style={{
                    marginTop: 16, fontSize: '0.78rem', fontFamily: 'var(--font-mono)',
                    color: score >= 90 ? '#00c896' : score >= 70 ? '#f0a500' : '#ff4444'
                  }}>
                    {score >= 90 ? '🟢 GO FOR LAUNCH' : score >= 70 ? '🟡 CONDITIONAL GO' : '🔴 NO-GO'}
                  </div>
                </div>
                <button onClick={() => navigate('/mission')} disabled={score < 50} style={{
                  padding: '14px', borderRadius: 10, fontSize: '0.85rem',
                  fontFamily: 'var(--font-mono)', fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.08em', cursor: score >= 50 ? 'pointer' : 'not-allowed',
                  background: score >= 90 ? '#f0a500' : score >= 70 ? 'rgba(240,165,0,0.2)' : 'rgba(255,68,68,0.1)',
                  color: score >= 90 ? '#0d1117' : score >= 70 ? '#f0a500' : '#ff4444',
                  border: `1px solid ${score >= 90 ? '#f0a500' : score >= 70 ? 'rgba(240,165,0,0.5)' : 'rgba(255,68,68,0.3)'}`,
                  boxShadow: score >= 90 ? '0 0 24px rgba(240,165,0,0.3)' : 'none',
                  transition: 'all 0.2s'
                }}>
                  {score >= 90 ? '🚀 PROCEED TO LAUNCH' : score >= 70 ? '⚠️ LAUNCH ANYWAY' : '🔴 FIX ISSUES FIRST'}
                </button>
              </div>
            </div>
          )}
        </div>

        <RocketWireframePanel tab={tab} rocket={rocket} />
      </div>
    </div>
  )
}
