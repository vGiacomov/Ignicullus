import { useNavigate } from 'react-router-dom'
import { useMissionStore } from '../store/missionStore'

export default function HomePage() {
  const navigate = useNavigate()
  const { status, orbitAchieved, telemetry } = useMissionStore()
  const last = telemetry[telemetry.length - 1]

  return (
    <div style={{ position:'relative', minHeight:'100vh', overflow:'hidden' }}>
      {/* Video background */}
      <video autoPlay muted loop playsInline
        style={{ position:'fixed', inset:0, width:'100%', height:'100%',
          objectFit:'cover', opacity:0.55, zIndex:0, marginLeft:'-240px',
          paddingLeft:'240px' }}>
        <source src="/rocket_launch.mp4" type="video/mp4"/>
      </video>

      {/* Gradient overlay */}
      <div style={{ position:'absolute', inset:0, zIndex:1,
        background:'linear-gradient(180deg,rgba(13,17,23,0) 0%,rgba(13,17,23,0.5) 50%,rgba(13,17,23,0.97) 100%)' }}/>

      {/* Content */}
      <div style={{ position:'relative', zIndex:2, padding:'0 48px',
        display:'flex', flexDirection:'column', minHeight:'100vh', justifyContent:'flex-end', paddingBottom:64 }}>

        <div style={{ fontFamily:'var(--font-hud)', fontSize:'clamp(2.5rem,5vw,5rem)',
          fontWeight:900, color:'#f0a500', lineHeight:1.05, letterSpacing:'0.1em',
          textTransform:'uppercase', textShadow:'0 0 60px rgba(240,165,0,0.5)' }}>
          IGNICULLUS
        </div>
        <div style={{ fontFamily:'var(--font-mono)', fontSize:'0.75rem', color:'#8b949e',
          letterSpacing:'0.28em', textTransform:'uppercase', marginTop:10 }}>
          Satellite Launch System · Mission Digital Twin
        </div>
        <p style={{ marginTop:20, color:'#c9d1d9', fontSize:'1rem', lineHeight:1.8,
          maxWidth:580, textShadow:'0 1px 8px rgba(0,0,0,0.9)' }}>
          IGNICULLUS to cyfrowy bliźniak rakiety nośnej dla małego satelity na niską orbitę
          okołoziemską. Symulacja RK4, telemetria live przez WebSocket,
          komentator TTS i optymalizator genetyczny.
        </p>

        {/* Tags */}
        <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:20 }}>
          {[
            ['🚀 RK4 Physics',     '#f0a500'],
            ['📡 Live WebSocket',  '#00c896'],
            ['🤖 Ollama TTS',      '#58a6ff'],
            ['🌍 Three.js 3D',     '#bc8cff'],
            ['🧬 GA Optimizer',    '#ff8800'],
            ['⚡ FastAPI Backend', '#00c896'],
          ].map(([label, color]) => (
            <span key={label as string} style={{
              fontSize:'0.68rem', padding:'5px 13px', borderRadius:999,
              border:`1px solid ${color}60`, color: color as string,
              background:`${color}15`, fontFamily:'var(--font-mono)',
              letterSpacing:'0.08em'
            }}>{label}</span>
          ))}
        </div>

        {/* Stats */}
        <div style={{ display:'flex', gap:'3rem', marginTop:32 }}>
          {[
            ['400 km', 'Target LEO'],
            ['7.9 km/s', 'Orbital vel.'],
            ['RK4 0.1s', 'Integration'],
            ['5', 'Scenarios'],
          ].map(([val, lbl]) => (
            <div key={lbl}>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:'1.8rem',
                fontWeight:700, color:'#f0a500' }}>{val}</div>
              <div style={{ fontSize:'0.62rem', color:'#8b949e',
                letterSpacing:'0.18em', textTransform:'uppercase' }}>{lbl}</div>
            </div>
          ))}
        </div>

        {/* CTA buttons */}
        <div style={{ display:'flex', gap:12, marginTop:36 }}>
          <button onClick={() => navigate('/prelaunch')} style={{
            padding:'13px 32px', borderRadius:8, fontSize:'0.85rem',
            fontFamily:'var(--font-mono)', fontWeight:700,
            background:'#f0a500', color:'#0d1117', border:'none',
            cursor:'pointer', letterSpacing:'0.08em', textTransform:'uppercase',
            boxShadow:'0 0 30px rgba(240,165,0,0.4)',
            transition:'all 0.2s'
          }}>⚙️ Configure Mission</button>
          <button onClick={() => navigate('/mission')} style={{
            padding:'13px 32px', borderRadius:8, fontSize:'0.85rem',
            fontFamily:'var(--font-mono)', fontWeight:700,
            background:'transparent', color:'#f0a500',
            border:'1px solid rgba(240,165,0,0.5)',
            cursor:'pointer', letterSpacing:'0.08em', textTransform:'uppercase',
            transition:'all 0.2s'
          }}>🚀 Mission Control</button>
        </div>

        {/* Last mission summary */}
        {status !== 'idle' && (
          <div style={{ marginTop:32, padding:'16px 20px', borderRadius:10,
            background:'rgba(22,27,34,0.9)', border:'1px solid #30363d',
            maxWidth:500 }}>
            <div style={{ fontSize:'0.65rem', color:'#484f58', letterSpacing:'0.2em',
              textTransform:'uppercase', marginBottom:8, fontFamily:'var(--font-mono)' }}>
              Last Mission
            </div>
            <div style={{ display:'flex', gap:24 }}>
              <div>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:'1.1rem',
                  color: orbitAchieved ? '#00c896' : '#ff4444', fontWeight:700 }}>
                  {orbitAchieved ? '✅ ORBIT' : '❌ FAILED'}
                </div>
              </div>
              {last && <>
                <div>
                  <div style={{ fontFamily:'var(--font-mono)', color:'#f0a500' }}>
                    {(last.alt).toFixed(1)} km
                  </div>
                  <div style={{ fontSize:'0.6rem', color:'#8b949e' }}>MAX ALT</div>
                </div>
                <div>
                  <div style={{ fontFamily:'var(--font-mono)', color:'#58a6ff' }}>
                    {last.vel.toFixed(0)} m/s
                  </div>
                  <div style={{ fontSize:'0.6rem', color:'#8b949e' }}>FINAL VEL</div>
                </div>
              </>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
