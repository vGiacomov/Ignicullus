import axios from 'axios'
import type { Scenario } from '../types'

const api = axios.create({ baseURL: '/api' })

export const fetchScenarios = (): Promise<Scenario[]> =>
  api.get('/scenarios').then(r => r.data)

export const runSyncSimulation = (payload: unknown) =>
  api.post('/simulate/sync', payload).then(r => r.data)

export const runOptimize = (payload: unknown) =>
  api.post('/optimize', payload).then(r => r.data)
