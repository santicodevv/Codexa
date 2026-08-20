import type { SeverityCountsDto } from '@codexa/contracts'
import { FindingSeverity } from '@codexa/contracts'
import type { Finding } from '../interfaces/result.types'

const SEVERITY_WEIGHTS: Record<FindingSeverity, number> = {
  [FindingSeverity.Critical]: 25,
  [FindingSeverity.High]: 12,
  [FindingSeverity.Medium]: 5,
  [FindingSeverity.Low]: 2,
  [FindingSeverity.Info]: 1,
}

const TECHNICAL_DEBT_MINUTES: Record<FindingSeverity, number> = {
  [FindingSeverity.Critical]: 480,
  [FindingSeverity.High]: 180,
  [FindingSeverity.Medium]: 60,
  [FindingSeverity.Low]: 20,
  [FindingSeverity.Info]: 5,
}

export interface HealthScoreResult {
  score: number
  critical: number
  high: number
  medium: number
  low: number
  info: number
  total: number
  bySeverity: Record<FindingSeverity, number>
}

function countBySeverity(findings: Finding[]): Record<FindingSeverity, number> {
  const counts: Record<FindingSeverity, number> = {
    [FindingSeverity.Critical]: 0,
    [FindingSeverity.High]: 0,
    [FindingSeverity.Medium]: 0,
    [FindingSeverity.Low]: 0,
    [FindingSeverity.Info]: 0,
  }

  for (const finding of findings) {
    counts[finding.severity] += 1
  }

  return counts
}

export function calculateSeverityCounts(findings: Finding[]): SeverityCountsDto {
  return countBySeverity(findings)
}

export function estimateTechnicalDebtMinutes(findings: Finding[]): number {
  return findings.reduce(
    (accumulator, finding) => accumulator + (TECHNICAL_DEBT_MINUTES[finding.severity] ?? 0),
    0,
  )
}

export function calculateHealthScore(findings: Finding[]): HealthScoreResult {
  const bySeverity = countBySeverity(findings)

  const penalty = findings.reduce(
    (accumulator, finding) => accumulator + (SEVERITY_WEIGHTS[finding.severity] ?? 0),
    0,
  )
  const score = Math.max(0, Math.min(100, Math.round(100 - penalty)))

  return {
    score,
    critical: bySeverity[FindingSeverity.Critical],
    high: bySeverity[FindingSeverity.High],
    medium: bySeverity[FindingSeverity.Medium],
    low: bySeverity[FindingSeverity.Low],
    info: bySeverity[FindingSeverity.Info],
    total: findings.length,
    bySeverity,
  }
}
