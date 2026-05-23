import { useMissionStore } from '../store/missionStore'
import {
  ScatterChart, Scatter, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts'

const CT = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:'#0d1117', border:'1px solid #30363d', borderRadius:6,
      padding:'8px 12px', fontFamily:'var(--font-mono)', fontSize:'0.7rem' }}>
      {payload.map((p: any) => (
        <div key={p.name} style={{ color: p.color || '#e6edf3' }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(3) : p.value}
        </div>
      ))}
    </div>
  )
}

export default function AnalysisPage() {
  const { telemetry, events, orbitAchieved } = useMissionStore()

  if (telemetry.length === 0) {
    return (
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center',
        justifyContent:'center', minHeight:'80vh', color:'#484f58',
        fontFamily:'var(--font-mono)', fontSize:'0.85rem' }}>
        <div style={{ fontSize:'3rem', marginBottom:16 }}>📊</div>
        <div>No simulation data yet.</div>
        <div style={{ marginTop:8, fontSize:'0.7rem', color:'#30363d' }}>
          Run a simulation in Mission Control first.
        </div>
      </div>
    )
  }

  const step = Math.max(1, Math.floor(telemetry.length / 500))
  const cd = telemetry.filter((_, i) => i % step === 0)

  const maxAlt   = Math.max(...telemetry.map(t => t.alt))
  const maxVel   = Math.max(...telemetry.map(t => t.vel))
  const maxMach  = Math.max(...telemetry.map(t => t.mach))
  const maxQ     = Math.max(...telemetry.map(t => t.q_kpa))
  const maxAccel = Math.max(...telemetry.map(t => t.accel_g))
  const finalAlt = telemetry[telemetry.length-1].alt
  const finalVel = telemetry[telemetry.length-1].vel

  // Radar data
  const radarData = [
    { metric:'ΔV Efficiency', val: Math.min(finalVel/7700*100, 100) },
    { metric:'Altitude',      val: Math.min(finalAlt/400*100, 100) },
    { metric:'Stability',     val: Math.min(Math.max(...telemetry.map(t=>t.stab))/3*100, 100) },
    { metric:'Accel Safety',  val: Math.max(0, 100 - maxAccel/10*100) },
    { metric:'Q Margin',      val: Math.max(0, 100 - maxQ/80*100) },
    { metric:'Mach Efficiency', val: Math.min(maxMach/8*100, 100) },
  ]

  // Trajectory (downrange vs altitude)
  const traj = cd.map(p => ({ x: p.downrange, y: p.alt }))

  return (
    <div style={{ padding:'28px 36px' }}>
      <div style={{ fontFamily:'var(--font-hud)', fontSize:'1.3rem', fontWeight:900,
        color:'#f0a500', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:6 }}>
        📊 Mission Analysis
      </div>
      <div style={{ fontFamily:'var(--font-mono)', fontSize:'0.68rem', color:'#8b949e',
        letterSpacing:'0.18em', textTransform:'uppercase', marginBottom:24 }}>
        Post-Flight Data Analysis · {telemetry.length} telemetry points
      </div>

      {/* Summary KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:10, marginBottom:24 }}>
        {[
          { l:'Max Altitude',  v:`${maxAlt.toFixed(1)} km`,   c:'#f0a500' },
          { l:'Max Velocity',  v:`${maxVel.toFixed(0)} m/s`,  c:'#00c896' },
          { l:'Max Mach',      v:maxMach.toFixed(2),           c:'#58a6ff' },
          { l:'Max Q',         v:`${maxQ.toFixed(1)} kPa`,    c:'#ff8800' },
          { l:'Max Accel',     v:`${maxAccel.toFixed(2)} g`,  c:'#bc8cff' },
          { l:'Orbit',         v: orbitAchieved ? '✅ YES' : '❌ NO',
            c: orbitAchieved ? '#00c896' : '#ff4444' },
        ].map(k => (
          <div key={k.l} style={{ background:'#161b22', border:'1px solid #21262d',
            borderRadius:10, padding:'12px 16px' }}>
            <div style={{ fontSize:'0.6rem', color:'#484f58', fontFamily:'var(--font-mono)',
              letterSpacing:'0.15em', textTransform:'uppercase', marginBottom:6 }}>{k.l}</div>
            <div style={{ fontFamily:'var(--font-mono)', fontSize:'1.1rem',
              fontWeight:700, color:k.c }}>{k.v}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:16, marginBottom:16 }}>
        {/* Trajectory */}
        <div style={{ background:'#161b22', border:'1px solid #21262d', borderRadius:10, padding:'16px' }}>
          <div style={{ fontSize:'0.62rem', color:'#f0a500', fontFamily:'var(--font-mono)',
            letterSpacing:'0.18em', textTransform:'uppercase', marginBottom:10 }}>
            Flight Trajectory (Downrange × Altitude)
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262d"/>
              <XAxis dataKey="x" name="Downrange" stroke="#484f58"
                tick={{ fill:'#484f58', fontSize:10 }} label={{ value:'Downrange [km]', fill:'#484f58', fontSize:10, position:'insideBottom', offset:-4 }}/>
              <YAxis dataKey="y" name="Altitude" stroke="#484f58"
                tick={{ fill:'#484f58', fontSize:10 }} label={{ value:'Alt [km]', fill:'#484f58', fontSize:10, angle:-90, position:'insideLeft' }}/>
              <Tooltip cursor={{ strokeDasharray:'3 3' }} content={<CT/>}/>
              <Scatter data={traj} fill="#f0a500" opacity={0.6} line={{ stroke:'#f0a500', strokeWidth:1.5 }} lineJointType="monotone"/>
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* Radar */}
        <div style={{ background:'#161b22', border:'1px solid #21262d', borderRadius:10, padding:'16px' }}>
          <div style={{ fontSize:'0.62rem', color:'#bc8cff', fontFamily:'var(--font-mono)',
            letterSpacing:'0.18em', textTransform:'uppercase', marginBottom:10 }}>
            Mission Performance Radar
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#21262d"/>
              <PolarAngleAxis dataKey="metric" tick={{ fill:'#8b949e', fontSize:9 }}/>
              <PolarRadiusAxis angle={90} domain={[0,100]} tick={{ fill:'#484f58', fontSize:8 }}/>
              <Radar name="Score" dataKey="val" stroke="#bc8cff" fill="#bc8cff" fillOpacity={0.25} strokeWidth={2}/>
              <Tooltip content={<CT/>}/>
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Cd + Thrust over time */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
        <div style={{ background:'#161b22', border:'1px solid #21262d', borderRadius:10, padding:'16px' }}>
          <div style={{ fontSize:'0.62rem', color:'#58a6ff', fontFamily:'var(--font-mono)',
            letterSpacing:'0.18em', textTransform:'uppercase', marginBottom:10 }}>
            Drag Coefficient vs Time (Mach-dependent)
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={cd}>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262d"/>
              <XAxis dataKey="t" stroke="#484f58" tick={{ fill:'#484f58', fontSize:10 }} tickFormatter={v=>`${v}s`}/>
              <YAxis stroke="#484f58" tick={{ fill:'#484f58', fontSize:10 }} domain={[0.1, 0.6]}/>
              <Tooltip content={<CT/>}/>
              <Line type="monotone" dataKey="cd" stroke="#58a6ff" strokeWidth={2} dot={false} name="Cd"/>
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background:'#161b22', border:'1px solid #21262d', borderRadius:10, padding:'16px' }}>
          <div style={{ fontSize:'0.62rem', color:'#ff8800', fontFamily:'var(--font-mono)',
            letterSpacing:'0.18em', textTransform:'uppercase', marginBottom:10 }}>
            Thrust vs Drag [N]
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={cd}>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262d"/>
              <XAxis dataKey="t" stroke="#484f58" tick={{ fill:'#484f58', fontSize:10 }} tickFormatter={v=>`${v}s`}/>
              <YAxis stroke="#484f58" tick={{ fill:'#484f58', fontSize:10 }}/>
              <Tooltip content={<CT/>}/>
              <Line type="monotone" dataKey="thrust" stroke="#f0a500" strokeWidth={2} dot={false} name="Thrust(N)"/>
              <Line type="monotone" dataKey="drag"   stroke="#ff4444" strokeWidth={1.5} dot={false} name="Drag(N)"/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Events table */}
      <div style={{ background:'#161b22', border:'1px solid #21262d', borderRadius:10, padding:'16px' }}>
        <div style={{ fontSize:'0.62rem', color:'#00c896', fontFamily:'var(--font-mono)',
          letterSpacing:'0.18em', textTransform:'uppercase', marginBottom:12 }}>Mission Event Log</div>
        <div style={{ display:'grid', gridTemplateColumns:'80px 160px 1fr', gap:0 }}>
          {['Time','Event','Description'].map(h => (
            <div key={h} style={{ padding:'6px 12px', fontSize:'0.62rem', color:'#484f58',
              fontFamily:'var(--font-mono)', letterSpacing:'0.15em', textTransform:'uppercase',
              borderBottom:'1px solid #21262d' }}>{h}</div>
          ))}
          {events.map((e,i) => [
            <div key={`t${i}`} style={{ padding:'8px 12px', fontFamily:'var(--font-mono)',
              fontSize:'0.72rem', color:'#8b949e', borderBottom:'1px solid #161b22' }}>
              T+{e.time.toFixed(0)}s
            </div>,
            <div key={`n${i}`} style={{ padding:'8px 12px', fontFamily:'var(--font-mono)',
              fontSize:'0.72rem', color:'#f0a500', borderBottom:'1px solid #161b22' }}>
              {e.icon} {e.name}
            </div>,
            <div key={`d${i}`} style={{ padding:'8px 12px', fontSize:'0.72rem',
              color:'#8b949e', borderBottom:'1px solid #161b22' }}>
              {e.desc}
            </div>
          ])}
        </div>
      </div>
    </div>
  )
}
