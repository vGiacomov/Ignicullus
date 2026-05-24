import axios from 'axios'
import type { FlightRun, Scenario } from '../types'

const api = axios.create({ baseURL: '/api' })

export const fetchScenarios = (): Promise<Scenario[]> =>
  api.get('/scenarios').then(r => r.data)

export const runSyncSimulation = (payload: unknown) =>
  api.post('/simulate/sync', payload).then(r => r.data)

export const runOptimize = (payload: unknown) =>
  api.post('/optimize', payload).then(r => r.data)

export const exportTtsFile = (payload: unknown) =>
  api.post('/tts/export', payload).then(r => r.data)

export const fetchFlights = (): Promise<FlightRun[]> =>
  api.get('/flights').then(r => r.data)

export const deleteFlight = (id: number): Promise<{ deleted: boolean }> =>
  api.delete(`/flights/${id}`).then(r => r.data)

export const generatePdfReport = async (payload: unknown) => {
  const response = await api.post('/report/pdf', payload, {
    responseType: 'blob',
  })

  const url = window.URL.createObjectURL(new Blob([response.data]))
  const link = document.createElement('a')

  link.href = url
  link.setAttribute('download', 'mission-analysis-report.pdf')

  document.body.appendChild(link)
  link.click()

  link.remove()
  window.URL.revokeObjectURL(url)
}
