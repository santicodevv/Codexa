import type { CiAuditResult } from './api-client'
import { buildReviewComments, buildSummaryComment } from './comment-formatter'

function sampleAudit(overrides: Partial<CiAuditResult> = {}): CiAuditResult {
  return {
    id: 'audit-1',
    status: 'completed',
    commitSha: 'abc123',
    healthScore: 87,
    severityCounts: { critical: 2, medium: 13, low: 9 },
    totalFindings: 24,
    estimatedDebtHours: 8,
    errorMessage: null,
    findings: [],
    suggestions: [],
    ...overrides,
  }
}

describe('buildSummaryComment', () => {
  it('incluye el health score, contadores y título del PR', () => {
    const comment = buildSummaryComment(sampleAudit(), 42)
    expect(comment).toContain('Auditoría del PR #42')
    expect(comment).toContain('**87**')
    expect(comment).toContain('| 2 | 13 | 9 |')
    expect(comment).toContain('~8 horas')
  })

  it('lista hasta 3 sugerencias destacadas con su ubicación', () => {
    const audit = sampleAudit({
      suggestions: [
        {
          id: 's1',
          type: 'refactor',
          title: 'Divide UserService',
          description: '...',
          targetFile: 'src/user.service.ts',
          targetLine: 210,
          codeBlocks: [],
        },
        { id: 's2', type: 'refactor', title: 'Elimina duplicado', description: '...', codeBlocks: [] },
      ] as CiAuditResult['suggestions'],
    })

    const comment = buildSummaryComment(audit, 1)
    expect(comment).toContain('Divide UserService (`src/user.service.ts:210`)')
    expect(comment).toContain('Elimina duplicado')
  })

  it('no rompe si no hay sugerencias', () => {
    const comment = buildSummaryComment(sampleAudit({ suggestions: [] }), 1)
    expect(comment).not.toContain('Sugerencias destacadas')
  })
})

describe('buildReviewComments', () => {
  it('solo comenta hallazgos críticos que caen en líneas agregadas del diff', () => {
    const audit = sampleAudit({
      findings: [
        { id: 'f1', ruleId: 'x', severity: 'critical', message: 'boom', filePath: 'a.ts', lineNumber: 5 },
        { id: 'f2', ruleId: 'x', severity: 'critical', message: 'fuera del diff', filePath: 'a.ts', lineNumber: 99 },
        { id: 'f3', ruleId: 'x', severity: 'medium', message: 'no crítico', filePath: 'a.ts', lineNumber: 5 },
        { id: 'f4', ruleId: 'x', severity: 'critical', message: 'otro archivo', filePath: 'b.ts', lineNumber: 5 },
      ] as CiAuditResult['findings'],
    })
    const changedLines = new Map([['a.ts', new Set([5, 6])]])

    const comments = buildReviewComments(audit, changedLines)

    expect(comments).toEqual([{ path: 'a.ts', line: 5, side: 'RIGHT', body: '**Codexa:** boom' }])
  })

  it('trunca comentarios muy largos a 200 caracteres', () => {
    const longMessage = 'x'.repeat(500)
    const audit = sampleAudit({
      findings: [
        { id: 'f1', ruleId: 'x', severity: 'critical', message: longMessage, filePath: 'a.ts', lineNumber: 1 },
      ] as CiAuditResult['findings'],
    })
    const changedLines = new Map([['a.ts', new Set([1])]])

    const comments = buildReviewComments(audit, changedLines)
    expect(comments).toHaveLength(1)
    expect(comments[0]?.body.length).toBe(200)
  })
})
