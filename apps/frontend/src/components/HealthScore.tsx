import type { ReactElement } from 'react'

function scoreColor(score: number): string {
  if (score >= 80) return 'bg-emerald-500'
  if (score >= 60) return 'bg-amber-500'
  if (score >= 40) return 'bg-orange-500'
  return 'bg-red-500'
}

export function HealthScore({ score, size = 'md' }: { score: number | null; size?: 'md' | 'lg' }): ReactElement {
  if (score === null) {
    return <span className="text-sm text-slate-400">Sin auditar</span>
  }
  return (
    <div className="flex items-center gap-2">
      <div
        className={`rounded-lg font-bold text-white ${scoreColor(score)} ${size === 'lg' ? 'px-4 py-2 text-3xl' : 'px-2.5 py-1 text-sm'}`}
      >
        {score}
        <span className={size === 'lg' ? 'text-lg' : 'text-xs'}>/100</span>
      </div>
    </div>
  )
}