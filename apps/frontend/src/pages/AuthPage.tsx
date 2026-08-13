import { useState } from 'react'
import type { FormEvent, ReactElement } from 'react'
import { useNavigate } from 'react-router-dom'
import { extractApiError, useAuth } from '../auth/AuthContext'
import codeAuditIllustration from '../assets/code-audit-illustration.svg'
import googleIcon from '../assets/google-icon.png'

export function AuthPage(): ReactElement {
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      if (mode === 'login') {
        await login(email, password)
      } else {
        await register(email, password, displayName)
        await login(email, password)
      }
      navigate('/')
    } catch (caught) {
      setError(extractApiError(caught))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen">
      {/* Left Panel - Illustration */}
      <div className="hidden lg:flex lg:w-[58%] bg-peach relative overflow-hidden flex-col items-center justify-center p-12">
        {/* Decorative circles */}
        <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-brand opacity-20" />
        <div className="absolute top-1/4 -left-10 w-40 h-40 rounded-full bg-brand-dark opacity-15" />
        <div className="absolute bottom-20 right-10 w-24 h-24 rounded-full bg-brand opacity-25" />
        <div className="absolute top-40 right-20 w-16 h-16 rounded-full bg-brand-dark opacity-30" />

        {/* Small floating dots */}
        <div className="absolute top-32 left-1/4 w-2 h-2 rounded-full bg-brand" />
        <div className="absolute bottom-40 left-1/3 w-3 h-3 rounded-full bg-brand-dark opacity-60" />
        <div className="absolute top-1/2 right-1/4 w-2 h-2 rounded-full bg-brand opacity-80" />

        {/* Main illustration */}
        <img
          src={codeAuditIllustration}
          alt="Code audit illustration"
          className="w-full max-w-lg relative z-10"
        />

        {/* Tagline */}
        <div className="mt-12 text-center relative z-10">
          <h2 className="text-brand-dark text-3xl xl:text-4xl font-extrabold tracking-tight">
            Audita tu código con IA
          </h2>
          <p className="text-brand-dark text-lg xl:text-xl font-semibold mt-3 opacity-80">
            Detecta vulnerabilidades y mejora la calidad de tu código
          </p>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center bg-white p-8 lg:p-12">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="text-brand">
              <svg width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="8" y="8" width="20" height="20" rx="4" fill="currentColor" opacity="0.3"/>
                <rect x="44" y="8" width="20" height="20" rx="4" fill="currentColor"/>
                <rect x="8" y="44" width="20" height="20" rx="4" fill="currentColor"/>
                <rect x="44" y="44" width="20" height="20" rx="4" fill="currentColor" opacity="0.3"/>
                <circle cx="36" cy="36" r="6" fill="currentColor"/>
              </svg>
            </div>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-700 tracking-tight">
              {mode === 'login' ? 'Inicia sesión' : 'Crea tu cuenta'}
            </h1>
            <p className="text-gray-500 mt-2 text-base">
              {mode === 'login'
                ? 'Accede a tu panel de auditorías'
                : 'Comienza a auditar tu código hoy'}
            </p>
          </div>

          {/* Google Button */}
          <button
            type="button"
            className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-200 rounded-md hover:bg-gray-50 transition"
          >
            <img src={googleIcon} alt="Google" className="w-6 h-6" />
            <span className="text-gray-600 font-bold text-sm">
              Continuar con Google
            </span>
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4 my-8">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-gray-400 text-sm font-semibold">
              o {mode === 'login' ? 'inicia sesión' : 'regístrate'} con email
            </span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            {mode === 'register' && (
              <div>
                <label htmlFor="displayName" className="block text-sm font-semibold text-gray-500 mb-1.5">
                  Nombre
                </label>
                <input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Tu nombre"
                  className="w-full px-4 py-3.5 border border-gray-300 rounded-md text-gray-700 placeholder:text-gray-300 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand transition"
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-500 mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
                className="w-full px-4 py-3.5 border border-gray-300 rounded-md text-gray-700 placeholder:text-gray-300 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand transition"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-500 mb-1.5">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={12}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-4 py-3.5 border border-gray-300 rounded-md text-gray-700 placeholder:text-gray-300 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand transition"
              />
              {mode === 'register' && (
                <p className="mt-1.5 text-xs text-gray-400">
                  Mínimo 12 caracteres con letras, números y un símbolo.
                </p>
              )}
            </div>

            {mode === 'login' && (
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-brand focus:ring-brand cursor-pointer accent-brand"
                  />
                  <span className="text-sm text-gray-500">Recordarme</span>
                </label>
                <button
                  type="button"
                  className="text-sm text-brand font-semibold hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            )}

            {error !== null && (
              <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-100">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-brand text-white font-extrabold text-lg rounded-md hover:bg-brand-hover transition disabled:opacity-50"
            >
              {submitting
                ? 'Procesando...'
                : mode === 'login'
                  ? 'Iniciar sesión'
                  : 'Crear cuenta'}
            </button>
          </form>

          {/* Toggle mode */}
          <p className="text-center mt-10 text-gray-500">
            {mode === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
            <button
              type="button"
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
              className="text-brand font-semibold hover:underline"
            >
              {mode === 'login' ? 'Crea una cuenta' : 'Inicia sesión'}
            </button>
          </p>
        </div>
      </div>
    </main>
  )
}
