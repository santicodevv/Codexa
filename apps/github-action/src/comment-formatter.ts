import type { CiAuditResult } from './api-client'

export interface ReviewComment {
  path: string
  line: number
  side: 'RIGHT'
  body: string
}

const MAX_HIGHLIGHTED_SUGGESTIONS = 3
const MAX_COMMENT_BODY_CHARS = 200

// Formato de docs/13-GitHub-Integration.md §4.1.
export function buildSummaryComment(audit: CiAuditResult, prNumber: number): string {
  const { critical, medium, low } = audit.severityCounts
  const debtHours =
    audit.estimatedDebtHours !== null ? `~${Math.round(audit.estimatedDebtHours)} horas` : 'N/D'
  const healthScore = audit.healthScore ?? 'N/D'

  const lines = [
    `## Codexa · Auditoría del PR #${prNumber}`,
    '',
    '| Health Score | Críticos | Medios | Bajos | Deuda estimada |',
    '| :----------: | :------: | :----: | :---: | :------------: |',
    `| **${healthScore}** | ${critical} | ${medium} | ${low} | ${debtHours} |`,
  ]

  const suggestions = audit.suggestions.slice(0, MAX_HIGHLIGHTED_SUGGESTIONS)
  if (suggestions.length > 0) {
    lines.push('', '### Sugerencias destacadas')
    for (const suggestion of suggestions) {
      const location =
        suggestion.targetFile !== undefined
          ? ` (\`${suggestion.targetFile}${suggestion.targetLine !== undefined ? `:${suggestion.targetLine}` : ''}\`)`
          : ''
      lines.push(`- ${suggestion.title}${location}`)
    }
  }

  return lines.join('\n')
}

// Formato de docs/13-GitHub-Integration.md §4.2 — solo hallazgos críticos, solo líneas del diff.
export function buildReviewComments(
  audit: CiAuditResult,
  changedLines: Map<string, Set<number>>,
): ReviewComment[] {
  const comments: ReviewComment[] = []

  for (const finding of audit.findings) {
    if (finding.severity !== 'critical' || finding.lineNumber === undefined) {
      continue
    }
    const addedLines = changedLines.get(finding.filePath)
    if (addedLines === undefined || !addedLines.has(finding.lineNumber)) {
      continue
    }

    const body = truncate(`**Codexa:** ${finding.message}`, MAX_COMMENT_BODY_CHARS)
    comments.push({ path: finding.filePath, line: finding.lineNumber, side: 'RIGHT', body })
  }

  return comments
}

function truncate(text: string, maxChars: number): string {
  return text.length > maxChars ? `${text.slice(0, maxChars - 1)}…` : text
}
