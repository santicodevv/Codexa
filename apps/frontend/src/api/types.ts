export interface AuthTokens {
  accessToken: string
  expiresIn: number
  refreshToken: string
}

export interface UserDto {
  id: string
  email: string
  displayName: string | null
}

export interface LoginResponse extends AuthTokens {
  user: UserDto
}

export interface Repository {
  id: string
  name: string
  provider: string
  url: string
  createdAt: string
  lastAudit: LastAudit | null
}

export interface LastAudit {
  id: string
  status: string
  healthScore: number | null
  startedAt: string | null
  completedAt: string | null
  totalFindings: number | null
}

export interface RepositoryDetail {
  id: string
  name: string
  provider: string
  url: string
  localPath: string | null
  createdAt: string
  lastAuditAt: string | null
}

export interface AuditSummary {
  id: string
  status: string
  healthScore: number | null
  startedAt: string | null
  completedAt: string | null
}

export interface AuditHistory {
  items: AuditHistoryItem[]
  page: number
  pageSize: number
  totalCount: number
}

export interface AuditHistoryItem {
  id: string
  status: string
  healthScore: number | null
  criticalCount: number | null
  mediumCount: number | null
  lowCount: number | null
  totalFindings: number | null
  durationMs: number | null
  startedAt: string | null
  completedAt: string | null
}

export interface Finding {
  id: string
  ruleId: string
  severity: string
  message: string
  filePath: string
  lineNumber: number | null
  columnNumber: number | null
  likelihood: number | null
}

export interface AiSuggestion {
  id: string
  type: string
  title: string
  description: string
  targetFile: string | null
  targetLine: number | null
  codeBlocks: unknown
}

export interface ModuleSummary {
  id: string
  moduleName: string
  moduleScore: number
  findingCount: number
}

export interface AuditDetail {
  id: string
  repository: { name: string; url: string }
  status: string
  commitSha: string | null
  provider: string | null
  model: string | null
  healthScore: number | null
  severityCounts: { critical: number; medium: number; low: number }
  totalFindings: number | null
  estimatedDebtHours: string | null
  durationMs: number | null
  startedAt: string | null
  completedAt: string | null
  errorMessage: string | null
  findings: Finding[]
  suggestions: AiSuggestion[]
  moduleSummaries: ModuleSummary[]
}