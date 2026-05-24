import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useMissionStore } from './store/missionStore'
import { fetchScenarios } from './services/apiService'
import Sidebar from './components/Sidebar'
import HomePage from './pages/HomePage'
import PreLaunchPage from './pages/PreLaunchPage'
import MissionControlPage from './pages/MissionControlPage'
import AnalysisPage from './pages/AnalysisPage'
import OptimizerPage from './pages/OptimizerPage'
import FlightHistoryPage from './pages/FlightHistoryPage'
import TtsExportPage from './pages/TtsExportPage'

export default function App() {
  const setScenarios = useMissionStore(s => s.setScenarios)
  useEffect(() => {
    fetchScenarios().then(setScenarios).catch(console.error)
  }, [])

  return (
    <BrowserRouter>
      <div style={{ display:'flex', minHeight:'100vh' }}>
        <Sidebar />
        <main style={{ flex:1, marginLeft:240, minHeight:'100vh' }}>
          <Routes>
            <Route path="/"          element={<HomePage />} />
            <Route path="/prelaunch" element={<PreLaunchPage />} />
            <Route path="/mission"   element={<MissionControlPage />} />
            <Route path="/analysis"  element={<AnalysisPage />} />
            <Route path="/flights"   element={<FlightHistoryPage />} />
            <Route path="/optimizer" element={<OptimizerPage />} />
            <Route path="/tts-export" element={<TtsExportPage />} />
            <Route path="*"          element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
