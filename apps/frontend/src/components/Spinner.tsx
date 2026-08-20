import type { ReactElement } from 'react'

export function Spinner(): ReactElement {
  return (
    <div className="flex items-center justify-center gap-2 py-8 text-slate-400">
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-500" />
      <span>Cargando…</span>
    </div>
  )
}