import type { AuditStatus, FindingSeverity, SuggestionType } from './enums'

export interface FindingDto {
  id: string
  ruleId: string
  severity: FindingSeverity
  message: string
  filePath: string
  lineNumber?: number
  columnNumber?: number
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

export interface AuditReportDto {
  id: string
  status: AuditStatus
  healthScore?: number
  totalFindings: number
  findings: FindingDto[]
  suggestions: AiSuggestionDto[]
  moduleSummaries: ModuleSummaryDto[]
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
