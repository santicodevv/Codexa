import { useCallback, useEffect, useState } from 'react'
import type { FormEvent, ReactElement } from 'react'
import { Link } from 'react-router-dom'
import { api, getErrorMessage } from '../api/client'
import type { Repository } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { HealthScore } from '../components/HealthScore'
import { Spinner } from '../components/Spinner'

interface RepositoryForm {
  name: string
  provider: string
  url: string
  localPath: string
}

const EMPTY_FORM: RepositoryForm = { name: '', provider: 'local', url: '', localPath: '' }

export function DashboardPage(): ReactElement {
  const { user, logout } = useAuth()
  const [repositories, setRepositories] = useState<Repository[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<RepositoryForm>(EMPTY_FORM)
  const [creating, setCreating] = useState(false)

  const loadRepositories = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get<Repository[]>('/repositories')
      setRepositories(data)
      setError(null)
    } catch (caught) {
      setError(getErrorMessage(caught))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadRepositories()
  }, [loadRepositories])

  async function handleCreate(event: FormEvent): Promise<void> {
    event.preventDefault()
    setCreating(true)
    setError(null)
    try {
      const body: Record<string, string> = {
        name: form.name,
        provider: form.provider,
      }
      if (form.url.trim() !== '') {
        body.url = form.url.trim()
      }
      if (form.localPath.trim() !== '') {
        body.localPath = form.localPath.trim()
      }
      await api.post('/repositories', body)
      setForm(EMPTY_FORM)
      await loadRepositories()
    } catch (caught) {
      setError(getErrorMessage(caught))
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(id: string): Promise<void> {
    try {
      await api.delete(`/repositories/${id}`)
      await loadRepositories()
    } catch (caught) {
      setError(getErrorMessage(caught))
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Codexa</h1>
            <span className="rounded bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
              Dashboard
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600">{user?.email}</span>
            <button
              type="button"
              onClick={() => void logout()}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-8">
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Registrar repositorio</h2>
          <form onSubmit={handleCreate} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="repoName" className="mb-1 block text-sm font-medium text-slate-700">
                Nombre
              </label>
              <input
                id="repoName"
                type="text"
                required
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="repoProvider" className="mb-1 block text-sm font-medium text-slate-700">
                Proveedor
              </label>
              <select
                id="repoProvider"
                value={form.provider}
                onChange={(event) => setForm({ ...form, provider: event.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
              >
                <option value="local">Local</option>
                <option value="github">GitHub</option>
                <option value="gitlab">GitLab</option>
                <option value="bitbucket">Bitbucket</option>
                <option value="other">Otro</option>
              </select>
            </div>
            <div>
              <label htmlFor="repoUrl" className="mb-1 block text-sm font-medium text-slate-700">
                URL (https:// o git@)
              </label>
              <input
                id="repoUrl"
                type="text"
                value={form.url}
                onChange={(event) => setForm({ ...form, url: event.target.value })}
                placeholder="https://github.com/usuario/repo.git"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="repoPath" className="mb-1 block text-sm font-medium text-slate-700">
                Ruta local (opcional)
              </label>
              <input
                id="repoPath"
                type="text"
                value={form.localPath}
                onChange={(event) => setForm({ ...form, localPath: event.target.value })}
                placeholder="C:\repo\proyecto"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={creating}
                className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {creating ? 'Registrando…' : 'Registrar repositorio'}
              </button>
            </div>
          </form>
        </section>

        {error !== null && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <section className="mt-8">
          <h2 className="text-lg font-semibold text-slate-900">Mis repositorios</h2>
          {loading ? (
            <Spinner />
          ) : repositories.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              Aún no tienes repositorios. Registra el primero arriba.
            </p>
          ) : (
            <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {repositories.map((repository) => (
                <li key={repository.id} className="rounded-2xl bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      to={`/repositories/${repository.id}`}
                      className="font-semibold text-indigo-700 hover:underline"
                    >
                      {repository.name}
                    </Link>
                    <button
                      type="button"
                      onClick={() => void handleDelete(repository.id)}
                      className="text-sm text-red-500 hover:text-red-700"
                    >
                      Eliminar
                    </button>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{repository.provider}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <HealthScore score={repository.lastAudit?.healthScore ?? null} />
                    <span className="text-xs text-slate-400">
                      {repository.lastAudit === null
                        ? 'Sin auditorías'
                        : repository.lastAudit.status === 'completed'
                          ? `${repository.lastAudit.totalFindings} hallazgos`
                          : repository.lastAudit.status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  )
}