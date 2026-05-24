import { useNavigate } from 'react-router-dom'
import { useMissionStore } from '../store/missionStore'
import { launchSimulation, abortSimulation, pauseSimulation, resumeSimulation } from '../services/wsService'
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts'

function HudGauge({ label, value, unit, max, color, decimals=1 }:
  { label:string; value:number; unit:string; max:number; color:string; decimals?:number }) {
  const pct = Math.min(value / max * 100, 100)
  return (
    <div style={{ background:'#161b22', border:'1px solid #21262d', borderRadius:10,
      padding:'14px 18px', flex:1, minWidth:120 }}>
      <div style={{ fontSize:'0.6rem', color:'#484f58', fontFamily:'var(--font-mono)',
        letterSpacing:'0.18em', textTransform:'uppercase', marginBottom:6 }}>{label}</div>
      <div style={{ fontFamily:'var(--font-hud)', fontSize:'1.6rem', fontWeight:700,
        color, lineHeight:1 }}>{value.toFixed(decimals)}</div>
      <div style={{ fontSize:'0.62rem', color:'#8b949e', marginBottom:8 }}>{unit}</div>
      <div style={{ height:3, background:'#21262d', borderRadius:2 }}>
        <div style={{ height:'100%', width:`${pct}%`, background:color,
          borderRadius:2, transition:'width 0.3s', boxShadow:`0 0 6px ${color}80` }}/>
      </div>
    </div>
  )
}

function EventLog({ events }: { events: { time:number; name:string; desc:string; icon:string }[] }) {
  const reversed = [...events].reverse().slice(0,20)
  return (
    <div style={{ background:'#161b22', border:'1px solid #21262d', borderRadius:10,
      padding:'14px', height:'100%', overflowY:'auto' }}>
      <div style={{ fontSize:'0.62rem', color:'#484f58', fontFamily:'var(--font-mono)',
        letterSpacing:'0.18em', textTransform:'uppercase', marginBottom:10 }}>Mission Log</div>
      {reversed.length === 0 && (
        <div style={{ color:'#484f58', fontFamily:'var(--font-mono)', fontSize:'0.72rem',
          textAlign:'center', marginTop:24 }}>Awaiting launch...</div>
      )}
      {reversed.map((e, i) => (
        <div key={i} style={{ display:'flex', gap:8, padding:'7px 0',
          borderBottom:'1px solid #21262d', alignItems:'flex-start' }}>
          <span style={{ fontSize:'1rem', flexShrink:0 }}>{e.icon}</span>
          <div>
            <div style={{ fontFamily:'var(--font-mono)', fontSize:'0.72rem',
              color:'#f0a500', fontWeight:600 }}>
              T+{e.time.toFixed(0)}s — {e.name}
            </div>
            <div style={{ fontSize:'0.68rem', color:'#8b949e', marginTop:1 }}>{e.desc}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

function RocketStatusPanel({ status, orbitAchieved }: { status: string; orbitAchieved: boolean }) {
  const failed = status === 'failed' && !orbitAchieved
  const success = status === 'complete' && orbitAchieved
  const running = status === 'running'
  const label = running ? 'LIFTOFF' : failed ? 'EXPLOSION' : success ? 'SUCCESS' : 'READY'
  const color = running ? '#f0a500' : failed ? '#ff4444' : success ? '#00c896' : '#8b949e'

  return (
    <div style={{
      background:'#161b22', border:`1px solid ${color}55`, borderRadius:10,
      padding:'14px 18px', minHeight:150, display:'grid',
      gridTemplateColumns:'160px 1fr', gap:18, alignItems:'center', overflow:'hidden',
      position:'relative'
    }}>
      <style>{`
        @keyframes missionRocketLaunch {
          0% { transform: translateY(34px) scale(0.88); opacity: 0.88; }
          55% { transform: translateY(-16px) scale(0.96); opacity: 1; }
          100% { transform: translateY(-54px) scale(1.02); opacity: 0.92; }
        }
        @keyframes missionRocketFail {
          0% { transform: translateY(-18px) rotate(0deg) scale(0.95); opacity: 1; }
          45% { transform: translateY(-2px) rotate(14deg) scale(1.04); opacity: 1; }
          75% { transform: translateY(12px) rotate(-18deg) scale(0.5); opacity: 0.45; }
          100% { transform: translateY(24px) rotate(28deg) scale(0.05); opacity: 0; }
        }
        @keyframes missionExplosion {
          0%, 34% { transform: scale(0); opacity: 0; }
          48% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        @keyframes missionFlame {
          0%, 100% { transform: scaleY(0.85); opacity: 0.65; }
          50% { transform: scaleY(1.2); opacity: 1; }
        }
      `}</style>
      <div style={{
        height:120, position:'relative', display:'flex', justifyContent:'center',
        alignItems:'flex-end', borderBottom:'1px solid #30363d'
      }}>
        <div style={{
          position:'absolute', bottom:2, width:110, height:1,
          background:'linear-gradient(90deg, transparent, #8b949e, transparent)'
        }} />
        {failed && (
          <div style={{
            position:'absolute', width:76, height:76, borderRadius:'50%',
            background:'radial-gradient(circle, #ffe66d 0%, #ff8800 32%, #ff4444 58%, transparent 72%)',
            boxShadow:'0 0 30px rgba(255,68,68,0.75)',
            animation:'missionExplosion 1.15s ease-out forwards'
          }} />
        )}
        <div style={{
          position:'relative', width:38, height:92,
          animation: failed ? 'missionRocketFail 1.15s ease-in forwards' :
            running ? 'missionRocketLaunch 1.6s ease-in-out infinite alternate' : 'none',
          opacity: failed ? undefined : 1,
        }}>
          <div style={{
            position:'absolute', left:7, right:7, top:0, height:24,
            clipPath:'polygon(50% 0, 100% 100%, 0 100%)',
            background: success ? '#00c896' : '#d9ecff',
            boxShadow:`0 0 10px ${color}88`
          }} />
          <div style={{
            position:'absolute', left:8, right:8, top:22, bottom:18,
            border:'2px solid #d9ecff', borderRadius:'8px 8px 4px 4px',
            background:'linear-gradient(90deg, rgba(88,166,255,0.25), rgba(255,255,255,0.1), rgba(88,166,255,0.25))'
          }} />
          <div style={{ position:'absolute', left:1, bottom:15, width:13, height:28,
            clipPath:'polygon(100% 0, 0 100%, 100% 78%)', background:'#58a6ff' }} />
          <div style={{ position:'absolute', right:1, bottom:15, width:13, height:28,
            clipPath:'polygon(0 0, 100% 100%, 0 78%)', background:'#58a6ff' }} />
          <div style={{
            position:'absolute', left:12, right:12, bottom:0, height:18,
            border:'2px solid #8b949e', borderRadius:'2px 2px 8px 8px'
          }} />
          {running && (
            <div style={{
              position:'absolute', left:12, right:12, bottom:-28, height:34,
              clipPath:'polygon(50% 100%, 100% 0, 0 0)',
              background:'linear-gradient(180deg, #ffe66d 0%, #f0a500 46%, rgba(255,68,68,0) 100%)',
              transformOrigin:'top center',
              animation:'missionFlame 0.16s linear infinite'
            }} />
          )}
        </div>
      </div>
      <div>
        <div style={{
          fontFamily:'var(--font-hud)', fontSize:'1.4rem', fontWeight:900,
          color, letterSpacing:'0.1em', textTransform:'uppercase'
        }}>
          {label}
        </div>
        <div style={{
          fontFamily:'var(--font-mono)', color:'#8b949e', fontSize:'0.74rem',
          lineHeight:1.6, marginTop:6
        }}>
          {running ? 'Vehicle climbing. Telemetry active.' :
           failed ? 'Vehicle lost. Explosion confirmed.' :
           success ? 'Orbit confirmed. Mission success.' :
           'Vehicle armed and waiting for launch.'}
        </div>
      </div>
    </div>
  )
}

function MissionPlaybackPanel() {
  const { status, simPaused, animSpeed, setAnimSpeed, simConfig, setSimConfig, telemetry } = useMissionStore()
  const isRunning = status === 'running'
  const last = telemetry[telemetry.length - 1]
  const progress = Math.min(((last?.t ?? 0) / simConfig.max_time) * 100, 100)

  return (
    <div style={{
      background:'#161b22', border:'1px solid #21262d', borderRadius:10,
      padding:'14px 18px', minHeight:150, display:'flex', flexDirection:'column',
      justifyContent:'space-between', gap:12
    }}>
      <div>
        <div style={{ fontSize:'0.62rem', color:'#484f58', fontFamily:'var(--font-mono)',
          letterSpacing:'0.18em', textTransform:'uppercase', marginBottom:8 }}>
          Simulation Control
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={simPaused ? resumeSimulation : pauseSimulation} disabled={!isRunning} style={{
            flex:1, padding:'9px 12px', borderRadius:8, fontSize:'0.74rem',
            fontFamily:'var(--font-mono)', fontWeight:700, textTransform:'uppercase',
            background: !isRunning ? 'rgba(139,148,158,0.08)' :
              simPaused ? 'rgba(0,200,150,0.15)' : 'rgba(240,165,0,0.15)',
            color: !isRunning ? '#484f58' : simPaused ? '#00c896' : '#f0a500',
            border:`1px solid ${!isRunning ? '#30363d' : simPaused ? '#00c89666' : '#f0a50066'}`,
            cursor: isRunning ? 'pointer' : 'not-allowed'
          }}>
            {simPaused ? '▶ Resume' : '⏸ Pause'}
          </button>
        </div>
      </div>

      <div>
        <label style={{ display:'flex', justifyContent:'space-between',
          fontSize:'0.68rem', color:'#8b949e', fontFamily:'var(--font-mono)', marginBottom:6 }}>
          <span>Playback speed</span><span>{animSpeed.toFixed(0)}×</span>
        </label>
        <input type="range" min={1} max={30} step={1} value={animSpeed}
          onChange={e => setAnimSpeed(+e.target.value)}
          style={{ width:'100%', accentColor:'#f0a500' }}/>
      </div>

      <div>
        <label style={{ display:'flex', justifyContent:'space-between',
          fontSize:'0.68rem', color:'#8b949e', fontFamily:'var(--font-mono)', marginBottom:6 }}>
          <span>Test length</span><span>{simConfig.max_time.toFixed(0)}s</span>
        </label>
        <input type="range" min={120} max={1800} step={30} value={simConfig.max_time}
          disabled={isRunning}
          onChange={e => setSimConfig({ max_time:+e.target.value })}
          style={{ width:'100%', accentColor:'#58a6ff', opacity:isRunning ? 0.45 : 1 }}/>
        <div style={{ height:4, background:'#21262d', borderRadius:2, marginTop:8 }}>
          <div style={{ height:'100%', width:`${progress}%`, background:'#58a6ff',
            borderRadius:2, boxShadow:'0 0 8px #58a6ff66' }}/>
        </div>
      </div>
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:'#0d1117', border:'1px solid #30363d', borderRadius:6,
      padding:'8px 12px', fontFamily:'var(--font-mono)', fontSize:'0.7rem' }}>
      <div style={{ color:'#8b949e', marginBottom:4 }}>T+{label}s</div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ color: p.color }}>{p.name}: {p.value?.toFixed(2)}</div>
      ))}
    </div>
  )
}

export default function MissionControlPage() {
  const navigate = useNavigate()
  const { status, telemetry, events, orbitAchieved, failReason,
          scenarioId, scenarios, simPaused } = useMissionStore()

  const last = telemetry[telemetry.length - 1]
  const isRunning = status === 'running'

  // Downsample telemetry for charts (max 400 points)
  const step = Math.max(1, Math.floor(telemetry.length / 400))
  const chartData = telemetry.filter((_, i) => i % step === 0)

  const scenario = scenarios.find(s => s.id === scenarioId)

  return (
    <div style={{ padding:'24px 32px', display:'flex', flexDirection:'column', gap:16, minHeight:'100vh' }}>
      {/* Header row */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <div style={{ fontFamily:'var(--font-hud)', fontSize:'1.3rem', fontWeight:900,
            color:'#f0a500', letterSpacing:'0.1em', textTransform:'uppercase' }}>
            🚀 Mission Control
          </div>
          {scenario && (
            <div style={{ fontFamily:'var(--font-mono)', fontSize:'0.68rem',
              color: scenario.color, marginTop:2, letterSpacing:'0.12em' }}>
              ● {scenario.name} — {scenario.outcome}
            </div>
          )}
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          {/* Status badge */}
          <div style={{ padding:'6px 14px', borderRadius:20, fontFamily:'var(--font-mono)',
            fontSize:'0.7rem', letterSpacing:'0.12em', textTransform:'uppercase',
            background: isRunning ? 'rgba(240,165,0,0.15)' :
              status==='complete' ? 'rgba(0,200,150,0.15)' :
              status==='failed'   ? 'rgba(255,68,68,0.15)' : 'rgba(72,79,88,0.3)',
            border: `1px solid ${isRunning ? '#f0a500' : status==='complete' ? '#00c896' :
              status==='failed' ? '#ff4444' : '#484f58'}60`,
            color: isRunning ? '#f0a500' : status==='complete' ? '#00c896' :
              status==='failed' ? '#ff4444' : '#8b949e' }}>
            {simPaused ? '⏸ PAUSED' : isRunning ? '⚡ SIMULATING' :
             status==='complete' ? '✅ COMPLETE' : status==='failed' ? '❌ FAILED' : '⏸ STANDBY'}
          </div>
          {!isRunning ? (
            <button onClick={launchSimulation} style={{
              padding:'10px 28px', borderRadius:8, fontSize:'0.82rem',
              fontFamily:'var(--font-mono)', fontWeight:700, textTransform:'uppercase',
              letterSpacing:'0.1em', background:'#f0a500', color:'#0d1117',
              border:'none', cursor:'pointer',
              boxShadow:'0 0 20px rgba(240,165,0,0.35)', transition:'all 0.2s' }}>
              🚀 LAUNCH
            </button>
          ) : (
            <button onClick={abortSimulation} style={{
              padding:'10px 28px', borderRadius:8, fontSize:'0.82rem',
              fontFamily:'var(--font-mono)', fontWeight:700, textTransform:'uppercase',
              letterSpacing:'0.1em', background:'rgba(255,68,68,0.15)', color:'#ff4444',
              border:'1px solid rgba(255,68,68,0.4)', cursor:'pointer', transition:'all 0.2s' }}>
              🛑 ABORT
            </button>
          )}
          <button onClick={() => navigate('/analysis')} style={{
            padding:'10px 20px', borderRadius:8, fontSize:'0.78rem',
            fontFamily:'var(--font-mono)', background:'rgba(88,166,255,0.1)',
            color:'#58a6ff', border:'1px solid rgba(88,166,255,0.3)', cursor:'pointer' }}>
            📊 Analysis
          </button>
        </div>
      </div>

      {/* HUD Gauges */}
      <div style={{ display:'flex', gap:10 }}>
        <HudGauge label="Altitude"    value={last?.alt    ?? 0} unit="km"  max={450}  color="#f0a500"/>
        <HudGauge label="Velocity"    value={last?.vel    ?? 0} unit="m/s" max={8000} color="#00c896" decimals={0}/>
        <HudGauge label="Mach"        value={last?.mach   ?? 0} unit="Ma"  max={10}   color="#58a6ff"/>
        <HudGauge label="Accel"       value={last?.accel_g?? 0} unit="g"   max={8}    color="#bc8cff"/>
        <HudGauge label="Dyn. Press"  value={last?.q_kpa  ?? 0} unit="kPa" max={80}   color="#ff8800"/>
        <HudGauge label="Downrange"   value={last?.downrange??0} unit="km" max={3000} color="#ffd166" decimals={0}/>
      </div>

      {/* Fuel bars */}
      {last && (
        <div style={{ display:'flex', gap:10 }}>
          {[
            { label:'S1 Propellant', val:last.s1_prop, max:useMissionStore.getState().rocket.stage1.prop_mass, color:'#f0a500' },
            { label:'S2 Propellant', val:last.s2_prop, max:useMissionStore.getState().rocket.stage2.prop_mass, color:'#58a6ff' },
            { label:'Vehicle Mass',  val:last.mass,    max:useMissionStore.getState().rocket.stage1.dry_mass + useMissionStore.getState().rocket.stage1.prop_mass + useMissionStore.getState().rocket.stage2.dry_mass + useMissionStore.getState().rocket.stage2.prop_mass + useMissionStore.getState().rocket.payload_kg, color:'#8b949e' },
          ].map(f => (
            <div key={f.label} style={{ flex:1, background:'#161b22',
              border:'1px solid #21262d', borderRadius:8, padding:'10px 14px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                <span style={{ fontSize:'0.62rem', color:'#8b949e', fontFamily:'var(--font-mono)',
                  letterSpacing:'0.12em', textTransform:'uppercase' }}>{f.label}</span>
                <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.75rem', color:f.color }}>
                  {f.val.toFixed(0)} kg
                </span>
              </div>
              <div style={{ height:6, background:'#21262d', borderRadius:3 }}>
                <div style={{ height:'100%', width:`${Math.min(f.val/f.max*100,100)}%`,
                  background:f.color, borderRadius:3, transition:'width 0.3s',
                  boxShadow:`0 0 8px ${f.color}60` }}/>
              </div>
            </div>
          ))}
          <div style={{ background:'#161b22', border:'1px solid #21262d', borderRadius:8,
            padding:'10px 14px', display:'flex', flexDirection:'column', justifyContent:'center' }}>
            <div style={{ fontSize:'0.6rem', color:'#8b949e', fontFamily:'var(--font-mono)',
              letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:4 }}>Stage</div>
            <div style={{ fontFamily:'var(--font-hud)', fontSize:'1.4rem',
              color: last.stage===1 ? '#f0a500' : '#58a6ff', fontWeight:700 }}>
              S{last.stage}
            </div>
          </div>
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:12 }}>
        <RocketStatusPanel status={status} orbitAchieved={orbitAchieved} />
        <MissionPlaybackPanel />
      </div>

      {/* Charts + Event Log */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 280px', gap:12, flex:1, minHeight:420 }}>
        {/* Altitude chart */}
        <div style={{ background:'#161b22', border:'1px solid #21262d', borderRadius:10, padding:'14px' }}>
          <div style={{ fontSize:'0.62rem', color:'#f0a500', fontFamily:'var(--font-mono)',
            letterSpacing:'0.18em', textTransform:'uppercase', marginBottom:8 }}>Altitude [km]</div>
          <ResponsiveContainer width="100%" height={170}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="altGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#f0a500" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#f0a500" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262d"/>
              <XAxis dataKey="t" stroke="#484f58" tick={{ fill:'#484f58', fontSize:10 }} tickFormatter={v=>`${v}s`}/>
              <YAxis stroke="#484f58" tick={{ fill:'#484f58', fontSize:10 }}/>
              <Tooltip content={<CustomTooltip/>}/>
              <ReferenceLine y={350} stroke="#00c896" strokeDasharray="4 4" label={{ value:'LEO', fill:'#00c896', fontSize:10 }}/>
              <Area type="monotone" dataKey="alt" stroke="#f0a500" fill="url(#altGrad)" strokeWidth={2} dot={false} name="alt"/>
            </AreaChart>
          </ResponsiveContainer>
          {/* Velocity */}
          <div style={{ fontSize:'0.62rem', color:'#00c896', fontFamily:'var(--font-mono)',
            letterSpacing:'0.18em', textTransform:'uppercase', margin:'12px 0 8px' }}>Velocity [m/s]</div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="velGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#00c896" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#00c896" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262d"/>
              <XAxis dataKey="t" stroke="#484f58" tick={{ fill:'#484f58', fontSize:10 }} tickFormatter={v=>`${v}s`}/>
              <YAxis stroke="#484f58" tick={{ fill:'#484f58', fontSize:10 }}/>
              <Tooltip content={<CustomTooltip/>}/>
              <ReferenceLine y={7700} stroke="#f0a500" strokeDasharray="4 4" label={{ value:'v_orb', fill:'#f0a500', fontSize:10 }}/>
              <Area type="monotone" dataKey="vel" stroke="#00c896" fill="url(#velGrad)" strokeWidth={2} dot={false} name="vel"/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Mach + Accel + Fuel */}
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ background:'#161b22', border:'1px solid #21262d', borderRadius:10, padding:'14px', flex:1 }}>
            <div style={{ fontSize:'0.62rem', color:'#58a6ff', fontFamily:'var(--font-mono)',
              letterSpacing:'0.18em', textTransform:'uppercase', marginBottom:8 }}>Mach + Dynamic Pressure</div>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d"/>
                <XAxis dataKey="t" stroke="#484f58" tick={{ fill:'#484f58', fontSize:10 }} tickFormatter={v=>`${v}s`}/>
                <YAxis yAxisId="mach" stroke="#484f58" tick={{ fill:'#484f58', fontSize:10 }}/>
                <YAxis yAxisId="q" orientation="right" stroke="#484f58" tick={{ fill:'#484f58', fontSize:10 }}/>
                <Tooltip content={<CustomTooltip/>}/>
                <Line yAxisId="mach" type="monotone" dataKey="mach"  stroke="#58a6ff" strokeWidth={2} dot={false} name="Mach"/>
                <Line yAxisId="q"    type="monotone" dataKey="q_kpa" stroke="#ff8800" strokeWidth={1.5} dot={false} name="Q(kPa)"/>
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div style={{ background:'#161b22', border:'1px solid #21262d', borderRadius:10, padding:'14px', flex:1 }}>
            <div style={{ fontSize:'0.62rem', color:'#bc8cff', fontFamily:'var(--font-mono)',
              letterSpacing:'0.18em', textTransform:'uppercase', marginBottom:8 }}>Acceleration [g] + Stability</div>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d"/>
                <XAxis dataKey="t" stroke="#484f58" tick={{ fill:'#484f58', fontSize:10 }} tickFormatter={v=>`${v}s`}/>
                <YAxis yAxisId="a" stroke="#484f58" tick={{ fill:'#484f58', fontSize:10 }}/>
                <YAxis yAxisId="s" orientation="right" stroke="#484f58" tick={{ fill:'#484f58', fontSize:10 }}/>
                <Tooltip content={<CustomTooltip/>}/>
                <ReferenceLine yAxisId="s" y={1} stroke="#00c896" strokeDasharray="4 4"/>
                <Line yAxisId="a" type="monotone" dataKey="accel_g" stroke="#bc8cff" strokeWidth={2} dot={false} name="Accel(g)"/>
                <Line yAxisId="s" type="monotone" dataKey="stab"    stroke="#00c896" strokeWidth={1.5} dot={false} name="Stab.Margin"/>
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div style={{ background:'#161b22', border:'1px solid #21262d', borderRadius:10, padding:'14px', flex:1 }}>
            <div style={{ fontSize:'0.62rem', color:'#ffd166', fontFamily:'var(--font-mono)',
              letterSpacing:'0.18em', textTransform:'uppercase', marginBottom:8 }}>Propellant Mass [kg]</div>
            <ResponsiveContainer width="100%" height={120}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d"/>
                <XAxis dataKey="t" stroke="#484f58" tick={{ fill:'#484f58', fontSize:10 }} tickFormatter={v=>`${v}s`}/>
                <YAxis stroke="#484f58" tick={{ fill:'#484f58', fontSize:10 }}/>
                <Tooltip content={<CustomTooltip/>}/>
                <Area type="monotone" dataKey="s1_prop" stroke="#f0a500" fill="rgba(240,165,0,0.15)" strokeWidth={2} dot={false} name="S1 prop" stackId="a"/>
                <Area type="monotone" dataKey="s2_prop" stroke="#58a6ff" fill="rgba(88,166,255,0.15)" strokeWidth={2} dot={false} name="S2 prop" stackId="b"/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Event log */}
        <EventLog events={events}/>
      </div>

      {/* Orbit result banner */}
      {(status === 'complete' || status === 'failed') && (
        <div style={{
          padding:'20px 28px', borderRadius:12, textAlign:'center',
          background: orbitAchieved ? 'rgba(0,200,150,0.1)' : 'rgba(255,68,68,0.1)',
          border: `1px solid ${orbitAchieved ? '#00c896' : '#ff4444'}50` }}>
          <div style={{ fontFamily:'var(--font-hud)', fontSize:'1.8rem', fontWeight:900,
            color: orbitAchieved ? '#00c896' : '#ff4444', letterSpacing:'0.1em' }}>
            {orbitAchieved ? '✅ ORBIT ACHIEVED — MISSION SUCCESS' : '❌ MISSION FAILED'}
          </div>
          {!orbitAchieved && failReason && (
            <div style={{ fontFamily:'var(--font-mono)', fontSize:'0.78rem', color:'#8b949e', marginTop:8 }}>
              {failReason}
            </div>
          )}
          {last && (
            <div style={{ display:'flex', justifyContent:'center', gap:32, marginTop:12 }}>
              {[
                ['Final Alt', `${last.alt.toFixed(1)} km`],
                ['Final Vel', `${last.vel.toFixed(0)} m/s`],
                ['Max Mach',  `${Math.max(...telemetry.map(t=>t.mach)).toFixed(2)}`],
                ['T+', `${last.t.toFixed(0)} s`],
              ].map(([l,v]) => (
                <div key={l}>
                  <div style={{ fontFamily:'var(--font-mono)', fontSize:'1rem',
                    color:'#e6edf3', fontWeight:600 }}>{v}</div>
                  <div style={{ fontSize:'0.62rem', color:'#8b949e', letterSpacing:'0.15em',
                    textTransform:'uppercase' }}>{l}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
