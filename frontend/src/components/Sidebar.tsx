import { NavLink } from 'react-router-dom'
import { useMissionStore } from '../store/missionStore'

const NAV = [
  { to:'/',           icon:'🏠', label:'Home' },
  { to:'/prelaunch',  icon:'⚙️', label:'Pre-Launch Config' },
  { to:'/mission',    icon:'🚀', label:'Mission Control' },
  { to:'/analysis',   icon:'📊', label:'Analysis' },
  { to:'/optimizer',  icon:'🧬', label:'AI Optimizer' },
]

export default function Sidebar() {
  const { scenarios, scenarioId, setScenario, ttsEnabled, setTTS, animSpeed, setAnimSpeed, status } = useMissionStore()

  return (
    <aside style={{
      position:'fixed', left:0, top:0, bottom:0, width:240,
      background:'#0d1117', borderRight:'1px solid #21262d',
      display:'flex', flexDirection:'column', zIndex:100,
      fontFamily:'var(--font-mono)', overflowY:'auto'
    }}>
      {/* Logo */}
      <div style={{ padding:'20px 16px 12px', borderBottom:'1px solid #21262d' }}>
        <div style={{ fontFamily:'var(--font-hud)', fontSize:'0.75rem', color:'#f0a500',
          fontWeight:900, letterSpacing:'0.12em', textTransform:'uppercase' }}>
          🛸 IGNICULLUS
        </div>
        <div style={{ fontFamily:'var(--font-hud)', fontSize:'0.62rem', color:'#484f58',
          letterSpacing:'0.18em', marginTop:2 }}>LAUNCH SYSTEM v2.0</div>
      </div>

      {/* Nav */}
      <nav style={{ padding:'8px 0' }}>
        <div style={{ padding:'6px 16px 4px', fontSize:'0.6rem', color:'#484f58',
          letterSpacing:'0.2em', textTransform:'uppercase' }}>Navigation</div>
        {NAV.map(n => (
          <NavLink key={n.to} to={n.to} end={n.to==='/'} style={({ isActive }) => ({
            display:'flex', alignItems:'center', gap:8, padding:'8px 16px',
            textDecoration:'none', fontSize:'0.78rem', fontFamily:'var(--font-mono)',
            color: isActive ? '#f0a500' : '#8b949e',
            background: isActive ? 'rgba(240,165,0,0.08)' : 'transparent',
            borderLeft: isActive ? '2px solid #f0a500' : '2px solid transparent',
            transition:'all 0.15s'
          })}>
            <span>{n.icon}</span><span>{n.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Scenarios */}
      <div style={{ padding:'8px 0', borderTop:'1px solid #21262d' }}>
        <div style={{ padding:'6px 16px 4px', fontSize:'0.6rem', color:'#484f58',
          letterSpacing:'0.2em', textTransform:'uppercase' }}>Scenario</div>
        {scenarios.map(sc => (
          <button key={sc.id} onClick={() => setScenario(sc.id)} style={{
            display:'flex', alignItems:'center', gap:8, padding:'7px 16px',
            width:'100%', textAlign:'left', border:'none',
            borderLeft: scenarioId===sc.id ? `2px solid ${sc.color}` : '2px solid transparent',
            color: scenarioId===sc.id ? sc.color : '#8b949e',
            fontSize:'0.75rem', fontFamily:'var(--font-mono)', cursor:'pointer',
            background: scenarioId===sc.id ? `${sc.color}12` : 'transparent',
            transition:'all 0.15s'
          }}>
            <span style={{ width:6, height:6, borderRadius:'50%',
              background:sc.color, flexShrink:0 }}/>
            <span style={{ lineHeight:1.3 }}>{sc.name}</span>
          </button>
        ))}
      </div>

      {/* System settings */}
      <div style={{ padding:'8px 0', borderTop:'1px solid #21262d', marginTop:'auto' }}>
        <div style={{ padding:'6px 16px 8px', fontSize:'0.6rem', color:'#484f58',
          letterSpacing:'0.2em', textTransform:'uppercase' }}>System</div>
        <div style={{ padding:'0 16px 8px' }}>
          <label style={{ fontSize:'0.7rem', color:'#8b949e', display:'block', marginBottom:4 }}>
            Anim speed: {animSpeed.toFixed(1)}×
          </label>
          <input type="range" min={0.5} max={5} step={0.5} value={animSpeed}
            onChange={e => setAnimSpeed(+e.target.value)}
            style={{ width:'100%', accentColor:'#f0a500' }}/>
        </div>
        <div style={{ padding:'0 16px 8px', display:'flex', alignItems:'center', gap:8 }}>
          <button onClick={() => setTTS(!ttsEnabled)} style={{
            padding:'5px 12px', borderRadius:6, fontSize:'0.7rem',
            background: ttsEnabled ? 'rgba(0,200,150,0.15)' : 'rgba(255,68,68,0.1)',
            border: `1px solid ${ttsEnabled ? '#00c896' : '#ff4444'}`,
            color: ttsEnabled ? '#00c896' : '#ff4444', fontFamily:'var(--font-mono)'
          }}>
            {ttsEnabled ? '🔊 TTS ON' : '🔇 TTS OFF'}
          </button>
        </div>
        {/* Status indicator */}
        <div style={{ padding:'6px 16px', display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ width:6, height:6, borderRadius:'50%', flexShrink:0,
            background: status==='running' ? '#f0a500' : status==='complete' ? '#00c896' :
              status==='failed' ? '#ff4444' : '#484f58',
            boxShadow: status==='running' ? '0 0 8px #f0a500' : 'none',
            animation: status==='running' ? 'pulse 1s infinite' : 'none'
          }}/>
          <span style={{ fontSize:'0.65rem', color:'#8b949e', fontFamily:'var(--font-mono)',
            letterSpacing:'0.1em', textTransform:'uppercase' }}>
            {status==='running' ? 'SIM ACTIVE' : status==='complete' ? 'ORBIT OK' :
             status==='failed' ? 'ABORTED' : 'STANDBY'}
          </span>
        </div>
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
    </aside>
  )
}
