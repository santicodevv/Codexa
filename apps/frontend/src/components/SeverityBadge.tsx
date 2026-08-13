import type { ReactElement } from 'react'

const SEVERITY_STYLES: Record<string, string> = {
  critical: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-sky-100 text-sky-700',
  info: 'bg-slate-100 text-slate-600',
}

export function SeverityBadge({ severity }: { severity: string }): ReactElement {
  const style = SEVERITY_STYLES[severity] ?? SEVERITY_STYLES.info
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-semibold uppercase ${style}`}>
      {severity}
    </span>
  )
}