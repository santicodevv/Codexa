import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { FindingSeverity, LanguageId } from '@codexa/contracts'
import type { AnalysisContext } from '../interfaces/analyzer.interface'
import { NpmAuditAnalyzer } from './npm-audit.analyzer'

const NPM_LOCK_FIXTURE = path.resolve(process.cwd(), 'tools/fixtures/npm-lock')
const JS_ESM_FIXTURE = path.resolve(process.cwd(), 'tools/fixtures/js-esm')
const CLEAN_LOCKFILE = { lockfileVersion: 3, packages: {}, name: 'x', version: '1.0.0' }

function buildContext(rootDir: string): AnalysisContext {
  return { rootDir, language: LanguageId.Javascript, files: [] }
}

function createFailure(stdout: string): Error {
  return Object.assign(new Error('npm audit finalizó con código distinto de 0'), {
    stdout,
    stderr: '',
  })
}

describe('NpmAuditAnalyzer', () => {
  it('given an npm audit output with vulnerabilities, then reports them with mapped severities', async () => {
    const stdout = JSON.stringify({
      vulnerabilities: {
        'pkg-critical': {
          name: 'pkg-critical',
          severity: 'critical',
          isDirect: true,
          via: ['Command Injection'],
        },
        'pkg-moderate': {
          name: 'pkg-moderate',
          severity: 'moderate',
          via: [{ source: 1, title: 'ReDoS en pkg-moderate' }],
        },
        'pkg-low': {
          name: 'pkg-low',
          severity: 'low',
          via: [{ source: 2, title: 'Advisory de severidad baja' }],
        },
      },
    })
    const runner = jest.fn().mockRejectedValue(createFailure(stdout))
    const analyzer = new NpmAuditAnalyzer({ runner })

    const result = await analyzer.analyze(buildContext(NPM_LOCK_FIXTURE))

    expect(result.analyzer).toBe('npm-audit')
    expect(result.status).toBe('failed')
    expect(result.durationMs).toBeGreaterThanOrEqual(0)
    expect(result.findings).toHaveLength(3)
    expect(runner).toHaveBeenCalledTimes(1)
    expect(runner).toHaveBeenCalledWith(
      process.execPath,
      [
        expect.stringMatching(/[\\/]npm-cli\.js$/),
        'audit',
        '--json',
        '--registry=https://registry.npmjs.org',
      ],
      expect.objectContaining({ cwd: NPM_LOCK_FIXTURE, timeout: 120000 }),
    )

    const [criticalFinding, moderateFinding, lowFinding] = result.findings
    expect(criticalFinding).toEqual(
      expect.objectContaining({
        id: 'npm-audit:package-lock.json:0:0:pkg-critical',
        ruleId: 'npm-audit',
        severity: FindingSeverity.Critical,
        message: 'Vulnerabilidad critical en pkg-critical: Command Injection',
        filePath: 'package-lock.json',
        likelihood: 1,
        metadata: expect.objectContaining({
          packageName: 'pkg-critical',
          severity: 'critical',
          isDirect: true,
        }),
      }),
    )
    expect(moderateFinding).toEqual(
      expect.objectContaining({
        severity: FindingSeverity.Medium,
        message: 'Vulnerabilidad medium en pkg-moderate: ReDoS en pkg-moderate',
        metadata: expect.objectContaining({ packageName: 'pkg-moderate', severity: 'moderate' }),
      }),
    )
    expect(lowFinding).toEqual(
      expect.objectContaining({
        severity: FindingSeverity.Low,
        message: 'Vulnerabilidad low en pkg-low: Advisory de severidad baja',
        metadata: expect.objectContaining({ packageName: 'pkg-low', severity: 'low' }),
      }),
    )
  })

  it('given a project without lockfile, then passes without findings and without running npm', async () => {
    const runner = jest.fn()
    const analyzer = new NpmAuditAnalyzer({ runner })

    const result = await analyzer.analyze(buildContext(JS_ESM_FIXTURE))

    expect(result.status).toBe('passed')
    expect(result.findings).toHaveLength(0)
    expect(result.durationMs).toBe(0)
    expect(runner).not.toHaveBeenCalled()
  })

  describe('given a project with a clean lockfile', () => {
    let tempDir: string

    beforeAll(() => {
      tempDir = mkdtempSync(path.join(os.tmpdir(), 'npm-audit-clean-'))
      writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'x', version: '1.0.0' }),
      )
      writeFileSync(path.join(tempDir, 'package-lock.json'), JSON.stringify(CLEAN_LOCKFILE))
    })

    afterAll(() => {
      rmSync(tempDir, { recursive: true, force: true })
    })

    it('then passes without findings', async () => {
      const runner = jest
        .fn()
        .mockResolvedValue({ stdout: JSON.stringify({ vulnerabilities: {} }), stderr: '' })
      const analyzer = new NpmAuditAnalyzer({ runner })

      const result = await analyzer.analyze(buildContext(tempDir))

      expect(result.status).toBe('passed')
      expect(result.findings).toHaveLength(0)
      expect(runner).toHaveBeenCalledTimes(1)
    })
  })

  it('given a legacy npm audit output, then reports findings with legacy metadata', async () => {
    const stdout = JSON.stringify({
      advisories: {
        '1': {
          module_name: 'lodash',
          severity: 'high',
          title: 'Prototype Pollution',
          cve: 'CVE-2019-10744',
          vulnerable_versions: '>=4.17.12 <4.17.21',
        },
      },
    })
    const runner = jest.fn().mockResolvedValue({ stdout, stderr: '' })
    const analyzer = new NpmAuditAnalyzer({ runner })

    const result = await analyzer.analyze(buildContext(NPM_LOCK_FIXTURE))

    expect(result.status).toBe('failed')
    expect(result.findings).toHaveLength(1)
    const [finding] = result.findings
    expect(finding).toEqual(
      expect.objectContaining({
        severity: FindingSeverity.High,
        message: 'Vulnerabilidad high en lodash: Prototype Pollution',
        metadata: expect.objectContaining({
          packageName: 'lodash',
          severity: 'high',
          cve: 'CVE-2019-10744',
          range: '>=4.17.12 <4.17.21',
        }),
      }),
    )
  })

  it('given duplicate advisories for the same package and cve, then deduplicates findings', async () => {
    const stdout = JSON.stringify({
      advisories: {
        '1': { module_name: 'lodash', severity: 'high', title: 'A', cve: 'CVE-1' },
        '2': { module_name: 'lodash', severity: 'high', title: 'B', cve: 'CVE-1' },
      },
    })
    const runner = jest.fn().mockResolvedValue({ stdout, stderr: '' })
    const analyzer = new NpmAuditAnalyzer({ runner })

    const result = await analyzer.analyze(buildContext(NPM_LOCK_FIXTURE))

    expect(result.status).toBe('failed')
    expect(result.findings).toHaveLength(1)
  })

  it('given a spawn failure without JSON output, then returns an error status without findings', async () => {
    const runner = jest.fn().mockRejectedValue(
      Object.assign(new Error('spawn npm.cmd ENOENT'), {
        code: 'ENOENT',
        stdout: '',
        stderr: '',
      }),
    )
    const analyzer = new NpmAuditAnalyzer({ runner })

    const result = await analyzer.analyze(buildContext(NPM_LOCK_FIXTURE))

    expect(result.status).toBe('error')
    expect(result.findings).toHaveLength(0)
  })
})
