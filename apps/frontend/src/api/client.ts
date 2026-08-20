import axios from 'axios'
import type { AxiosError } from 'axios'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
})

let accessToken: string | null = null
let refreshToken: string | null = null
let onSessionExpired: (() => void) | null = null
let refreshPromise: Promise<boolean> | null = null

export function setTokens(access: string | null, refresh: string | null): void {
  accessToken = access
  refreshToken = refresh
}

export function setSessionExpiredHandler(handler: () => void): void {
  onSessionExpired = handler
}

api.interceptors.request.use((config) => {
  if (accessToken !== null) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as {
      url?: string
      headers: Record<string, string>
      _retried?: boolean
    } & typeof error.config

    const isAuthCall = original.url?.includes('/auth/') ?? false
    if (error.response?.status === 401 && !isAuthCall && original !== undefined && !original._retried) {
      original._retried = true
      const refreshed = await tryRefresh()
      if (refreshed) {
        original.headers.Authorization = `Bearer ${accessToken}`
        return api(original)
      }
      onSessionExpired?.()
    }
    return Promise.reject(error)
  },
)

async function tryRefresh(): Promise<boolean> {
  if (refreshToken === null) {
    return false
  }
  if (refreshPromise === null) {
    refreshPromise = api
      .post('/auth/refresh', { refreshToken })
      .then(({ data }: { data: { accessToken: string; refreshToken: string } }) => {
        setTokens(data.accessToken, data.refreshToken)
        return true
      })
      .catch(() => {
        setTokens(null, null)
        return false
      })
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { detail?: string; title?: string } | undefined
    return data?.detail ?? data?.title ?? 'Error inesperado'
  }
  return 'Error inesperado'
}