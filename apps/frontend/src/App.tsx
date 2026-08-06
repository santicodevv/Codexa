import type { ReactElement } from 'react'
import type { HealthCheckDto } from '@codexa/contracts'

const SERVICE_NAME = 'codexa-api'
const VERSION = '0.1.0'

export function App(): ReactElement {
  const health: HealthCheckDto = {
    status: 'ok',
    service: SERVICE_NAME,
    version: VERSION,
    timestamp: new Date().toISOString(),
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50">
      <h1 className="text-4xl font-bold text-slate-900">Codexa</h1>
      <p className="text-slate-600">Auditoría de código con IA</p>
      <p className="text-sm text-slate-400">
        {health.service} · {health.version}
      </p>
    </main>
  )
}
