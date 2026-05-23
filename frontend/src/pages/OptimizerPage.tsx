import { useState } from 'react'
import { useMissionStore } from '../store/missionStore'
import { runOptimize } from '../services/apiService'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function OptimizerPage() {
  const { rocket, atmosphere, simConfig } = useMissionStore()
  const [running, setRunning] = useState(false)
  const [result,  setResult]  = useState<any>(null)
  const [error,   setError]   = useState('')
  const [gens,    setGens]    = useState(80)
  const [pop,     setPop]     = useState(40)

  const run = async () => {
    setRunning(true); setError(''); setResult(null)
    try {
      const res = await runOptimize({ rocket, atmosphere, sim: simConfig,
        generations: gens, population: pop })
      setResult(res)
    } catch(e: any) {
      setError(e.message || 'Optimizer failed')
    } finally { setRunning(false) }
  }

  const histData = result?.history?.map((v: number, i: number) => ({ gen: i+1, dv: v })) ?? []

  return (
    <div style={{ padding:'28px 36px', maxWidth:900 }}>
      <div style={{ fontFamily:'var(--font-hud)', fontSize:'1.3rem', fontWeight:900,
        color:'#bc8cff', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:6 }}>
        🧬 AI — Genetic Optimizer
      </div>
      <div style={{ fontFamily:'var(--font-mono)', fontSize:'0.68rem', color:'#8b949e',
        letterSpacing:'0.18em', textTransform:'uppercase', marginBottom:28 }}>
        Minimizes liftoff mass while maintaining delta-V to LEO
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
            {['S1 propellant mass (–5% to +10%)','S2 propellant mass (–5% to +10%)',
              'Stage 1 Isp (±5%)','Stage 2 Isp (±5%)','Payload fairing mass'].map(t => (
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
              {Object.entries(result.best_config ?? {}).map(([k, v]) => (
                <div key={k} style={{ display:'flex', justifyContent:'space-between',
                  padding:'7px 0', borderBottom:'1px solid #21262d' }}>
                  <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.72rem', color:'#8b949e' }}>{k}</span>
                  <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.75rem',
                    color:'#bc8cff', fontWeight:600 }}>
                    {typeof v === 'number' ? (v as number).toFixed(2) : String(v)}
                  </span>
                </div>
              ))}
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
        </>
      )}
    </div>
  )
}
