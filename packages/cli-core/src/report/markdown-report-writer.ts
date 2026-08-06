import type { AuditReportDto } from '@codexa/contracts'

export function renderMarkdownReport(report: AuditReportDto): string {
  const lines: string[] = [
    `# Codexa Audit — \`${report.id}\``,
    '',
    `- Estado: ${report.status}`,
    `- Hallazgos: ${report.totalFindings}`,
  ]

  if (report.healthScore !== undefined) {
    lines.push(`- Health score: ${report.healthScore}`)
  }

  if (report.findings.length > 0) {
    lines.push('', '## Hallazgos')
    for (const finding of report.findings) {
      lines.push(
        `- \`${finding.ruleId}\` · **${finding.severity}** · ${finding.message} (${finding.filePath})`,
      )
    }
  }

  lines.push('', '---', '*Generado por Codexa*')
  return lines.join('\n')
}
