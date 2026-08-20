import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { FindingSeverity, LanguageId } from '@codexa/contracts'
import { collectSourceFiles } from '../collectors/repo-collector'
import type { AnalysisContext } from '../interfaces/analyzer.interface'
import { UntestedFunctionsAnalyzer } from './untested-functions.analyzer'

const FIXTURES_DIR = path.resolve(process.cwd(), 'tools/fixtures/ts-basic')

const tempDirs: string[] = []

function createFixture(files: Record<string, string>): string {
  const rootDir = mkdtempSync(path.join(os.tmpdir(), 'codexa-untested-'))
  tempDirs.push(rootDir)
  for (const [relativePath, content] of Object.entries(files)) {
    const absolutePath = path.join(rootDir, relativePath)
    mkdirSync(path.dirname(absolutePath), { recursive: true })
    writeFileSync(absolutePath, content, 'utf8')
  }
  return rootDir
}

afterAll(() => {
  for (const tempDir of tempDirs) {
    rmSync(tempDir, { recursive: true, force: true })
  }
})

describe('UntestedFunctionsAnalyzer', () => {
  const analyzer = new UntestedFunctionsAnalyzer()

  it('given ts-basic fixture without tests, then reports all exported functions', async () => {
    const rootDir = FIXTURES_DIR
    const files = await collectSourceFiles(rootDir)
    const context: AnalysisContext = { rootDir, language: LanguageId.Typescript, files }

    const result = await analyzer.analyze(context)

    expect(result.status).toBe('passed')
    expect(result.analyzer).toBe('untested-function')
    expect(result.findings).toHaveLength(7)

    for (const finding of result.findings) {
      expect(finding.ruleId).toBe('untested-function')
      expect(finding.severity).toBe(FindingSeverity.Info)
      expect(finding.likelihood).toBe(0.4)
      expect(finding.filePath).toMatch(/^src\//)
    }

    const expectedFindings = [
      { functionName: 'add', filePath: 'src/math.ts', lineNumber: 1 },
      { functionName: 'subtract', filePath: 'src/math.ts', lineNumber: 5 },
      { functionName: 'multiply', filePath: 'src/math.ts', lineNumber: 9 },
      { functionName: 'doEverything', filePath: 'src/math.ts', lineNumber: 15 },
      { functionName: 'unusedHelper', filePath: 'src/legacy.ts', lineNumber: 1 },
      { functionName: 'usedLegacy', filePath: 'src/legacy.ts', lineNumber: 5 },
      { functionName: 'run', filePath: 'src/index.ts', lineNumber: 6 },
    ]

    for (const expected of expectedFindings) {
      const match = result.findings.find(
        (finding) =>
          finding.filePath === expected.filePath &&
          finding.metadata?.functionName === expected.functionName &&
          finding.lineNumber === expected.lineNumber,
      )
      expect(match).toBeDefined()
    }

    expect(result.findings.some((finding) => finding.filePath === 'src/main.ts')).toBe(false)
  })

  it('given a source file with a matching test file, then passes', async () => {
    const rootDir = createFixture({
      'src/calc.ts': 'export function plus(a: number, b: number): number { return a + b }',
      'src/calc.spec.ts': `import { plus } from './calc'\n\nexpect(plus(1, 2)).toBe(3)`,
    })
    const context: AnalysisContext = {
      rootDir,
      language: LanguageId.Typescript,
      files: ['src/calc.ts', 'src/calc.spec.ts'],
    }

    const result = await analyzer.analyze(context)

    expect(result.status).toBe('passed')
    expect(result.findings).toHaveLength(0)
  })

  it('given a test file that does not reference the function, then reports it', async () => {
    const rootDir = createFixture({
      'src/calc.ts': [
        'export function plus(a: number, b: number): number { return a + b }',
        'export function minus(a: number, b: number): number { return a - b }',
      ].join('\n'),
      'src/calc.spec.ts': `import { plus } from './calc'\n\nexpect(plus(1, 2)).toBe(3)`,
    })
    const context: AnalysisContext = {
      rootDir,
      language: LanguageId.Typescript,
      files: ['src/calc.ts', 'src/calc.spec.ts'],
    }

    const result = await analyzer.analyze(context)

    expect(result.findings).toHaveLength(1)

    const finding = result.findings[0]
    expect(finding?.ruleId).toBe('untested-function')
    expect(finding?.severity).toBe(FindingSeverity.Info)
    expect(finding?.filePath).toBe('src/calc.ts')
    expect(finding?.metadata?.functionName).toBe('minus')
  })
})
