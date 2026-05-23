import { useRef, useState } from 'react'
import { useMissionStore } from '../store/missionStore'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import {
  ScatterChart, Scatter, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts'

const CT = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null

  return (
    <div style={{
      background: '#0d1117',
      border: '1px solid #30363d',
      borderRadius: 6,
      padding: '8px 12px',
      fontFamily: 'var(--font-mono)',
      fontSize: '0.7rem'
    }}>
      {payload.map((p: any) => (
        <div key={p.name} style={{ color: p.color || '#e6edf3' }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(3) : p.value}
        </div>
      ))}
    </div>
  )
}

export default function AnalysisPage() {
  const {
    telemetry,
    events,
    orbitAchieved
  } = useMissionStore()

  const [pdfLoading, setPdfLoading] = useState(false)

  const kpiRef = useRef<HTMLDivElement>(null)
  const trajectoryRef = useRef<HTMLDivElement>(null)
  const radarRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<HTMLDivElement>(null)
  const thrustRef = useRef<HTMLDivElement>(null)
  const eventsRef = useRef<HTMLDivElement>(null)

  if (telemetry.length === 0) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '80vh',
        color: '#484f58',
        fontFamily: 'var(--font-mono)',
        fontSize: '0.85rem'
      }}>
        <div style={{ fontSize: '3rem', marginBottom: 16 }}>📊</div>
        <div>No simulation data yet.</div>
        <div style={{ marginTop: 8, fontSize: '0.7rem', color: '#30363d' }}>
          Run a simulation in Mission Control first.
        </div>
      </div>
    )
  }

  const step = Math.max(1, Math.floor(telemetry.length / 500))
  const cd = telemetry.filter((_, i) => i % step === 0)

  const maxAlt = Math.max(...telemetry.map(t => t.alt))
  const maxVel = Math.max(...telemetry.map(t => t.vel))
  const maxMach = Math.max(...telemetry.map(t => t.mach))
  const maxQ = Math.max(...telemetry.map(t => t.q_kpa))
  const maxAccel = Math.max(...telemetry.map(t => t.accel_g))
  const finalAlt = telemetry[telemetry.length - 1].alt
  const finalVel = telemetry[telemetry.length - 1].vel

  const radarData = [
    { metric: 'DV Efficiency', val: Math.min(finalVel / 7700 * 100, 100) },
    { metric: 'Altitude', val: Math.min(finalAlt / 400 * 100, 100) },
    { metric: 'Stability', val: Math.min(Math.max(...telemetry.map(t => t.stab)) / 3 * 100, 100) },
    { metric: 'Accel Safety', val: Math.max(0, 100 - maxAccel / 10 * 100) },
    { metric: 'Q Margin', val: Math.max(0, 100 - maxQ / 80 * 100) },
    { metric: 'Mach Efficiency', val: Math.min(maxMach / 8 * 100, 100) },
  ]

  const traj = cd.map(p => ({ x: p.downrange, y: p.alt }))

  const captureElement = async (element: HTMLDivElement | null) => {
    if (!element) return null

    const canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: '#161b22',
      useCORS: true,
      logging: false
    })

    return canvas.toDataURL('image/png')
  }

  const addTitle = (pdf: jsPDF, title: string, y: number) => {
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(14)
    pdf.setTextColor(25, 25, 25)
    pdf.text(title, 14, y)
  }

  const addParagraph = (pdf: jsPDF, text: string, y: number) => {
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(10)
    pdf.setTextColor(45, 45, 45)

    const pageWidth = pdf.internal.pageSize.getWidth()
    const lines = pdf.splitTextToSize(text, pageWidth - 28)

    pdf.text(lines, 14, y)

    return y + lines.length * 5 + 4
  }

  const addSectionImage = (
    pdf: jsPDF,
    imageData: string | null,
    title: string,
    yStart: number,
    maxHeight: number
  ) => {
    if (!imageData) return yStart

    const pageWidth = pdf.internal.pageSize.getWidth()
    const margin = 14
    const imageWidth = pageWidth - margin * 2

    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(12)
    pdf.setTextColor(25, 25, 25)
    pdf.text(title, margin, yStart)

    const imageProperties = pdf.getImageProperties(imageData)
    let imageHeight = (imageProperties.height * imageWidth) / imageProperties.width

    if (imageHeight > maxHeight) {
      imageHeight = maxHeight
    }

    pdf.addImage(imageData, 'PNG', margin, yStart + 6, imageWidth, imageHeight)

    return yStart + imageHeight + 16
  }

  const handleGeneratePdfReport = async () => {
    try {
      setPdfLoading(true)

      const kpiImage = await captureElement(kpiRef.current)
      const trajectoryImage = await captureElement(trajectoryRef.current)
      const radarImage = await captureElement(radarRef.current)
      const dragImage = await captureElement(dragRef.current)
      const thrustImage = await captureElement(thrustRef.current)
      const eventsImage = await captureElement(eventsRef.current)

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      const pageWidth = pdf.internal.pageSize.getWidth()
      const margin = 14

      pdf.setFillColor(13, 17, 23)
      pdf.rect(0, 0, pageWidth, 48, 'F')

      pdf.setTextColor(240, 165, 0)
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(18)
      pdf.text('Satellite Launch System', margin, 18)

      pdf.setTextColor(255, 255, 255)
      pdf.setFontSize(12)
      pdf.text('Digital Twin Mission - Mission Analysis Report', margin, 28)

      pdf.setTextColor(170, 170, 170)
      pdf.setFontSize(9)
      pdf.text(`Generated: ${new Date().toLocaleString()}`, margin, 38)

      let y = 62

      addTitle(pdf, '1. Executive Summary', y)
      y += 8

      const missionStatus = orbitAchieved ? 'SUCCESS' : 'FAILED / ANALYSIS REQUIRED'
      const orbitStatus = orbitAchieved ? 'YES' : 'NO'

      y = addParagraph(
        pdf,
        'This report presents a post-flight analysis of a simulated launch mission performed in the Digital Twin Mission environment. The purpose of the report is to summarize the mission result, evaluate the most important flight parameters and document the behavior of the simulated launch vehicle.',
        y
      )

      y = addParagraph(
        pdf,
        `Mission status: ${missionStatus}. Orbit reached: ${orbitStatus}. The vehicle reached a maximum altitude of ${maxAlt.toFixed(1)} km and a maximum velocity of ${maxVel.toFixed(0)} m/s.`,
        y
      )

      y += 3
      addTitle(pdf, '2. Key Performance Indicators', y)
      y += 8

      const kpis = [
        ['Maximum altitude', `${maxAlt.toFixed(1)} km`],
        ['Maximum velocity', `${maxVel.toFixed(0)} m/s`],
        ['Maximum Mach number', maxMach.toFixed(2)],
        ['Maximum dynamic pressure Max Q', `${maxQ.toFixed(1)} kPa`],
        ['Maximum acceleration', `${maxAccel.toFixed(2)} g`],
        ['Orbit achieved', orbitStatus],
        ['Telemetry samples', `${telemetry.length}`],
        ['Mission events', `${events.length}`],
      ]

      pdf.setFontSize(10)

      kpis.forEach(([label, value]) => {
        pdf.setFont('helvetica', 'bold')
        pdf.setTextColor(25, 25, 25)
        pdf.text(`${label}:`, margin, y)

        pdf.setFont('helvetica', 'normal')
        pdf.setTextColor(45, 45, 45)
        pdf.text(value, margin + 72, y)

        y += 6
      })

      y += 4
      addTitle(pdf, '3. Engineering Interpretation', y)
      y += 8

      if (orbitAchieved) {
        y = addParagraph(
          pdf,
          'The mission profile indicates successful orbital insertion according to the configured success criteria. The current rocket configuration can be treated as a valid baseline for additional scenario testing, mass optimization and robustness analysis.'
          ,
          y
        )
      } else {
        y = addParagraph(
          pdf,
          'The mission profile did not satisfy the orbital insertion criteria. The simulation indicates that the current configuration requires further optimization, especially in propulsion performance, mass distribution, staging strategy or pitch profile.'
          ,
          y
        )

        y = addParagraph(
          pdf,
          'The Digital Twin model allows repeated testing of modified rocket parameters before selecting the best configuration for the mission profile.'
          ,
          y
        )
      }

      y += 2
      addTitle(pdf, '4. KPI Dashboard Snapshot', y)
      y += 6
      addSectionImage(pdf, kpiImage, '', y, 45)

      pdf.addPage()

      y = 18
      addTitle(pdf, '5. Visual Mission Analysis', y)
      y += 10

      y = addSectionImage(pdf, trajectoryImage, '5.1 Flight Trajectory - Downrange vs Altitude', y, 105)

      if (y > 180) {
        pdf.addPage()
        y = 18
      }

      y = addSectionImage(pdf, radarImage, '5.2 Mission Performance Radar', y, 105)

      pdf.addPage()

      y = 18
      addTitle(pdf, '6. Aerodynamic and Propulsion Analysis', y)
      y += 10

      y = addSectionImage(pdf, dragImage, '6.1 Drag Coefficient vs Time', y, 95)

      if (y > 180) {
        pdf.addPage()
        y = 18
      }

      y = addSectionImage(pdf, thrustImage, '6.2 Thrust vs Drag', y, 95)

      pdf.addPage()

      y = 18
      addTitle(pdf, '7. Mission Event Timeline', y)
      y += 10

      y = addSectionImage(pdf, eventsImage, '7.1 Recorded Mission Events', y, 150)

      if (y > 230) {
        pdf.addPage()
        y = 18
      }

      addTitle(pdf, '8. Recommendations', y)
      y += 8

      if (orbitAchieved) {
        addParagraph(
          pdf,
          'Recommended next steps include comparing multiple mission scenarios, reducing launch mass, validating the flight profile under atmospheric anomalies and testing sensitivity to engine performance changes.',
          y
        )
      } else {
        addParagraph(
          pdf,
          'Recommended next steps include increasing second-stage performance, reducing structural mass, optimizing propellant distribution, improving the gravity turn profile and comparing the result with the AI-Optimized scenario.',
          y
        )
      }

      pdf.save('digital-twin-mission-analysis-report.pdf')
    } catch (error) {
      console.error('PDF report generation error:', error)
      alert('Nie udało się wygenerować raportu PDF.')
    } finally {
      setPdfLoading(false)
    }
  }

  return (
    <div style={{ padding: '28px 36px' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{
          fontFamily: 'var(--font-hud)',
          fontSize: '1.3rem',
          fontWeight: 900,
          color: '#f0a500',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          marginBottom: 6
        }}>
          📊 Mission Analysis
        </div>

        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.68rem',
          color: '#8b949e',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          marginBottom: 18
        }}>
          Post-Flight Data Analysis · {telemetry.length} telemetry points
        </div>

        <button
          onClick={handleGeneratePdfReport}
          disabled={pdfLoading}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: pdfLoading ? '#30363d' : '#f0a500',
            color: '#0d1117',
            border: '1px solid #f0a500',
            borderRadius: 10,
            padding: '12px 18px',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.78rem',
            fontWeight: 900,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            cursor: pdfLoading ? 'not-allowed' : 'pointer',
            boxShadow: '0 0 18px rgba(240, 165, 0, 0.25)'
          }}
        >
          {pdfLoading ? 'Generating Full Report...' : '📄 Export Full Mission Report'}
        </button>
      </div>

      <div ref={kpiRef} style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 10, marginBottom: 24 }}>
        {[
          { l: 'Max Altitude', v: `${maxAlt.toFixed(1)} km`, c: '#f0a500' },
          { l: 'Max Velocity', v: `${maxVel.toFixed(0)} m/s`, c: '#00c896' },
          { l: 'Max Mach', v: maxMach.toFixed(2), c: '#58a6ff' },
          { l: 'Max Q', v: `${maxQ.toFixed(1)} kPa`, c: '#ff8800' },
          { l: 'Max Accel', v: `${maxAccel.toFixed(2)} g`, c: '#bc8cff' },
          {
            l: 'Orbit',
            v: orbitAchieved ? '✅ YES' : '❌ NO',
            c: orbitAchieved ? '#00c896' : '#ff4444'
          },
        ].map(k => (
          <div key={k.l} style={{
            background: '#161b22',
            border: '1px solid #21262d',
            borderRadius: 10,
            padding: '12px 16px'
          }}>
            <div style={{
              fontSize: '0.6rem',
              color: '#484f58',
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              marginBottom: 6
            }}>
              {k.l}
            </div>

            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '1.1rem',
              fontWeight: 700,
              color: k.c
            }}>
              {k.v}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>
        <div ref={trajectoryRef} style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 10, padding: '16px' }}>
          <div style={{
            fontSize: '0.62rem',
            color: '#f0a500',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            marginBottom: 10
          }}>
            Flight Trajectory (Downrange × Altitude)
          </div>

          <ResponsiveContainer width="100%" height={250}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
              <XAxis
                dataKey="x"
                name="Downrange"
                stroke="#484f58"
                tick={{ fill: '#484f58', fontSize: 10 }}
                label={{ value: 'Downrange [km]', fill: '#484f58', fontSize: 10, position: 'insideBottom', offset: -4 }}
              />
              <YAxis
                dataKey="y"
                name="Altitude"
                stroke="#484f58"
                tick={{ fill: '#484f58', fontSize: 10 }}
                label={{ value: 'Alt [km]', fill: '#484f58', fontSize: 10, angle: -90, position: 'insideLeft' }}
              />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CT />} />
              <Scatter
                data={traj}
                fill="#f0a500"
                opacity={0.6}
                line={{ stroke: '#f0a500', strokeWidth: 1.5 }}
                lineJointType="monotone"
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        <div ref={radarRef} style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 10, padding: '16px' }}>
          <div style={{
            fontSize: '0.62rem',
            color: '#bc8cff',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            marginBottom: 10
          }}>
            Mission Performance Radar
          </div>

          <ResponsiveContainer width="100%" height={250}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#21262d" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: '#8b949e', fontSize: 9 }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#484f58', fontSize: 8 }} />
              <Radar name="Score" dataKey="val" stroke="#bc8cff" fill="#bc8cff" fillOpacity={0.25} strokeWidth={2} />
              <Tooltip content={<CT />} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div ref={dragRef} style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 10, padding: '16px' }}>
          <div style={{
            fontSize: '0.62rem',
            color: '#58a6ff',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            marginBottom: 10
          }}>
            Drag Coefficient vs Time (Mach-dependent)
          </div>

          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={cd}>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
              <XAxis dataKey="t" stroke="#484f58" tick={{ fill: '#484f58', fontSize: 10 }} tickFormatter={v => `${v}s`} />
              <YAxis stroke="#484f58" tick={{ fill: '#484f58', fontSize: 10 }} domain={[0.1, 0.6]} />
              <Tooltip content={<CT />} />
              <Line type="monotone" dataKey="cd" stroke="#58a6ff" strokeWidth={2} dot={false} name="Cd" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div ref={thrustRef} style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 10, padding: '16px' }}>
          <div style={{
            fontSize: '0.62rem',
            color: '#ff8800',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            marginBottom: 10
          }}>
            Thrust vs Drag [N]
          </div>

          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={cd}>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
              <XAxis dataKey="t" stroke="#484f58" tick={{ fill: '#484f58', fontSize: 10 }} tickFormatter={v => `${v}s`} />
              <YAxis stroke="#484f58" tick={{ fill: '#484f58', fontSize: 10 }} />
              <Tooltip content={<CT />} />
              <Line type="monotone" dataKey="thrust" stroke="#f0a500" strokeWidth={2} dot={false} name="Thrust(N)" />
              <Line type="monotone" dataKey="drag" stroke="#ff4444" strokeWidth={1.5} dot={false} name="Drag(N)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div ref={eventsRef} style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 10, padding: '16px' }}>
        <div style={{
          fontSize: '0.62rem',
          color: '#00c896',
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          marginBottom: 12
        }}>
          Mission Event Log
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '80px 160px 1fr', gap: 0 }}>
          {['Time', 'Event', 'Description'].map(h => (
            <div key={h} style={{
              padding: '6px 12px',
              fontSize: '0.62rem',
              color: '#484f58',
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              borderBottom: '1px solid #21262d'
            }}>
              {h}
            </div>
          ))}

          {events.map((e, i) => [
            <div key={`t${i}`} style={{
              padding: '8px 12px',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.72rem',
              color: '#8b949e',
              borderBottom: '1px solid #161b22'
            }}>
              T+{e.time.toFixed(0)}s
            </div>,
            <div key={`n${i}`} style={{
              padding: '8px 12px',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.72rem',
              color: '#f0a500',
              borderBottom: '1px solid #161b22'
            }}>
              {e.icon} {e.name}
            </div>,
            <div key={`d${i}`} style={{
              padding: '8px 12px',
              fontSize: '0.72rem',
              color: '#8b949e',
              borderBottom: '1px solid #161b22'
            }}>
              {e.desc}
            </div>
          ])}
        </div>
      </div>
    </div>
  )
}