import { randomUUID } from 'node:crypto'
import type { AnalysisReport, Finding } from '@codexa/analysis'
import type { AuditReportDto, FindingDto } from '@codexa/contracts'
import { AuditStatus } from '@codexa/contracts'

export function toAuditReportDto(report: AnalysisReport): AuditReportDto {
  return {
    id: randomUUID(),
    status: AuditStatus.Completed,
    healthScore: report.healthScore,
    totalFindings: report.findings.length,
    findings: report.findings.map(toFindingDto),
    suggestions: [],
    moduleSummaries: [],
    repoSummary: report.summary,
    severityCounts: report.severityCounts,
    technicalDebtMinutes: report.technicalDebtMinutes,
    durationMs: report.durationMs,
    analyzerStatuses: report.analyzerStatuses,
  }
}

function toFindingDto(finding: Finding): FindingDto {
  return {
    id: finding.id,
    ruleId: finding.ruleId,
    severity: finding.severity,
    message: finding.message,
    filePath: finding.filePath,
    lineNumber: finding.lineNumber,
    columnNumber: finding.columnNumber,
    likelihood: finding.likelihood,
    priority: finding.priority,
  }
}
