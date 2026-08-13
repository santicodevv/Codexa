import { useCallback, useEffect, useState } from 'react'
import type { ReactElement } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, getErrorMessage } from '../api/client'
import type { AuditDetail, AuditHistory, RepositoryDetail } from '../api/types'
import { HealthScore } from '../components/HealthScore'
import { SeverityBadge } from '../components/SeverityBadge'
import { Spinner } from '../components/Spinner'

export function RepositoryDetailPage(): ReactElement {
  const { repositoryId } = useParams<{ repositoryId: string }>()
  const [repository, setRepository] = useState<RepositoryDetail | null>(null)
  const [audit, setAudit] = useState<AuditDetail | null>(null)
  const [history, setHistory] = useState<AuditHistory | null>(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (repositoryId === undefined) {
      return
    }
    setLoading(true)
    setError(null)
    try {
      const [repositoryResponse, historyResponse] = await Promise.all([
        api.get<RepositoryDetail>(`/repositories/${repositoryId}`),
        api.get<AuditHistory>(`/repositories/${repositoryId}/audits?page=1&pageSize=10`),
      ])
      setRepository(repositoryResponse.data)
      setHistory(historyResponse.data)
      const latest = historyResponse.data.items[0]
      if (latest !== undefined && latest.status === 'completed') {
        const auditResponse = await api.get<AuditDetail>(
          `/repositories/${repositoryId}/audits/${latest.id}`,
        )
        setAudit(auditResponse.data)
      } else {
        setAudit(null)
      }
    } catch (caught) {
      setError(getErrorMessage(caught))
    } finally {
      setLoading(false)
    }
  }, [repositoryId])

  useEffect(() => {
    void loadData()
  }, [loadData])

  async function runAudit(): Promise<void> {
    if (repositoryId === undefined) {
      return
    }
    setRunning(true)
    setError(null)
    try {
      const { data } = await api.post<{ id: string; status: string }>(
        `/repositories/${repositoryId}/audits`,
        {},
      )
      if (data.status === 'completed') {
        await loadData()
      } else {
        setError('La auditoría no pudo completarse. Revisa la ruta del repositorio.')
        await loadData()
      }
    } catch (caught) {
      setError(getErrorMessage(caught))
    } finally {
      setRunning(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-5xl px-6 py-8">
          <Spinner />
        </div>
      </main>
    )
  }

  if (repository === null) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-5xl px-6 py-8">
          <p className="text-sm text-red-700">{error ?? 'Repositorio no encontrado'}</p>
          <Link to="/" className="mt-2 inline-block text-sm text-indigo-600 hover:underline">
            Volver al dashboard
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-sm text-indigo-600 hover:underline">
              ← Dashboard
            </Link>
            <h1 className="text-xl font-bold text-slate-900">{repository.name}</h1>
            <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
              {repository.provider}
            </span>
          </div>
          <button
            type="button"
            onClick={() => void runAudit()}
            disabled={running}
            className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {running ? 'Auditando…' : 'Ejecutar auditoría'}
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-8">
        {error !== null && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        {audit === null ? (
          <section className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <p className="text-slate-500">Sin auditorías completadas todavía.</p>
            <button
              type="button"
              onClick={() => void runAudit()}
              className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700"
            >
              Auditar ahora
            </button>
          </section>
        ) : (
          <>
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase text-slate-400">Health Score</p>
                <div className="mt-2">
                  <HealthScore score={audit.healthScore} size="lg" />
                </div>
              </div>
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase text-slate-400">Hallazgos</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{audit.totalFindings}</p>
                <p className="mt-1 text-xs text-slate-400">{audit.commitSha ?? 'sin commit'}</p>
              </div>
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase text-slate-400">Deuda estimada</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {audit.estimatedDebtHours === null
                    ? '—'
                    : `${Number(audit.estimatedDebtHours).toFixed(1)} h`}
                </p>
                <p className="mt-1 text-xs text-slate-400">{audit.durationMs} ms</p>
              </div>
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase text-slate-400">Por severidad</p>
                <div className="mt-2 flex gap-2">
                  <span className="rounded bg-red-100 px-2 py-1 text-sm font-semibold text-red-700">
                    {audit.severityCounts.critical} críticos
                  </span>
                  <span className="rounded bg-amber-100 px-2 py-1 text-sm font-semibold text-amber-700">
                    {audit.severityCounts.medium} medios
                  </span>
                  <span className="rounded bg-sky-100 px-2 py-1 text-sm font-semibold text-sky-700">
                    {audit.severityCounts.low} bajos
                  </span>
                </div>
              </div>
            </section>

            {audit.suggestions.length > 0 && (
              <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">
                  Sugerencias de IA ({audit.suggestions.length})
                </h2>
                <ul className="mt-4 flex flex-col gap-3">
                  {audit.suggestions.map((suggestion) => (
                    <li key={suggestion.id} className="rounded-lg border border-slate-200 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-slate-800">{suggestion.title}</p>
                        <span className="rounded bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                          {suggestion.type}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">{suggestion.description}</p>
                      {suggestion.targetFile !== null && (
                        <p className="mt-2 font-mono text-xs text-slate-400">
                          {suggestion.targetFile}
                          {suggestion.targetLine !== null ? `:${suggestion.targetLine}` : ''}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Resumen por módulo</h2>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {audit.moduleSummaries.map((module) => (
                  <div key={module.id} className="rounded-lg border border-slate-200 p-4">
                    <p className="font-mono text-sm font-semibold text-slate-800">
                      {module.moduleName}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{module.findingCount} hallazgos</p>
                    <div className="mt-2 h-2 rounded bg-slate-100">
                      <div
                        className={`h-2 rounded ${module.moduleScore >= 60 ? 'bg-emerald-500' : module.moduleScore >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${module.moduleScore}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Hallazgos</h2>
              <ul className="mt-4 flex flex-col divide-y divide-slate-100">
                {audit.findings.map((finding) => (
                  <li key={finding.id} className="flex items-start gap-3 py-3">
                    <SeverityBadge severity={finding.severity} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-slate-800">{finding.message}</p>
                      <p className="mt-0.5 font-mono text-xs text-slate-400">
                        {finding.filePath}
                        {finding.lineNumber !== null ? `:${finding.lineNumber}` : ''} ·{' '}
                        {finding.ruleId}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}

        <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Historial de auditorías</h2>
          {history === null || history.items.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">Sin auditorías registradas.</p>
          ) : (
            <table className="mt-4 w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase text-slate-400">
                  <th className="pb-2">Fecha</th>
                  <th className="pb-2">Estado</th>
                  <th className="pb-2">Score</th>
                  <th className="pb-2">Hallazgos</th>
                  <th className="pb-2">Duración</th>
                </tr>
              </thead>
              <tbody>
                {history.items.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100">
                    <td className="py-2 text-slate-600">
                      {item.startedAt === null ? '—' : new Date(item.startedAt).toLocaleString()}
                    </td>
                    <td className="py-2">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-semibold ${
                          item.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-700'
                            : item.status === 'failed'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="py-2 font-semibold text-slate-800">
                      {item.healthScore ?? '—'}
                    </td>
                    <td className="py-2 text-slate-600">{item.totalFindings ?? '—'}</td>
                    <td className="py-2 text-slate-600">
                      {item.durationMs === null ? '—' : `${item.durationMs} ms`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </main>
  )
}