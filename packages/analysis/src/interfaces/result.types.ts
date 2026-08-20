import type { AiSuggestionDto, FindingSeverity, LanguageId, SeverityCountsDto } from '@codexa/contracts'

export interface Finding {
  id: string
  ruleId: string
  severity: FindingSeverity
  message: string
  filePath: string
  lineNumber?: number
  columnNumber?: number
  likelihood: number
  priority?: number
  metadata?: Record<string, unknown>
}

export interface RepoSummary {
  name: string
  language: LanguageId
  fileCount: number
  dependencyCount: number
  commitSha?: string
  analyzedAt: string
}

export interface AnalyzerRunStatus {
  analyzer: string
  status: 'passed' | 'failed' | 'error'
  findingCount: number
  durationMs: number
}

export interface AnalysisReport {
  summary: RepoSummary
  findings: Finding[]
  severityCounts: SeverityCountsDto
  healthScore: number
  technicalDebtMinutes: number
  durationMs: number
  analyzerStatuses: AnalyzerRunStatus[]
  suggestions?: AiSuggestionDto[]
}
