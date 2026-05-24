const { spawn } = require('node:child_process')
const path = require('node:path')

const frontendDir = path.resolve(__dirname, '..')
const backendDir = path.resolve(frontendDir, '..', 'backend')
const pythonCmd = process.env.PYTHON || 'python'

const processes = [
  spawn(`${pythonCmd} -m uvicorn main:app --reload --host 0.0.0.0 --port 8000`, {
    cwd: backendDir,
    stdio: 'inherit',
    shell: true,
  }),
  spawn('npm run dev:frontend -- --host 0.0.0.0 --port 5173', {
    cwd: frontendDir,
    stdio: 'inherit',
    shell: true,
  }),
]

let shuttingDown = false

function shutdown(code = 0) {
  if (shuttingDown) return
  shuttingDown = true

  for (const child of processes) {
    if (!child.killed) {
      child.kill('SIGTERM')
    }
  }

  process.exit(code)
}

for (const child of processes) {
  child.on('exit', (code) => {
    if (!shuttingDown && code !== 0) {
      shutdown(code || 1)
    }
  })
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))
