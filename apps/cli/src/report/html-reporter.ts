import type { AnalysisReport, AnalyzerRunStatus, Finding } from '@codexa/analysis'
import { FindingSeverity } from '@codexa/contracts'

const SEVERITY_ORDER: FindingSeverity[] = [
  FindingSeverity.Critical,
  FindingSeverity.High,
  FindingSeverity.Medium,
  FindingSeverity.Low,
  FindingSeverity.Info,
]

const SEVERITY_COLORS: Record<FindingSeverity, string> = {
  [FindingSeverity.Critical]: '#ef4444',
  [FindingSeverity.High]: '#f97316',
  [FindingSeverity.Medium]: '#eab308',
  [FindingSeverity.Low]: '#38bdf8',
  [FindingSeverity.Info]: '#94a3b8',
}

export function renderHtmlReport(report: AnalysisReport): string {
  const summaryCards = buildSummaryCards(report)
  const findingsSections = SEVERITY_ORDER.map((severity) =>
    renderSeveritySection(severity, report.findings),
  )
    .filter((section) => section !== null)
    .join('\n')
  const analyzersSection = renderAnalyzersSection(report.analyzerStatuses)
  const generatedAt = escapeHtml(report.summary.analyzedAt)

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Informe de auditoría — ${escapeHtml(report.summary.name)}</title>
<style>
  :root {
    --bg: #0f172a;
    --surface: #1e293b;
    --surface-2: #273449;
    --text: #e2e8f0;
    --text-muted: #94a3b8;
    --border: #334155;
    --critical: #ef4444;
    --high: #f97316;
    --medium: #eab308;
    --low: #38bdf8;
    --info: #94a3b8;
    --ok: #22c55e;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 40px 24px;
    background: var(--bg);
    color: var(--text);
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    line-height: 1.5;
  }
  .container { max-width: 920px; margin: 0 auto; }
  header { border-bottom: 1px solid var(--border); padding-bottom: 16px; margin-bottom: 24px; }
  h1 { font-size: 24px; margin: 0 0 4px; }
  header .meta { color: var(--text-muted); font-size: 13px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 32px; }
  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 14px 16px;
  }
  .card .label { color: var(--text-muted); font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; }
  .card .value { font-size: 28px; font-weight: 700; margin-top: 4px; }
  .card .value.small { font-size: 22px; }
  .health-good { color: var(--ok); }
  .health-warn { color: var(--medium); }
  .health-bad { color: var(--critical); }
  section { margin-bottom: 32px; }
  h2 { font-size: 18px; margin: 0 0 12px; padding-bottom: 8px; border-bottom: 1px solid var(--border); }
  .finding {
    background: var(--surface);
    border: 1px solid var(--border);
    border-left: 4px solid var(--border);
    border-radius: 8px;
    padding: 12px 14px;
    margin-bottom: 10px;
  }
  .finding[data-severity="critical"] { border-left-color: var(--critical); }
  .finding[data-severity="high"] { border-left-color: var(--high); }
  .finding[data-severity="medium"] { border-left-color: var(--medium); }
  .finding[data-severity="low"] { border-left-color: var(--low); }
  .finding[data-severity="info"] { border-left-color: var(--info); }
  .finding .head { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
  .badge {
    display: inline-block;
    padding: 2px 10px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .badge.severity-critical { background: rgba(239, 68, 68, 0.16); color: var(--critical); }
  .badge.severity-high { background: rgba(249, 115, 22, 0.16); color: var(--high); }
  .badge.severity-medium { background: rgba(234, 179, 8, 0.16); color: var(--medium); }
  .badge.severity-low { background: rgba(56, 189, 248, 0.16); color: var(--low); }
  .badge.severity-info { background: rgba(148, 163, 184, 0.16); color: var(--info); }
  .rule-id { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; color: var(--text-muted); }
  .location { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; color: var(--low); }
  .finding .message { margin: 0; font-size: 14px; }
  .finding .meta { margin-top: 6px; font-size: 12px; color: var(--text-muted); }
  table { width: 100%; border-collapse: collapse; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
  th, td { text-align: left; padding: 10px 14px; font-size: 13px; border-bottom: 1px solid var(--border); }
  th { background: var(--surface-2); color: var(--text-muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
  tr:last-child td { border-bottom: none; }
  .status { font-weight: 600; }
  .status-passed { color: var(--ok); }
  .status-failed { color: var(--critical); }
  .status-error { color: var(--high); }
  footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid var(--border); color: var(--text-muted); font-size: 12px; }
</style>
</head>
<body>
<div class="container">
  <header>
    <h1>Informe de auditoría — ${escapeHtml(report.summary.name)}</h1>
    <div class="meta">Generado: ${generatedAt}</div>
  </header>
  <div class="grid">
    ${summaryCards}
  </div>
  ${findingsSections}
  ${analyzersSection}
  <footer>Informe generado por Codexa CLI.</footer>
</div>
</body>
</html>
`
}

function buildSummaryCards(report: AnalysisReport): string {
  const healthClass = healthScoreClass(report.healthScore)
  const severityCounts = report.severityCounts
  return [
    renderCard('Health Score', String(report.healthScore), healthClass),
    renderCard('Hallazgos', String(report.findings.length)),
    renderCard('Deuda técnica', `${report.technicalDebtMinutes} min`, 'small'),
    renderCard('Críticos', String(severityCounts.critical)),
    renderCard('Altos', String(severityCounts.high)),
    renderCard('Medios', String(severityCounts.medium)),
    renderCard('Bajos', String(severityCounts.low)),
    renderCard('Informativos', String(severityCounts.info)),
  ].join('\n    ')
}

function renderCard(label: string, value: string, extraClass = ''): string {
  const valueClass = extraClass.length > 0 ? `value ${extraClass}` : 'value'
  return `<div class="card"><div class="label">${escapeHtml(label)}</div><div class="${valueClass}">${escapeHtml(value)}</div></div>`
}

function renderSeveritySection(severity: FindingSeverity, findings: Finding[]): string | null {
  const group = findings.filter((finding) => finding.severity === severity)
  if (group.length === 0) {
    return null
  }
  const label = formatSeverityLabel(severity)
  const color = SEVERITY_COLORS[severity]
  const items = group.map(renderFinding).join('\n')
  return `<section>
  <h2 style="color: ${color}">${escapeHtml(label)} (${group.length})</h2>
  ${items}
</section>`
}

function renderFinding(finding: Finding): string {
  const severityClass = `severity-${finding.severity}`
  const ruleId = escapeHtml(finding.ruleId)
  const location = formatFindingLocation(finding)
  const message = escapeHtml(finding.message)
  const metadata = renderFindingMetadata(finding)
  return `<div class="finding" data-severity="${finding.severity}">
  <div class="head">
    <span class="badge ${severityClass}">${escapeHtml(formatSeverityLabel(finding.severity))}</span>
    <span class="rule-id">${ruleId}</span>
    <span class="location">${location}</span>
  </div>
  <p class="message">${message}</p>
  ${metadata}
</div>`
}

function renderFindingMetadata(finding: Finding): string {
  const parts: string[] = []
  if (finding.likelihood !== undefined) {
    parts.push(`probabilidad: ${finding.likelihood}`)
  }
  if (finding.priority !== undefined) {
    parts.push(`prioridad: ${finding.priority}`)
  }
  if (parts.length === 0) {
    return ''
  }
  return `<div class="meta">${escapeHtml(parts.join(' · '))}</div>`
}

function renderAnalyzersSection(statuses: AnalyzerRunStatus[]): string {
  if (statuses.length === 0) {
    return ''
  }
  const rows = statuses
    .map(
      (status) => `<tr>
    <td>${escapeHtml(status.analyzer)}</td>
    <td class="status status-${status.status}">${escapeHtml(status.status)}</td>
    <td>${status.findingCount}</td>
    <td>${status.durationMs} ms</td>
  </tr>`,
    )
    .join('\n    ')
  return `<section>
  <h2>Analizadores</h2>
  <table>
    <thead>
      <tr><th>Analizador</th><th>Estado</th><th>Hallazgos</th><th>Duración</th></tr>
    </thead>
    <tbody>
    ${rows}
    </tbody>
  </table>
</section>`
}

function formatSeverityLabel(severity: FindingSeverity): string {
  return severity.charAt(0).toUpperCase() + severity.slice(1)
}

function formatFindingLocation(finding: Finding): string {
  if (finding.lineNumber !== undefined) {
    return `${escapeHtml(finding.filePath)}:${finding.lineNumber}`
  }
  return escapeHtml(finding.filePath)
}

function healthScoreClass(score: number): string {
  if (score >= 80) {
    return 'health-good'
  }
  if (score >= 60) {
    return 'health-warn'
  }
  return 'health-bad'
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
