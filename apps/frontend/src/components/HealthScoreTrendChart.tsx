import type { ReactElement } from 'react'
import type { HealthTrendPoint } from '../api/types'

const WIDTH = 600
const HEIGHT = 160
const PADDING = 24

export function HealthScoreTrendChart({ points }: { points: HealthTrendPoint[] }): ReactElement {
  const withScore = points.filter(
    (point): point is HealthTrendPoint & { healthScore: number } => point.healthScore !== null,
  )

  if (withScore.length < 2) {
    return (
      <p className="text-sm text-slate-500">
        Necesitas al menos 2 auditorías completadas para ver la tendencia.
      </p>
    )
  }

  const usableWidth = WIDTH - PADDING * 2
  const usableHeight = HEIGHT - PADDING * 2
  const lastIndex = withScore.length - 1

  const coordinates = withScore.map((point, index) => ({
    x: PADDING + (usableWidth * index) / lastIndex,
    y: PADDING + usableHeight * (1 - point.healthScore / 100),
    point,
  }))

  const linePoints = coordinates.map(({ x, y }) => `${x},${y}`).join(' ')
  const first = coordinates[0]
  const last = coordinates[lastIndex]

  return (
    <div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label="Tendencia de Health Score"
      >
        <line
          x1={PADDING}
          y1={HEIGHT - PADDING}
          x2={WIDTH - PADDING}
          y2={HEIGHT - PADDING}
          stroke="#e2e8f0"
          strokeWidth={1}
        />
        <polyline points={linePoints} fill="none" stroke="#4f46e5" strokeWidth={2} />
        {coordinates.map(({ x, y, point }) => (
          <circle key={point.id} cx={x} cy={y} r={3.5} fill="#4f46e5" />
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-xs text-slate-400">
        <span>{formatDate(first?.point.startedAt)}</span>
        <span>{formatDate(last?.point.startedAt)}</span>
      </div>
    </div>
  )
}

function formatDate(value: string | null | undefined): string {
  if (value === null || value === undefined) {
    return ''
  }
  return new Date(value).toLocaleDateString()
}
