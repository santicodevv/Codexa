import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactElement, ReactNode } from 'react'
import { api, setSessionExpiredHandler, setTokens, getErrorMessage } from '../api/client'
import type { LoginResponse, UserDto } from '../api/types'

const STORAGE_KEY = 'codexa.session'

interface Session {
  accessToken: string
  refreshToken: string
}

interface AuthContextValue {
  user: UserDto | null
  initializing: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, displayName: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw === null ? null : (JSON.parse(raw) as Session)
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }): ReactElement {
  const [user, setUser] = useState<UserDto | null>(null)
  const [initializing, setInitializing] = useState(true)

  useEffect(() => {
    const session = loadSession()
    if (session === null) {
      setInitializing(false)
      return
    }
    setTokens(session.accessToken, session.refreshToken)
    void api
      .get<UserDto>('/auth/me')
      .then(({ data }) => setUser(data))
      .catch(() => {
        setTokens(null, null)
        localStorage.removeItem(STORAGE_KEY)
      })
      .finally(() => setInitializing(false))
  }, [])

  useEffect(() => {
    setSessionExpiredHandler(() => {
      setUser(null)
      setTokens(null, null)
      localStorage.removeItem(STORAGE_KEY)
    })
  }, [])

  const persistSession = (tokens: { accessToken: string; refreshToken: string }): void => {
    setTokens(tokens.accessToken, tokens.refreshToken)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens))
  }

  const login = useCallback(async (email: string, password: string): Promise<void> => {
    const { data } = await api.post<LoginResponse>('/auth/login', { email, password })
    persistSession(data)
    setUser(data.user)
  }, [])

  const register = useCallback(
    async (email: string, password: string, displayName: string): Promise<void> => {
      await api.post('/auth/register', { email, password, displayName })
    },
    [],
  )

  const logout = useCallback(async (): Promise<void> => {
    const session = loadSession()
    if (session !== null) {
      try {
        await api.post('/auth/logout', { refreshToken: session.refreshToken })
      } catch {
        // El logout local siempre procede aunque falle la revocación
      }
    }
    setUser(null)
    setTokens(null, null)
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      initializing,
      login,
      register,
      logout,
    }),
    [user, initializing, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (context === null) {
    throw new Error('useAuth debe usarse dentro de AuthProvider')
  }
  return context
}

export function extractApiError(error: unknown): string {
  return getErrorMessage(error)
}