import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { FindingSeverity, LanguageId } from '@codexa/contracts'
import { collectSourceFiles } from '../collectors/repo-collector'
import type { AnalysisContext } from '../interfaces/analyzer.interface'
import { DeadCodeAnalyzer } from './dead-code.analyzer'

describe('DeadCodeAnalyzer', () => {
  let tempDir: string | undefined

  afterAll(() => {
    if (tempDir !== undefined) {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('given ts-basic fixture, then reports the four known dead symbols', async () => {
    const rootDir = path.resolve(process.cwd(), 'tools/fixtures/ts-basic')
    const files = await collectSourceFiles(rootDir)
    const context: AnalysisContext = {
      rootDir,
      language: LanguageId.Typescript,
      files,
    }

    const result = await new DeadCodeAnalyzer().analyze(context)

    expect(result.findings).toHaveLength(4)
    const messages = result.findings.map((finding) => finding.message)
    expect(messages.join('\n')).toContain('subtract')
    expect(messages.join('\n')).toContain('multiply')
    expect(messages.join('\n')).toContain('unusedHelper')
    expect(messages.join('\n')).toContain('unusedLocal')
    for (const finding of result.findings) {
      expect(finding.severity).toBe(FindingSeverity.Low)
      expect(finding.likelihood).toBe(1)
      expect(finding.id).not.toBe('')
      expect(path.isAbsolute(finding.filePath)).toBe(false)
    }
  })

  it('given an empty typescript file, then no dead code is reported', async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'codexa-'))
    tempDir = dir
    mkdirSync(path.join(dir, 'src'))
    writeFileSync(path.join(dir, 'src', 'empty.ts'), 'export const x = 1')

    const result = await new DeadCodeAnalyzer().analyze({
      rootDir: dir,
      language: LanguageId.Typescript,
      files: ['src/empty.ts'],
    })

    expect(result.findings).toHaveLength(0)
  })
})
