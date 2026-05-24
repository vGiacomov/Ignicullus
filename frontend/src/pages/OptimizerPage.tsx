import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMissionStore } from '../store/missionStore'
import { runOptimize } from '../services/apiService'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const MODES = [
  { id: 'balanced', label: 'Balanced', desc: 'Mass, ΔV and payload ratio' },
  { id: 'fuel_efficient', label: 'Fuel efficient', desc: 'Lower launch mass' },
  { id: 'max_altitude', label: 'Max altitude', desc: 'Higher ΔV reserve' },
  { id: 'max_velocity', label: 'Max velocity', desc: 'Prioritize ΔV' },
  { id: 'max_payload', label: 'Max payload', desc: 'Payload ratio first' },
]

export default function OptimizerPage() {
  const navigate = useNavigate()
  const { rocket, atmosphere, simConfig, setStage1, setStage2, setRocket } = useMissionStore()
  const [running, setRunning] = useState(false)
  const [result,  setResult]  = useState<any>(null)
  const [error,   setError]   = useState('')
  const [gens,    setGens]    = useState(80)
  const [pop,     setPop]     = useState(40)
  const [mode,    setMode]    = useState('balanced')

  const run = async () => {
    setRunning(true); setError(''); setResult(null)
    try {
      const res = await runOptimize({ rocket, atmosphere, sim: simConfig,
        generations: gens, population: pop, mode })
      setResult(res)
    } catch(e: any) {
      setError(e.message || 'Optimizer failed')
    } finally { setRunning(false) }
  }

  const applySolution = (solution: any) => {
    if (!solution?.applied_config) return

    setStage1({
      prop_mass: solution.applied_config.s1_prop_kg,
      isp_vac: solution.applied_config.s1_isp_vac,
      isp_sl: solution.applied_config.s1_isp_sl,
    })
    setStage2({
      prop_mass: solution.applied_config.s2_prop_kg,
      isp_vac: solution.applied_config.s2_isp_vac,
    })
    setRocket({ fairing_kg: solution.applied_config.fairing_kg })
    navigate('/mission')
  }

  const histData = (result?.history_dv ?? result?.history)?.map((v: number, i: number) => ({ gen: i+1, dv: v })) ?? []
  const recommended = result?.recommended
  const paretoFront = result?.pareto_front ?? []

  return (
    <div style={{ padding:'28px 36px', maxWidth:900 }}>
      <div style={{ fontFamily:'var(--font-hud)', fontSize:'1.3rem', fontWeight:900,
        color:'#bc8cff', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:6 }}>
        🧬 AI — NSGA-II Optimizer
      </div>
      <div style={{ fontFamily:'var(--font-mono)', fontSize:'0.68rem', color:'#8b949e',
        letterSpacing:'0.18em', textTransform:'uppercase', marginBottom:28 }}>
        Multi-objective Pareto optimization for mass, delta-V and payload ratio
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:24 }}>
        <div style={{ background:'#161b22', border:'1px solid #21262d', borderRadius:10, padding:'20px 24px' }}>
          <div style={{ fontSize:'0.68rem', color:'#bc8cff', fontFamily:'var(--font-mono)',
            letterSpacing:'0.15em', textTransform:'uppercase', marginBottom:16 }}>
            Optimizer Parameters
          </div>
          {[
            { label:'Generations', value:gens, min:10, max:300, step:10, set:setGens },
            { label:'Population',  value:pop,  min:10, max:100, step:10, set:setPop  },
          ].map(p => (
            <div key={p.label} style={{ marginBottom:16 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                <span style={{ fontSize:'0.75rem', color:'#8b949e', fontFamily:'var(--font-mono)' }}>{p.label}</span>
                <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.78rem', color:'#bc8cff' }}>{p.value}</span>
              </div>
              <input type="range" min={p.min} max={p.max} step={p.step} value={p.value}
                onChange={e => p.set(+e.target.value)}
                style={{ width:'100%', accentColor:'#bc8cff' }}/>
            </div>
          ))}
          <label style={{ fontSize:'0.75rem', color:'#8b949e', fontFamily:'var(--font-mono)', display:'block', marginBottom:6 }}>
            Optimization mode
          </label>
          <select value={mode} onChange={e => setMode(e.target.value)} style={{
            width:'100%', background:'#0d1117', color:'#e6edf3', border:'1px solid #30363d',
            borderRadius:8, padding:'9px 10px', fontFamily:'var(--font-mono)', fontSize:'0.72rem'
          }}>
            {MODES.map(m => (
              <option key={m.id} value={m.id}>{m.label} — {m.desc}</option>
            ))}
          </select>
          <div style={{ marginTop:8, padding:'10px', background:'rgba(188,140,255,0.06)',
            borderRadius:6, fontSize:'0.68rem', color:'#8b949e', fontFamily:'var(--font-mono)' }}>
            ~{gens * pop} fitness evaluations · {((gens * pop * 0.1) / 10).toFixed(0)}s estimated
          </div>
        </div>
        <div style={{ background:'#161b22', border:'1px solid #21262d', borderRadius:10, padding:'20px 24px',
          display:'flex', flexDirection:'column', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontSize:'0.68rem', color:'#00c896', fontFamily:'var(--font-mono)',
              letterSpacing:'0.15em', textTransform:'uppercase', marginBottom:12 }}>What it optimizes</div>
            {['S1 propellant mass (80% to 115%)','S2 propellant mass (80% to 115%)',
              'Stage 1 Isp (96% to 106%)','Stage 2 Isp (96% to 107%)','Payload fairing mass (60% to 100%)'].map(t => (
              <div key={t} style={{ fontSize:'0.72rem', color:'#8b949e', fontFamily:'var(--font-mono)',
                padding:'4px 0', borderBottom:'1px solid #21262d' }}>
                ✦ {t}
              </div>
            ))}
          </div>
          <button onClick={run} disabled={running} style={{
            marginTop:20, padding:'14px', borderRadius:10, fontSize:'0.85rem',
            fontFamily:'var(--font-mono)', fontWeight:700, textTransform:'uppercase',
            letterSpacing:'0.08em', background: running ? 'rgba(188,140,255,0.1)' : '#bc8cff',
            color: running ? '#bc8cff' : '#0d1117', border:'none',
            cursor: running ? 'not-allowed' : 'pointer',
            boxShadow: running ? 'none' : '0 0 20px rgba(188,140,255,0.3)',
            transition:'all 0.2s' }}>
            {running ? '⏳ OPTIMIZING...' : '🧬 RUN OPTIMIZER'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding:'12px 16px', borderRadius:8, background:'rgba(255,68,68,0.1)',
          border:'1px solid rgba(255,68,68,0.3)', color:'#ff4444',
          fontFamily:'var(--font-mono)', fontSize:'0.78rem', marginBottom:16 }}>
          ❌ {error}
        </div>
      )}

      {result && (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
            <div style={{ background:'#161b22', border:'1px solid rgba(188,140,255,0.3)',
              borderRadius:10, padding:'20px 24px' }}>
              <div style={{ fontSize:'0.68rem', color:'#bc8cff', fontFamily:'var(--font-mono)',
                letterSpacing:'0.15em', textTransform:'uppercase', marginBottom:16 }}>
                🏆 Optimal Configuration
              </div>
              {recommended && (
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:14 }}>
                  {[
                    ['ΔV', `${recommended.delta_v} m/s`],
                    ['Mass', `${recommended.total_mass_kg} kg`],
                    ['Payload', `${recommended.payload_ratio}%`],
                    ['Apogee proxy', `${recommended.est_apogee_km} km`],
                  ].map(([label, value]) => (
                    <div key={label} style={{ background:'#0d1117', border:'1px solid #30363d',
                      borderRadius:8, padding:'9px 10px' }}>
                      <div style={{ fontSize:'0.58rem', color:'#484f58', fontFamily:'var(--font-mono)',
                        textTransform:'uppercase', letterSpacing:'0.12em' }}>{label}</div>
                      <div style={{ fontFamily:'var(--font-mono)', color:'#bc8cff', fontWeight:700,
                        fontSize:'0.82rem', marginTop:2 }}>{value}</div>
                    </div>
                  ))}
                </div>
              )}
              {Object.entries(result.best_config ?? {}).map(([k, v]) => v == null ? null : (
                <div key={k} style={{ display:'flex', justifyContent:'space-between',
                  padding:'7px 0', borderBottom:'1px solid #21262d' }}>
                  <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.72rem', color:'#8b949e' }}>{k}</span>
                  <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.75rem',
                    color:'#bc8cff', fontWeight:600 }}>
                    {typeof v === 'number' ? (v as number).toFixed(2) : String(v)}
                  </span>
                </div>
              ))}
              <button onClick={() => applySolution(recommended)} disabled={!recommended} style={{
                width:'100%', marginTop:14, padding:'10px', borderRadius:8,
                background:'#00c896', color:'#0d1117', border:'none',
                fontFamily:'var(--font-mono)', fontWeight:800, cursor:recommended ? 'pointer' : 'not-allowed'
              }}>
                ACCEPT AND GO TO LAUNCH
              </button>
            </div>
            <div style={{ background:'#161b22', border:'1px solid #21262d', borderRadius:10, padding:'16px' }}>
              <div style={{ fontSize:'0.62rem', color:'#bc8cff', fontFamily:'var(--font-mono)',
                letterSpacing:'0.18em', textTransform:'uppercase', marginBottom:10 }}>
                ΔV Convergence History
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={histData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#21262d"/>
                  <XAxis dataKey="gen" stroke="#484f58" tick={{ fill:'#484f58', fontSize:10 }} label={{ value:'Generation', fill:'#484f58', fontSize:10, position:'insideBottom', offset:-4 }}/>
                  <YAxis stroke="#484f58" tick={{ fill:'#484f58', fontSize:10 }}/>
                  <Tooltip contentStyle={{ background:'#0d1117', border:'1px solid #30363d',
                    fontFamily:'var(--font-mono)', fontSize:'0.7rem' }}/>
                  <Line type="monotone" dataKey="dv" stroke="#bc8cff" strokeWidth={2} dot={false} name="Best ΔV (m/s)"/>
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={{ background:'#161b22', border:'1px solid #21262d', borderRadius:10, padding:'18px 20px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <div style={{ fontSize:'0.68rem', color:'#bc8cff', fontFamily:'var(--font-mono)',
                letterSpacing:'0.15em', textTransform:'uppercase' }}>
                Pareto front · {result.pareto_size} non-dominated solutions · mode {result.mode}
              </div>
            </div>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontFamily:'var(--font-mono)', fontSize:'0.68rem' }}>
                <thead>
                  <tr style={{ color:'#484f58', textTransform:'uppercase', letterSpacing:'0.08em' }}>
                    {['ΔV', 'Mass', 'Payload', 'S1 Prop', 'S2 Prop', 'S1 Isp', 'S2 Isp', 'Fairing', ''].map(h => (
                      <th key={h} style={{ textAlign:'right', padding:'8px 6px', borderBottom:'1px solid #30363d' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paretoFront.map((s: any, i: number) => (
                    <tr key={`${s.id}-${i}`} style={{ color:i === 0 ? '#00c896' : '#8b949e' }}>
                      <td style={{ textAlign:'right', padding:'8px 6px', borderBottom:'1px solid #21262d' }}>{s.delta_v}</td>
                      <td style={{ textAlign:'right', padding:'8px 6px', borderBottom:'1px solid #21262d' }}>{s.total_mass_kg}</td>
                      <td style={{ textAlign:'right', padding:'8px 6px', borderBottom:'1px solid #21262d' }}>{s.payload_ratio}%</td>
                      <td style={{ textAlign:'right', padding:'8px 6px', borderBottom:'1px solid #21262d' }}>{s.s1_prop_factor}</td>
                      <td style={{ textAlign:'right', padding:'8px 6px', borderBottom:'1px solid #21262d' }}>{s.s2_prop_factor}</td>
                      <td style={{ textAlign:'right', padding:'8px 6px', borderBottom:'1px solid #21262d' }}>{s.s1_isp_factor}</td>
                      <td style={{ textAlign:'right', padding:'8px 6px', borderBottom:'1px solid #21262d' }}>{s.s2_isp_factor}</td>
                      <td style={{ textAlign:'right', padding:'8px 6px', borderBottom:'1px solid #21262d' }}>{s.fairing_factor}</td>
                      <td style={{ textAlign:'right', padding:'8px 6px', borderBottom:'1px solid #21262d' }}>
                        <button onClick={() => applySolution(s)} style={{
                          padding:'5px 8px', borderRadius:6, border:'1px solid rgba(88,166,255,0.35)',
                          background:'rgba(88,166,255,0.1)', color:'#58a6ff',
                          fontFamily:'var(--font-mono)', fontSize:'0.62rem', cursor:'pointer'
                        }}>
                          ACCEPT
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
