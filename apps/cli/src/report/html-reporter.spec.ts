import type { AnalysisReport, Finding } from '@codexa/analysis'
import { FindingSeverity, LanguageId } from '@codexa/contracts'
import { renderHtmlReport } from './html-reporter'

function buildReport(): AnalysisReport {
  const findings: Finding[] = [
    {
      id: 'f1',
      ruleId: 'dead-code',
      severity: FindingSeverity.Critical,
      message: 'El símbolo <script>alert("x")</script>',
      filePath: 'src/a.ts',
      lineNumber: 5,
      likelihood: 0.9,
    },
    {
      id: 'f2',
      ruleId: 'complexity',
      severity: FindingSeverity.Medium,
      message: 'La función es demasiado compleja.',
      filePath: 'src/b.ts',
      lineNumber: 12,
      likelihood: 0.5,
    },
    {
      id: 'f3',
      ruleId: 'npm-audit',
      severity: FindingSeverity.Low,
      message: 'Vulnerabilidad...',
      filePath: 'package-lock.json',
      likelihood: 0.3,
    },
    {
      id: 'f4',
      ruleId: 'bad-naming',
      severity: FindingSeverity.Low,
      message: 'Variable con nombre poco claro.',
      filePath: 'src/c.ts',
      lineNumber: 3,
      likelihood: 0.2,
    },
  ]

  return {
    summary: {
      name: 'demo',
      language: LanguageId.Typescript,
      fileCount: 2,
      dependencyCount: 1,
      analyzedAt: '2026-08-06T00:00:00.000Z',
    },
    findings,
    severityCounts: { critical: 1, high: 0, medium: 1, low: 2, info: 0 },
    healthScore: 80,
    technicalDebtMinutes: 90,
    durationMs: 123,
    analyzerStatuses: [
      { analyzer: 'dead-code', status: 'passed', findingCount: 1, durationMs: 10 },
      { analyzer: 'npm-audit', status: 'error', findingCount: 0, durationMs: 0 },
    ],
  }
}

describe('html-reporter', () => {
  describe('renderHtmlReport', () => {
    it('given a report, then renders a complete html document with summary', () => {
      const output = renderHtmlReport(buildReport())

      expect(output).toContain('<!doctype html>')
      expect(output).toContain('Informe de auditoría — demo')
      expect(output).toContain('Health Score')
      expect(output).toContain('>80</div>')
      expect(output).toContain('Deuda técnica')
      expect(output).toContain('>90 min</div>')
      expect(output).toContain('Generado: 2026-08-06T00:00:00.000Z')
    })

    it('given a report, then groups findings by severity with counts', () => {
      const output = renderHtmlReport(buildReport())

      const criticalIndex = output.indexOf('Critical (1)')
      const mediumIndex = output.indexOf('Medium (1)')
      const lowIndex = output.indexOf('Low (2)')

      expect(criticalIndex).toBeGreaterThanOrEqual(0)
      expect(mediumIndex).toBeGreaterThanOrEqual(0)
      expect(lowIndex).toBeGreaterThanOrEqual(0)
      expect(criticalIndex).toBeLessThan(mediumIndex)
      expect(mediumIndex).toBeLessThan(lowIndex)
      expect(output).not.toContain('High (')
      expect(output).not.toContain('Info (')
      expect(output).toContain('src/a.ts:5')
      expect(output).toContain('data-severity="critical"')
    })

    it('given a report, then renders the analyzer statuses table', () => {
      const output = renderHtmlReport(buildReport())

      expect(output).toContain('<h2>Analizadores</h2>')
      expect(output).toContain('<td>dead-code</td>')
      expect(output).toContain('status-passed')
      expect(output).toContain('<td>npm-audit</td>')
      expect(output).toContain('status-error')
    })

    it('given a report without analyzer statuses, then omits the analyzers section', () => {
      const report = buildReport()
      report.analyzerStatuses = []

      const output = renderHtmlReport(report)

      expect(output).not.toContain('<h2>Analizadores</h2>')
    })

    it('given messages with html characters, then escapes them', () => {
      const output = renderHtmlReport(buildReport())

      expect(output).toContain('El símbolo &lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;')
      expect(output).not.toContain('<script>alert("x")</script>')
    })
  })
})
