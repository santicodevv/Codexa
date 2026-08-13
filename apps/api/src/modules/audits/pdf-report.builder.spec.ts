import { buildAuditPdf } from './pdf-report.builder'
import type { AuditPdfData } from './pdf-report.builder'

const sampleAudit: AuditPdfData = {
  id: 'audit-1',
  repository: { name: 'demo', url: '' },
  status: 'completed',
  commitSha: 'abc123',
  provider: 'anthropic',
  model: 'claude-sonnet-4-5',
  healthScore: 80,
  severityCounts: { critical: 0, medium: 1, low: 2 },
  totalFindings: 3,
  estimatedDebtHours: '1.5',
  startedAt: new Date().toISOString(),
  completedAt: new Date().toISOString(),
  findings: [
    { severity: 'medium', message: 'unused symbol', filePath: 'src/a.ts', lineNumber: 3, ruleId: 'dead-code' },
  ],
  suggestions: [
    {
      type: 'refactor',
      title: 'Divide módulo',
      description: 'Separa responsabilidades',
      targetFile: 'src/a.ts',
      targetLine: 3,
    },
  ],
  moduleSummaries: [{ moduleName: 'src', moduleScore: 95, findingCount: 1 }],
}

describe('buildAuditPdf', () => {
  it('given audit data, then returns a valid PDF buffer', async () => {
    const buffer = await buildAuditPdf(sampleAudit)

    expect(buffer.length).toBeGreaterThan(0)
    expect(buffer.subarray(0, 4).toString('utf-8')).toBe('%PDF')
  })

  it('given audit data without suggestions or module summaries, then still builds a valid PDF', async () => {
    const buffer = await buildAuditPdf({ ...sampleAudit, suggestions: [], moduleSummaries: [] })

    expect(buffer.subarray(0, 4).toString('utf-8')).toBe('%PDF')
  })
})
