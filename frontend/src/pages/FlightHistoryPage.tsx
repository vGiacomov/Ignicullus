import { useEffect, useState } from 'react'
import { deleteFlight, fetchFlights } from '../services/apiService'
import type { FlightRun } from '../types'

const fmt = (value: number, digits = 0) => value.toLocaleString('pl-PL', {
  maximumFractionDigits: digits,
  minimumFractionDigits: digits,
})

export default function FlightHistoryPage() {
  const [flights, setFlights] = useState<FlightRun[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    fetchFlights()
      .then(setFlights)
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const remove = async (id: number) => {
    await deleteFlight(id)
    setFlights(current => current.filter(flight => flight.id !== id))
  }

  return (
    <div style={{ padding:'32px 40px', minHeight:'100vh' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:24 }}>
        <div>
          <div style={{
            fontFamily:'var(--font-hud)', fontSize:'1.5rem', fontWeight:900,
            color:'#f0a500', letterSpacing:'0.1em', textTransform:'uppercase'
          }}>
            Flight Scores
          </div>
          <div style={{
            fontFamily:'var(--font-mono)', color:'#8b949e', fontSize:'0.72rem',
            letterSpacing:'0.2em', textTransform:'uppercase', marginTop:6
          }}>
            SQLite history · best scores first
          </div>
        </div>
        <button onClick={load} style={{
          padding:'10px 16px', borderRadius:8, border:'1px solid rgba(88,166,255,0.35)',
          background:'rgba(88,166,255,0.1)', color:'#58a6ff',
          fontFamily:'var(--font-mono)', fontSize:'0.75rem', cursor:'pointer'
        }}>
          Refresh
        </button>
      </div>

      <div style={{ background:'#161b22', border:'1px solid #21262d', borderRadius:10, overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontFamily:'var(--font-mono)' }}>
          <thead>
            <tr style={{ background:'#0d1117', color:'#8b949e', fontSize:'0.62rem', letterSpacing:'0.12em', textTransform:'uppercase' }}>
              {['Score', 'Status', 'Scenario', 'Time', 'Final alt', 'Final vel', 'Max alt', 'Max mach', 'Max Q', 'Mass', 'Date', ''].map(header => (
                <th key={header} style={{ textAlign:'left', padding:'12px 10px', borderBottom:'1px solid #21262d' }}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={12} style={{ padding:28, textAlign:'center', color:'#8b949e', fontSize:'0.8rem' }}>
                  Loading flights...
                </td>
              </tr>
            )}
            {!loading && flights.length === 0 && (
              <tr>
                <td colSpan={12} style={{ padding:28, textAlign:'center', color:'#8b949e', fontSize:'0.8rem' }}>
                  No saved flights yet.
                </td>
              </tr>
            )}
            {!loading && flights.map((flight) => (
              <tr key={flight.id} style={{ borderBottom:'1px solid #21262d' }}>
                <td style={{ padding:'10px', color:flight.score >= 80 ? '#00c896' : flight.score >= 50 ? '#f0a500' : '#ff4444', fontWeight:700 }}>
                  {flight.score}
                </td>
                <td style={{ padding:'10px', color:flight.success ? '#00c896' : '#ff4444', fontSize:'0.75rem' }}>
                  {flight.success ? 'SUCCESS' : 'FAILED'}
                </td>
                <td style={{ padding:'10px', color:'#e6edf3', fontSize:'0.75rem' }}>{flight.scenario}</td>
                <td style={{ padding:'10px', color:'#8b949e', fontSize:'0.75rem' }}>T+{fmt(flight.final_time_s)}s</td>
                <td style={{ padding:'10px', color:'#f0a500', fontSize:'0.75rem' }}>{fmt(flight.final_alt_km, 1)} km</td>
                <td style={{ padding:'10px', color:'#00c896', fontSize:'0.75rem' }}>{fmt(flight.final_vel_ms)} m/s</td>
                <td style={{ padding:'10px', color:'#8b949e', fontSize:'0.75rem' }}>{fmt(flight.max_alt_km, 1)} km</td>
                <td style={{ padding:'10px', color:'#58a6ff', fontSize:'0.75rem' }}>{fmt(flight.max_mach, 2)}</td>
                <td style={{ padding:'10px', color:'#ff8800', fontSize:'0.75rem' }}>{fmt(flight.max_q_kpa, 1)} kPa</td>
                <td style={{ padding:'10px', color:'#8b949e', fontSize:'0.75rem' }}>{fmt(flight.total_mass_kg)} kg</td>
                <td style={{ padding:'10px', color:'#8b949e', fontSize:'0.7rem' }}>
                  {new Date(flight.created_at).toLocaleString('pl-PL')}
                </td>
                <td style={{ padding:'10px', textAlign:'right' }}>
                  <button onClick={() => remove(flight.id)} title="Delete flight" style={{
                    padding:'6px 10px', borderRadius:6, border:'1px solid rgba(255,68,68,0.4)',
                    background:'rgba(255,68,68,0.1)', color:'#ff4444',
                    fontFamily:'var(--font-mono)', cursor:'pointer'
                  }}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
