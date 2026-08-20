import { execFile } from 'node:child_process'
import type { ExecFileOptions } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { performance } from 'node:perf_hooks'
import { promisify } from 'node:util'
import { FindingSeverity } from '@codexa/contracts'
import type { AnalysisContext, AnalyzerResult, IAnalyzer } from '../interfaces/analyzer.interface'
import type { Finding } from '../interfaces/result.types'

const ANALYZER_ID = 'npm-audit'
const DEFAULT_TIMEOUT_MS = 120000
const DEFAULT_AUDIT_COMMAND = 'npm'
const MAX_BUFFER_BYTES = 10 * 1024 * 1024
const DEFAULT_LIKELIHOOD = 1
const LOCK_FILE_CANDIDATES: string[] = ['package-lock.json', 'npm-shrinkwrap.json']
const PUBLIC_REGISTRY = 'https://registry.npmjs.org'
const AUDIT_ARGS: string[] = ['audit', '--json', `--registry=${PUBLIC_REGISTRY}`]

type NpmSeverity = 'critical' | 'high' | 'moderate' | 'low' | 'info'

const NPM_SEVERITY_MAP: Record<NpmSeverity, FindingSeverity> = {
  critical: FindingSeverity.Critical,
  high: FindingSeverity.High,
  moderate: FindingSeverity.Medium,
  low: FindingSeverity.Low,
  info: FindingSeverity.Info,
}

interface ExecFileError {
  stdout?: string
  stderr?: string
}

interface ExecFileResult {
  stdout: string
  stderr: string
}

export type ExecFileRunner = (
  file: string,
  args: string[],
  options: ExecFileOptions,
) => Promise<ExecFileResult>

export interface NpmAuditAnalyzerOptions {
  timeoutMs?: number
  auditCommand?: string
  runner?: ExecFileRunner
}

interface NpmViaObject {
  title?: string
  cve?: string
  range?: string
}

interface NpmVulnerabilityV7 {
  name: string
  severity: NpmSeverity
  isDirect?: boolean
  via?: Array<string | NpmViaObject>
}

interface NpmAdvisory {
  module_name: string
  severity: NpmSeverity
  title?: string
  cve?: string
  vulnerable_versions?: string
}

interface NpmAuditV7Output {
  vulnerabilities: Record<string, NpmVulnerabilityV7>
}

interface NpmAuditLegacyOutput {
  advisories: Record<string, NpmAdvisory>
}

type NpmAuditOutput = NpmAuditV7Output | NpmAuditLegacyOutput

interface BuiltFinding {
  finding: Finding
  dedupKey: string
}

interface NpmInvocation {
  file: string
  args: string[]
}

/**
 * Ejecuta `npm audit --json` sobre el repositorio auditado y traduce las
 * vulnerabilidades a hallazgos deterministas.
 *
 * Seguridad: el binario NUNCA se resuelve desde el cwd del repo auditado
 * (evita el hijack de `npm.cmd` en Windows). Se invoca npm-cli.js con el
 * ejecutable absoluto de Node y sin shell. El registry público se fuerza con
 * `--registry` para impedir que un `.npmrc` del repo exfiltre el manifest.
 */
export class NpmAuditAnalyzer implements IAnalyzer {
  readonly id = ANALYZER_ID
  readonly timeoutMs: number
  readonly auditCommand: string
  private readonly runner: ExecFileRunner

  constructor(options: NpmAuditAnalyzerOptions = {}) {
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
    this.auditCommand = options.auditCommand ?? DEFAULT_AUDIT_COMMAND
    this.runner = options.runner ?? (promisify(execFile) as ExecFileRunner)
  }

  async analyze(context: AnalysisContext): Promise<AnalyzerResult> {
    const lockfile = detectLockfile(context.rootDir)
    if (lockfile === undefined) {
      return this.passedResult()
    }

    const startedAt = performance.now()
    const stdout = await this.runAudit(context)
    const output = parseAuditOutput(stdout)

    if (output === undefined) {
      return this.errorResult(startedAt)
    }

    const findings = extractFindings(output, lockfile)
    const durationMs = Math.round(performance.now() - startedAt)
    return {
      analyzer: ANALYZER_ID,
      status: findings.length > 0 ? 'failed' : 'passed',
      findings,
      durationMs,
    }
  }

  private async runAudit(context: AnalysisContext): Promise<string> {
    try {
      const invocation = this.resolveInvocation()
      const result = await this.runner(invocation.file, [...invocation.args, ...AUDIT_ARGS], {
        cwd: context.rootDir,
        timeout: this.timeoutMs,
        maxBuffer: MAX_BUFFER_BYTES,
        encoding: 'utf8',
      })
      return result.stdout
    } catch (error) {
      const failure = error as ExecFileError
      return typeof failure.stdout === 'string' ? failure.stdout : ''
    }
  }

  private resolveInvocation(): NpmInvocation {
    if (this.auditCommand !== DEFAULT_AUDIT_COMMAND) {
      return { file: this.auditCommand, args: [] }
    }
    const npmExecPath = process.env.npm_execpath
    if (typeof npmExecPath === 'string' && npmExecPath.length > 0 && npmExecPath.endsWith('.js')) {
      return { file: process.execPath, args: [npmExecPath] }
    }
    const bundledCli = path.join(
      path.dirname(process.execPath),
      'node_modules',
      'npm',
      'bin',
      'npm-cli.js',
    )
    if (existsSync(bundledCli)) {
      return { file: process.execPath, args: [bundledCli] }
    }
    return { file: process.platform === 'win32' ? 'npm.cmd' : 'npm', args: [] }
  }

  private passedResult(): AnalyzerResult {
    return { analyzer: ANALYZER_ID, status: 'passed', findings: [], durationMs: 0 }
  }

  private errorResult(startedAt: number): AnalyzerResult {
    return {
      analyzer: ANALYZER_ID,
      status: 'error',
      findings: [],
      durationMs: Math.round(performance.now() - startedAt),
    }
  }
}

function detectLockfile(rootDir: string): string | undefined {
  return LOCK_FILE_CANDIDATES.find((candidate) => existsSync(path.join(rootDir, candidate)))
}

function parseAuditOutput(stdout: string): NpmAuditOutput | undefined {
  if (stdout.length === 0) {
    return undefined
  }
  try {
    const parsed = JSON.parse(stdout) as Record<string, unknown>
    if (parsed === null || typeof parsed !== 'object') {
      return undefined
    }
    if ('error' in parsed && parsed.error !== undefined) {
      return undefined
    }
    return parsed as unknown as NpmAuditOutput
  } catch {
    return undefined
  }
}

function mapSeverity(severity: NpmSeverity): FindingSeverity {
  return NPM_SEVERITY_MAP[severity] ?? FindingSeverity.Info
}

function extractFindings(output: NpmAuditOutput, lockfile: string): Finding[] {
  const findings: Finding[] = []
  const seen = new Set<string>()

  if ('vulnerabilities' in output && isRecord(output.vulnerabilities)) {
    for (const vulnerability of Object.values(output.vulnerabilities)) {
      pushDeduplicated(findings, seen, buildV7Finding(vulnerability, lockfile))
    }
    return findings
  }

  if ('advisories' in output && isRecord(output.advisories)) {
    for (const advisory of Object.values(output.advisories)) {
      pushDeduplicated(findings, seen, buildLegacyFinding(advisory, lockfile))
    }
  }

  return findings
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function pushDeduplicated(findings: Finding[], seen: Set<string>, built: BuiltFinding): void {
  if (seen.has(built.dedupKey)) {
    return
  }
  seen.add(built.dedupKey)
  findings.push(built.finding)
}

function buildV7Finding(vulnerability: NpmVulnerabilityV7, lockfile: string): BuiltFinding {
  const name = vulnerability.name
  const via = vulnerability.via ?? []
  const title = resolveViaTitle(via)
  const cve = findViaStringField(via, 'cve')
  const range = findViaStringField(via, 'range')
  const severity = mapSeverity(vulnerability.severity)
  const message =
    title !== undefined
      ? `Vulnerabilidad ${severity} en ${name}: ${title}`
      : `Vulnerabilidad ${severity} en ${name}`

  const metadata: Record<string, unknown> = {
    packageName: name,
    severity: vulnerability.severity,
    ...(title !== undefined ? { title } : {}),
    ...(cve !== undefined ? { cve } : {}),
    ...(typeof vulnerability.isDirect === 'boolean' ? { isDirect: vulnerability.isDirect } : {}),
    ...(range !== undefined ? { range } : {}),
  }

  const finding: Finding = {
    id: `${ANALYZER_ID}:${lockfile}:0:0:${name}`,
    ruleId: ANALYZER_ID,
    severity,
    message,
    filePath: lockfile,
    likelihood: DEFAULT_LIKELIHOOD,
    metadata,
  }

  return { finding, dedupKey: `${name}:${cve ?? vulnerability.severity}` }
}

function buildLegacyFinding(advisory: NpmAdvisory, lockfile: string): BuiltFinding {
  const name = advisory.module_name
  const severity = mapSeverity(advisory.severity)
  const title =
    typeof advisory.title === 'string' && advisory.title.length > 0 ? advisory.title : undefined
  const cve = typeof advisory.cve === 'string' && advisory.cve.length > 0 ? advisory.cve : undefined
  const range =
    typeof advisory.vulnerable_versions === 'string' && advisory.vulnerable_versions.length > 0
      ? advisory.vulnerable_versions
      : undefined
  const message =
    title !== undefined
      ? `Vulnerabilidad ${severity} en ${name}: ${title}`
      : `Vulnerabilidad ${severity} en ${name}`

  const metadata: Record<string, unknown> = {
    packageName: name,
    severity: advisory.severity,
    ...(title !== undefined ? { title } : {}),
    ...(cve !== undefined ? { cve } : {}),
    ...(range !== undefined ? { range } : {}),
  }

  const finding: Finding = {
    id: `${ANALYZER_ID}:${lockfile}:0:0:${name}`,
    ruleId: ANALYZER_ID,
    severity,
    message,
    filePath: lockfile,
    likelihood: DEFAULT_LIKELIHOOD,
    metadata,
  }

  return { finding, dedupKey: `${name}:${cve ?? advisory.severity}` }
}

function resolveViaTitle(via: Array<string | NpmViaObject>): string | undefined {
  const first = via[0]
  if (first === undefined) {
    return undefined
  }
  if (typeof first === 'string') {
    return first.length > 0 ? first : undefined
  }
  return typeof first.title === 'string' && first.title.length > 0 ? first.title : undefined
}

function findViaStringField(
  via: Array<string | NpmViaObject>,
  field: 'cve' | 'range',
): string | undefined {
  for (const entry of via) {
    if (typeof entry === 'object' && entry !== null) {
      const value = entry[field]
      if (typeof value === 'string' && value.length > 0) {
        return value
      }
    }
  }
  return undefined
}
