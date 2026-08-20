import type { AnalysisReport, Finding } from '@codexa/analysis'
import { FindingSeverity, LanguageId } from '@codexa/contracts'
import { renderMarkdownReport } from './markdown-reporter'

function buildReport(): AnalysisReport {
  const findings: Finding[] = [
    {
      id: 'f1',
      ruleId: 'dead-code',
      severity: FindingSeverity.Critical,
      message: 'El símbolo...',
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
    analyzerStatuses: [],
  }
}

describe('markdown-reporter', () => {
  describe('renderMarkdownReport', () => {
    it('given a report, then renders the summary table', () => {
      const output = renderMarkdownReport(buildReport())

      expect(output).toContain('Health Score')
      expect(output).toContain('80')
      expect(output).toContain('Deuda técnica (min)')
      expect(output).toContain('90')
      expect(output).toContain('4')
      expect(output).toContain('demo')
    })

    it('given a report, then groups findings by severity in descending order', () => {
      const output = renderMarkdownReport(buildReport())

      const criticalIndex = output.indexOf('### Critical')
      const mediumIndex = output.indexOf('### Medium')
      const lowIndex = output.indexOf('### Low')

      expect(criticalIndex).toBeGreaterThanOrEqual(0)
      expect(mediumIndex).toBeGreaterThanOrEqual(0)
      expect(lowIndex).toBeGreaterThanOrEqual(0)
      expect(criticalIndex).toBeLessThan(mediumIndex)
      expect(mediumIndex).toBeLessThan(lowIndex)
      expect(output).not.toContain('### High')
      expect(output).not.toContain('### Info')
      expect(output).toContain('- **dead-code** src/a.ts:5 — El símbolo...')
      expect(output).toContain('- **npm-audit** package-lock.json — Vulnerabilidad...')
    })
  })
})
