import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import type { ReactElement, ReactNode } from 'react'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { AuthPage } from './pages/AuthPage'
import { DashboardPage } from './pages/DashboardPage'
import { RepositoryDetailPage } from './pages/RepositoryDetailPage'
import { Spinner } from './components/Spinner'

function ProtectedRoute({ children }: { children: ReactNode }): ReactElement {
  const { user, initializing } = useAuth()
  if (initializing) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <Spinner />
      </main>
    )
  }
  if (user === null) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

export function App(): ReactElement {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<AuthPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/repositories/:repositoryId"
            element={
              <ProtectedRoute>
                <RepositoryDetailPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}