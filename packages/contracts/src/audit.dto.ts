import type { AuditStatus, FindingSeverity, LanguageId, SuggestionType } from './enums'

export interface FindingDto {
  id: string
  ruleId: string
  severity: FindingSeverity
  message: string
  filePath: string
  lineNumber?: number
  columnNumber?: number
  likelihood?: number
  priority?: number
}

export interface RepoSummaryDto {
  name: string
  language: LanguageId
  fileCount: number
  dependencyCount: number
  commitSha?: string
  analyzedAt: string
}

export interface AiSuggestionDto {
  id: string
  type: SuggestionType
  title: string
  description: string
  targetFile?: string
  targetLine?: number
  codeBlocks: string[]
}

export interface ModuleSummaryDto {
  moduleName: string
  moduleScore: number
  findingCount: number
}

export interface SeverityCountsDto {
  critical: number
  high: number
  medium: number
  low: number
  info: number
}

export interface AnalyzerRunStatusDto {
  analyzer: string
  status: 'passed' | 'failed' | 'error'
  findingCount: number
  durationMs: number
}

export interface AuditReportDto {
  id: string
  status: AuditStatus
  healthScore?: number
  totalFindings: number
  findings: FindingDto[]
  suggestions: AiSuggestionDto[]
  moduleSummaries: ModuleSummaryDto[]
  repoSummary?: RepoSummaryDto
  severityCounts?: SeverityCountsDto
  technicalDebtMinutes?: number
  durationMs?: number
  analyzerStatuses?: AnalyzerRunStatusDto[]
  startedAt?: string
  completedAt?: string
}

export interface Paginated<T> {
  items: T[]
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
  hasNext: boolean
}

export interface HealthCheckDto {
  status: 'ok'
  service: string
  version: string
  timestamp: string
}
