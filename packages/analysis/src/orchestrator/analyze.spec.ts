import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { FindingSeverity, LanguageId } from '@codexa/contracts'
import type { AnalyzerResult, IAnalyzer } from '../interfaces/analyzer.interface'
import type { Finding } from '../interfaces/result.types'
import { runAnalysis } from './analyze'

function makeFinding(
  id: string,
  severity: FindingSeverity,
  filePath: string,
  lineNumber?: number,
): Finding {
  return {
    id,
    ruleId: 'RULE-001',
    severity,
    message: 'hallazgo de prueba',
    filePath,
    ...(lineNumber !== undefined ? { lineNumber } : {}),
    likelihood: 1,
  }
}

function makeAnalyzer(id: string, result: AnalyzerResult): IAnalyzer {
  return {
    id,
    async analyze(): Promise<AnalyzerResult> {
      return result
    },
  }
}

function makeThrowingAnalyzer(id: string): IAnalyzer {
  return {
    id,
    async analyze(): Promise<AnalyzerResult> {
      throw new Error(`fallo simulado del analizador ${id}`)
    },
  }
}

describe('runAnalysis (analizadores fake)', () => {
  let fixtureRoot: string

  beforeEach(() => {
    fixtureRoot = mkdtempSync(path.join(os.tmpdir(), 'codexa-analyze-'))
    mkdirSync(path.join(fixtureRoot, 'src'), { recursive: true })
    writeFileSync(path.join(fixtureRoot, 'src', 'a.ts'), 'export const x = 1\n')
  })

  afterAll(() => {
    rmSync(fixtureRoot, { recursive: true, force: true })
  })

  it('given un analizador con findings y otro que lanza, then la ejecución continúa y el reporte es correcto', async () => {
    const analyzers: IAnalyzer[] = [
      makeAnalyzer('fake-findings', {
        analyzer: 'fake-findings',
        status: 'passed',
        findings: [
          makeFinding('FIND-CRITICAL', FindingSeverity.Critical, 'src/a.ts', 1),
          makeFinding('FIND-LOW', FindingSeverity.Low, 'src/a.ts', 2),
        ],
        durationMs: 1,
      }),
      makeThrowingAnalyzer('fake-fallido'),
    ]

    const report = await runAnalysis({ rootDir: fixtureRoot, analyzers })

    expect(report.findings.length).toBe(2)
    expect(report.healthScore).toBe(73)
    expect(report.severityCounts.critical).toBe(1)
    expect(report.severityCounts.low).toBe(1)
    expect(report.durationMs).toBeGreaterThanOrEqual(0)
    expect(report.findings[0]?.severity).toBe(FindingSeverity.Critical)
  })

  it('given tres findings desordenados, then se ordenan por severidad, archivo y línea', async () => {
    const analyzers: IAnalyzer[] = [
      makeAnalyzer('fake-orden', {
        analyzer: 'fake-orden',
        status: 'failed',
        findings: [
          makeFinding('FIND-MEDIUM', FindingSeverity.Medium, 'src/b.ts', 10),
          makeFinding('FIND-CRITICAL-5', FindingSeverity.Critical, 'src/a.ts', 5),
          makeFinding('FIND-CRITICAL-1', FindingSeverity.Critical, 'src/a.ts', 1),
        ],
        durationMs: 1,
      }),
    ]

    const report = await runAnalysis({ rootDir: fixtureRoot, analyzers })

    expect(report.findings.map((item) => item.id)).toEqual([
      'FIND-CRITICAL-1',
      'FIND-CRITICAL-5',
      'FIND-MEDIUM',
    ])
  })
})

describe('runAnalysis (integración)', () => {
  it('given el fixture ts-basic, then produce un reporte completo', async () => {
    const rootDir = path.resolve(process.cwd(), 'tools/fixtures/ts-basic')
    const report = await runAnalysis({ rootDir })

    expect(report.summary.name).toBe('ts-basic')
    expect(report.summary.language).toBe(LanguageId.Typescript)
    expect(report.healthScore).toBeGreaterThanOrEqual(0)
    expect(report.healthScore).toBeLessThanOrEqual(100)
    expect(report.findings.length).toBeGreaterThanOrEqual(14)
    for (const findingItem of report.findings) {
      expect(findingItem.id.length).toBeGreaterThan(0)
      expect(findingItem.filePath.length).toBeGreaterThan(0)
    }
  })
})
