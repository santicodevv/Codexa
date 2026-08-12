import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { Command } from 'commander'
import type { AnalysisReport } from '@codexa/analysis'
import { runAnalysis } from '@codexa/analysis'
import { LanguageId } from '@codexa/contracts'
import { registerAuditCommand } from './audit.command'

jest.mock('@codexa/analysis', () => ({
  runAnalysis: jest.fn(),
}))

const runAnalysisMock = runAnalysis as jest.Mock

function buildMinimalReport(): AnalysisReport {
  return {
    summary: {
      name: 'demo',
      language: LanguageId.Typescript,
      fileCount: 1,
      dependencyCount: 0,
      analyzedAt: '2026-08-06T00:00:00.000Z',
    },
    findings: [],
    severityCounts: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
    healthScore: 100,
    technicalDebtMinutes: 0,
    durationMs: 10,
    analyzerStatuses: [],
  }
}

describe('audit.command', () => {
  let tempDir: string

  beforeEach(() => {
    process.exitCode = 0
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codexa-audit-'))
  })

  afterEach(() => {
    runAnalysisMock.mockReset()
    jest.restoreAllMocks()
    process.exitCode = 0
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it('given a valid path, then writes a markdown report and exits zero', async () => {
    runAnalysisMock.mockResolvedValue(buildMinimalReport())
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {})

    const program = new Command()
    registerAuditCommand(program)

    await program.parseAsync(['node', 'codexa', 'audit', '--path', tempDir])

    expect(runAnalysisMock).toHaveBeenCalledWith({ rootDir: path.resolve(tempDir) })
    expect(consoleLogSpy).toHaveBeenCalledTimes(1)
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Informe de auditoría'))
    expect(process.exitCode).toBe(0)
  })

  it('given an invalid path, then exits with code 1', async () => {
    const missingDir = path.join(os.tmpdir(), 'no-existe-' + Date.now())
    jest.spyOn(console, 'error').mockImplementation(() => {})

    const program = new Command()
    registerAuditCommand(program)

    await program.parseAsync(['node', 'codexa', 'audit', '--path', missingDir])

    expect(process.exitCode).toBe(1)
    expect(runAnalysisMock).not.toHaveBeenCalled()
  })
})
