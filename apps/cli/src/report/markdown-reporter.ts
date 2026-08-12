import type { AnalysisReport, Finding } from '@codexa/analysis'
import type { AiSuggestionDto } from '@codexa/contracts'
import { FindingSeverity } from '@codexa/contracts'

const SEVERITY_ORDER: FindingSeverity[] = [
  FindingSeverity.Critical,
  FindingSeverity.High,
  FindingSeverity.Medium,
  FindingSeverity.Low,
  FindingSeverity.Info,
]

export function renderMarkdownReport(report: AnalysisReport): string {
  const lines: string[] = [
    `# Informe de auditoría — ${report.summary.name}`,
    '',
    `Generado: ${report.summary.analyzedAt}`,
    '',
    '## Resumen',
    '',
    '| Métrica | Valor |',
    '| --- | --- |',
    `| Health Score | ${report.healthScore} |`,
    `| Total de hallazgos | ${report.findings.length} |`,
    `| Deuda técnica (min) | ${report.technicalDebtMinutes} |`,
    `| Críticos | ${report.severityCounts.critical} |`,
    `| Altos | ${report.severityCounts.high} |`,
    `| Medios | ${report.severityCounts.medium} |`,
    `| Bajos | ${report.severityCounts.low} |`,
    `| Informativos | ${report.severityCounts.info} |`,
    '',
    '## Hallazgos',
  ]

  for (const severity of SEVERITY_ORDER) {
    const group = report.findings.filter((finding) => finding.severity === severity)
    if (group.length === 0) {
      continue
    }
    lines.push('', `### ${formatSeverityLabel(severity)}`)
    for (const finding of group) {
      lines.push(formatFindingLine(finding))
    }
  }

  if (report.suggestions !== undefined && report.suggestions.length > 0) {
    lines.push('', '## Sugerencias de IA')
    for (const suggestion of report.suggestions) {
      lines.push(...formatSuggestion(suggestion))
    }
  }

  lines.push('', '---', '*Informe generado por Codexa CLI.*')
  return lines.join('\n')
}

function formatSuggestion(suggestion: AiSuggestionDto): string[] {
  const location = suggestion.targetFile !== undefined
    ? `${suggestion.targetFile}${suggestion.targetLine !== undefined ? `:${suggestion.targetLine}` : ''}`
    : 'ubicación no especificada'
  const lines: string[] = [
    '',
    `### [${suggestion.type}] ${suggestion.title} — ${location}`,
    '',
    suggestion.description,
  ]
  for (const block of suggestion.codeBlocks) {
    lines.push('', '```', block, '```')
  }
  return lines
}

function formatSeverityLabel(severity: FindingSeverity): string {
  return severity.charAt(0).toUpperCase() + severity.slice(1)
}

function formatFindingLine(finding: Finding): string {
  if (finding.lineNumber !== undefined) {
    return `- **${finding.ruleId}** ${finding.filePath}:${finding.lineNumber} — ${finding.message}`
  }
  return `- **${finding.ruleId}** ${finding.filePath} — ${finding.message}`
}
