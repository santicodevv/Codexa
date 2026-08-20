import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { FindingSeverity, LanguageId } from '@codexa/contracts'
import { collectSourceFiles } from '../collectors/repo-collector'
import type { AnalysisContext } from '../interfaces/analyzer.interface'
import { CyclomaticComplexityAnalyzer } from './cyclomatic-complexity.analyzer'

describe('CyclomaticComplexityAnalyzer', () => {
  let tempDir: string | undefined

  afterAll(() => {
    if (tempDir !== undefined) {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('given ts-basic fixture, then reports doEverything as too complex', async () => {
    const rootDir = path.resolve(process.cwd(), 'tools/fixtures/ts-basic')
    const files = await collectSourceFiles(rootDir)
    const context: AnalysisContext = {
      rootDir,
      language: LanguageId.Typescript,
      files,
    }

    const result = await new CyclomaticComplexityAnalyzer().analyze(context)

    expect(result.findings).toHaveLength(1)
    const finding = result.findings[0]
    expect(finding).toBeDefined()
    if (finding === undefined) {
      return
    }
    expect(finding.ruleId).toBe('cyclomatic-complexity')
    expect(finding.metadata?.complexity).toBe(10)
    expect(finding.severity).toBe(FindingSeverity.Low)
    expect(finding.filePath).toBe('src/math.ts')
  })

  it('given a simple function, then no finding', async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'codexa-'))
    tempDir = dir
    mkdirSync(path.join(dir, 'src'))
    writeFileSync(
      path.join(dir, 'src', 'simple.ts'),
      'export function simple(): number { return 1 }',
    )

    const result = await new CyclomaticComplexityAnalyzer().analyze({
      rootDir: dir,
      language: LanguageId.Typescript,
      files: ['src/simple.ts'],
    })

    expect(result.findings).toHaveLength(0)
  })
})
