import { useState } from 'react'
import { exportTtsFile } from '../services/apiService'
import { getAvailableTtsVoices } from '../services/wsService'

export default function TtsExportPage() {
  const voices = getAvailableTtsVoices()
  const [text, setText] = useState('Ignicullus telemetry online.')
  const [voice, setVoice] = useState('F4')
  const [lang, setLang] = useState<'en' | 'pl'>('en')
  const [filename, setFilename] = useState('ignicullus-tts')
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  const generate = async () => {
    const cleanText = text.trim()
    if (!cleanText) {
      setError('Text is required.')
      return
    }

    setRunning(true)
    setError('')
    setResult(null)

    try {
      const response = await exportTtsFile({
        text: cleanText,
        voice,
        filename,
        lang,
      })
      setResult(response)
    } catch (e: any) {
      setError(e?.response?.data?.detail || e.message || 'TTS export failed')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div style={{ padding:'32px 40px', maxWidth:980 }}>
      <div style={{ fontFamily:'var(--font-hud)', fontSize:'1.35rem', fontWeight:900,
        color:'#58a6ff', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:6 }}>
        🔊 Supertonic File Export
      </div>
      <div style={{ fontFamily:'var(--font-mono)', fontSize:'0.68rem', color:'#8b949e',
        letterSpacing:'0.18em', textTransform:'uppercase', marginBottom:26 }}>
        Generate a WAV file on the backend disk in backend/generated_tts
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1.4fr 0.8fr', gap:18 }}>
        <section style={{ background:'#161b22', border:'1px solid #21262d', borderRadius:12, padding:'20px 22px' }}>
          <label style={{ display:'block', color:'#8b949e', fontFamily:'var(--font-mono)',
            fontSize:'0.72rem', marginBottom:8 }}>
            Text to synthesize
          </label>
          <textarea value={text} onChange={e => setText(e.target.value)} maxLength={5000}
            style={{ width:'100%', minHeight:260, resize:'vertical', background:'#0d1117',
              color:'#e6edf3', border:'1px solid #30363d', borderRadius:10, padding:'12px 14px',
              fontFamily:'var(--font-mono)', fontSize:'0.82rem', lineHeight:1.55 }} />
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:8,
            color:'#484f58', fontFamily:'var(--font-mono)', fontSize:'0.64rem' }}>
            <span>Max 5000 characters</span>
            <span>{text.length}/5000</span>
          </div>
        </section>

        <section style={{ background:'#161b22', border:'1px solid #21262d', borderRadius:12, padding:'20px 22px' }}>
          <label style={{ display:'block', color:'#8b949e', fontFamily:'var(--font-mono)',
            fontSize:'0.72rem', marginBottom:8 }}>
            Voice
          </label>
          <select value={voice} onChange={e => setVoice(e.target.value)} style={{
            width:'100%', background:'#0d1117', color:'#e6edf3', border:'1px solid #30363d',
            borderRadius:8, padding:'10px 12px', fontFamily:'var(--font-mono)', fontSize:'0.76rem',
            marginBottom:18
          }}>
            {voices.map(v => (
              <option key={v.id} value={v.id}>{v.name} [{v.lang}]</option>
            ))}
          </select>

          <label style={{ display:'block', color:'#8b949e', fontFamily:'var(--font-mono)',
            fontSize:'0.72rem', marginBottom:8 }}>
            Language
          </label>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:18 }}>
            {[
              { id:'en', label:'EN' },
              { id:'pl', label:'PL' },
            ].map(option => (
              <button key={option.id} type="button" onClick={() => setLang(option.id as 'en' | 'pl')}
                style={{
                  padding:'9px 10px', borderRadius:8, fontFamily:'var(--font-mono)',
                  fontWeight:800, cursor:'pointer',
                  background:lang === option.id ? '#58a6ff' : '#0d1117',
                  color:lang === option.id ? '#0d1117' : '#8b949e',
                  border:`1px solid ${lang === option.id ? '#58a6ff' : '#30363d'}`,
                }}>
                {option.label}
              </button>
            ))}
          </div>

          <label style={{ display:'block', color:'#8b949e', fontFamily:'var(--font-mono)',
            fontSize:'0.72rem', marginBottom:8 }}>
            File name
          </label>
          <input value={filename} onChange={e => setFilename(e.target.value)}
            style={{ width:'100%', boxSizing:'border-box', background:'#0d1117', color:'#e6edf3',
              border:'1px solid #30363d', borderRadius:8, padding:'10px 12px',
              fontFamily:'var(--font-mono)', fontSize:'0.76rem', marginBottom:16 }} />

          <button onClick={generate} disabled={running} style={{
            width:'100%', padding:'13px 14px', borderRadius:10, border:'none',
            background:running ? 'rgba(88,166,255,0.16)' : '#58a6ff',
            color:running ? '#58a6ff' : '#0d1117', fontFamily:'var(--font-mono)',
            fontWeight:900, letterSpacing:'0.08em', textTransform:'uppercase',
            cursor:running ? 'not-allowed' : 'pointer'
          }}>
            {running ? 'Generating...' : 'Create WAV File'}
          </button>

          {error && (
            <div style={{ marginTop:14, padding:'10px 12px', borderRadius:8,
              background:'rgba(255,68,68,0.1)', border:'1px solid rgba(255,68,68,0.35)',
              color:'#ff4444', fontFamily:'var(--font-mono)', fontSize:'0.7rem' }}>
              {error}
            </div>
          )}

          {result && (
            <div style={{ marginTop:14, padding:'12px', borderRadius:8,
              background:'rgba(0,200,150,0.1)', border:'1px solid rgba(0,200,150,0.35)',
              color:'#00c896', fontFamily:'var(--font-mono)', fontSize:'0.68rem', lineHeight:1.6 }}>
              <div>Saved: {result.filename}</div>
              <div>Language: {lang.toUpperCase()}</div>
              <div>Bytes: {result.bytes}</div>
              <div style={{ color:'#8b949e', wordBreak:'break-all' }}>{result.path}</div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
