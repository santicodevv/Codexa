import path from 'node:path'
import { ESLint } from 'eslint'
import type { Linter } from 'eslint'
import globals from 'globals'
import { FindingSeverity } from '@codexa/contracts'
import type { AnalysisContext, AnalyzerResult, IAnalyzer } from '../interfaces/analyzer.interface'
import type { Finding } from '../interfaces/result.types'

/**
 * Analizador estático basado en ESLint (flat config) con un ruleset fijo y
 * determinista. NO carga la configuración del repositorio auditado
 * (`overrideConfigFile: true` ignora cualquier `eslint.config.*` del proyecto).
 *
 * Limitación documentada: solo se analizan archivos JavaScript
 * (.js, .jsx, .mjs, .cjs). Los archivos .ts/.tsx se omiten porque requerirían
 * el parser de TypeScript, fuera del alcance de este analizador.
 */
const JS_FILE_EXTENSIONS: ReadonlySet<string> = new Set(['.js', '.jsx', '.mjs', '.cjs'])

const FIXED_RULES: Record<string, string> = {
  'no-undef': 'error',
  'no-unused-vars': 'warn',
  'no-console': 'warn',
  eqeqeq: 'warn',
  'no-debugger': 'error',
}

const FIXED_GLOBALS: Record<string, 'readonly' | 'writable' | 'off' | boolean> = {
  ...globals.node,
}

const FIXED_CONFIG_ARRAY: Linter.Config[] = [
  {
    files: ['**/*.{js,jsx,mjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: FIXED_GLOBALS,
    },
    rules: FIXED_RULES as Linter.RulesRecord,
  },
  {
    files: ['**/*.cjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: FIXED_GLOBALS,
    },
    rules: FIXED_RULES as Linter.RulesRecord,
  },
]

const FAILED_SEVERITIES: ReadonlySet<FindingSeverity> = new Set([
  FindingSeverity.Critical,
  FindingSeverity.High,
  FindingSeverity.Medium,
])

type EsLintMessage = ESLint.LintResult['messages'][number]

function toPosixRelativePath(rootDir: string, filePath: string): string {
  return path.relative(rootDir, filePath).split(path.sep).join('/')
}

function mapMessageToFinding(
  rootDir: string,
  absoluteFilePath: string,
  message: EsLintMessage,
): Finding {
  const isFatal = message.fatal === true
  const severity = message.severity === 2 ? FindingSeverity.High : FindingSeverity.Low
  const likelihood = message.severity === 2 ? 1 : 0.5
  const ruleId = isFatal ? 'eslint.parse-error' : `eslint.${message.ruleId ?? 'parse-error'}`
  const filePath = toPosixRelativePath(rootDir, absoluteFilePath)
  const lineNumber = message.line
  const columnNumber = message.column
  const id = `${ruleId}:${filePath}:${lineNumber}:${columnNumber}`

  return {
    id,
    ruleId,
    severity,
    message: message.message,
    filePath,
    lineNumber,
    columnNumber,
    likelihood,
    metadata: {
      ruleIdOriginal: message.ruleId ?? null,
      fatal: isFatal,
    },
  }
}

export class EsLintAnalyzer implements IAnalyzer {
  readonly id = 'eslint'

  async analyze(context: AnalysisContext): Promise<AnalyzerResult> {
    const startedAt = Date.now()

    try {
      const candidateFiles = context.files.filter((file) =>
        JS_FILE_EXTENSIONS.has(path.extname(file)),
      )

      if (candidateFiles.length === 0) {
        return {
          analyzer: this.id,
          status: 'passed',
          findings: [],
          durationMs: Date.now() - startedAt,
        }
      }

      const eslint = new ESLint({
        cwd: context.rootDir,
        overrideConfigFile: true,
        overrideConfig: FIXED_CONFIG_ARRAY,
      })

      const absoluteFiles = candidateFiles.map((file) => path.resolve(context.rootDir, file))
      const lintResults = await eslint.lintFiles(absoluteFiles)

      const findings = this.buildFindings(context.rootDir, lintResults)
      const status = findings.some((finding) => FAILED_SEVERITIES.has(finding.severity))
        ? 'failed'
        : 'passed'

      return {
        analyzer: this.id,
        status,
        findings,
        durationMs: Date.now() - startedAt,
      }
    } catch {
      return {
        analyzer: this.id,
        status: 'error',
        findings: [],
        durationMs: Date.now() - startedAt,
      }
    }
  }

  private buildFindings(rootDir: string, lintResults: ESLint.LintResult[]): Finding[] {
    const findings: Finding[] = []
    const seenKeys = new Set<string>()

    for (const lintResult of lintResults) {
      for (const message of lintResult.messages) {
        const finding = mapMessageToFinding(rootDir, lintResult.filePath, message)
        if (seenKeys.has(finding.id)) {
          continue
        }
        seenKeys.add(finding.id)
        findings.push(finding)
      }
    }

    return findings
  }
}
