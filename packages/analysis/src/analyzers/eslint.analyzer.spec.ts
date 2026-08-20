import { promises as fs, mkdtempSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { FindingSeverity, LanguageId } from '@codexa/contracts'
import type { AnalysisContext } from '../interfaces/analyzer.interface'
import { EsLintAnalyzer } from './eslint.analyzer'

const FIXTURES_DIR = path.resolve(process.cwd(), 'tools/fixtures')
const TS_BASIC_ROOT_DIR = path.join(FIXTURES_DIR, 'ts-basic')

const analyzer = new EsLintAnalyzer()

function buildContext(rootDir: string, files: string[]): AnalysisContext {
  return { rootDir, language: LanguageId.Typescript, files }
}

describe('eslint analyzer', () => {
  let tempRootDir: string

  beforeAll(() => {
    tempRootDir = mkdtempSync(path.join(os.tmpdir(), 'codexa-eslint-'))
  })

  afterAll(async () => {
    await fs.rm(tempRootDir, { recursive: true, force: true })
  })

  it('given ts-basic fixture, then reports console and eqeqeq violations on plain.js', async () => {
    const result = await analyzer.analyze(
      buildContext(TS_BASIC_ROOT_DIR, [
        'src/index.ts',
        'src/legacy.ts',
        'src/main.ts',
        'src/math.ts',
        'src/plain.js',
      ]),
    )

    expect(result.findings).toHaveLength(2)
    expect(result.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: 'eslint.no-console',
          severity: FindingSeverity.Low,
          likelihood: 0.5,
        }),
        expect.objectContaining({
          ruleId: 'eslint.eqeqeq',
          severity: FindingSeverity.Low,
          likelihood: 0.5,
        }),
      ]),
    )
    for (const finding of result.findings) {
      expect(finding.filePath).toBe('src/plain.js')
      expect(finding.severity).toBe(FindingSeverity.Low)
    }
    expect(result.status).toBe('passed')
  })

  it('given a file with no violations, then passes with no findings', async () => {
    await fs.mkdir(path.join(tempRootDir, 'src'))
    await fs.writeFile(
      path.join(tempRootDir, 'src', 'clean.js'),
      "'use strict'; function add(a, b) { return a + b } module.exports = { add }\n",
    )

    const result = await analyzer.analyze(buildContext(tempRootDir, ['src/clean.js']))

    expect(result.findings).toHaveLength(0)
    expect(result.status).toBe('passed')
  })

  it('given an undefined global, then reports no-undef as high', async () => {
    await fs.writeFile(path.join(tempRootDir, 'src', 'bad.js'), 'module.exports = missingVar\n')

    const result = await analyzer.analyze(buildContext(tempRootDir, ['src/bad.js']))

    expect(result.findings).toHaveLength(1)
    expect(result.findings[0]).toMatchObject({
      ruleId: 'eslint.no-undef',
      severity: FindingSeverity.High,
      likelihood: 1,
      filePath: 'src/bad.js',
    })
    expect(result.status).toBe('failed')
  })
})
