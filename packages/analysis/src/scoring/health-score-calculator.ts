import { FindingSeverity } from '@codexa/contracts'
import type { Finding } from '../interfaces/result.types'

const SEVERITY_WEIGHTS: Record<FindingSeverity, number> = {
  [FindingSeverity.Critical]: 25,
  [FindingSeverity.High]: 12,
  [FindingSeverity.Medium]: 5,
  [FindingSeverity.Low]: 2,
  [FindingSeverity.Info]: 1,
}

export interface HealthScoreResult {
  score: number
  critical: number
  high: number
  medium: number
  low: number
  info: number
  total: number
}

export function calculateHealthScore(findings: Finding[]): HealthScoreResult {
  const counts = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  }

  for (const finding of findings) {
    counts[finding.severity] += 1
  }

  const penalty = findings.reduce(
    (accumulator, finding) => accumulator + (SEVERITY_WEIGHTS[finding.severity] ?? 0),
    0,
  )
  const score = Math.max(0, Math.min(100, Math.round(100 - penalty)))

  return { score, ...counts, total: findings.length }
}
