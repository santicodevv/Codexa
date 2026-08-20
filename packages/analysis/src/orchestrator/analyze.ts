import path from 'node:path'
import { FindingSeverity } from '@codexa/contracts'
import { defaultAnalyzers } from '../analyzers'
import { buildRepoSummary, collectSourceFiles, detectLanguage } from '../collectors/repo-collector'
import type { AnalysisContext, IAnalyzer } from '../interfaces/analyzer.interface'
import type { AnalysisReport, AnalyzerRunStatus, Finding } from '../interfaces/result.types'
import {
  calculateHealthScore,
  calculateSeverityCounts,
  estimateTechnicalDebtMinutes,
} from '../scoring/health-score-calculator'
import { unifyFindings } from './findings-unifier'

const SEVERITY_ORDER: Record<FindingSeverity, number> = {
  [FindingSeverity.Critical]: 4,
  [FindingSeverity.High]: 3,
  [FindingSeverity.Medium]: 2,
  [FindingSeverity.Low]: 1,
  [FindingSeverity.Info]: 0,
}

export interface RunAnalysisInput {
  rootDir: string
  analyzers?: IAnalyzer[]
}

function compareStrings(left: string, right: string): number {
  if (left < right) {
    return -1
  }
  if (left > right) {
    return 1
  }
  return 0
}

function compareOptionalLineNumbers(left: number | undefined, right: number | undefined): number {
  if (left === undefined && right === undefined) {
    return 0
  }
  if (left === undefined) {
    return 1
  }
  if (right === undefined) {
    return -1
  }
  return left - right
}

function sortFindings(findings: Finding[]): Finding[] {
  return [...findings].sort((left, right) => {
    const leftWeight = SEVERITY_ORDER[left.severity] ?? 0
    const rightWeight = SEVERITY_ORDER[right.severity] ?? 0
    if (leftWeight !== rightWeight) {
      return rightWeight - leftWeight
    }

    const filePathComparison = compareStrings(left.filePath, right.filePath)
    if (filePathComparison !== 0) {
      return filePathComparison
    }

    const lineNumberComparison = compareOptionalLineNumbers(left.lineNumber, right.lineNumber)
    if (lineNumberComparison !== 0) {
      return lineNumberComparison
    }

    const ruleIdComparison = compareStrings(left.ruleId, right.ruleId)
    if (ruleIdComparison !== 0) {
      return ruleIdComparison
    }

    return compareStrings(left.id, right.id)
  })
}

/**
 * Ejecuta la auditoría completa: recolecta archivos, detecta lenguaje, resume el
 * repositorio y ejecuta cada analizador tolerando fallos individuales.
 */
export async function runAnalysis(input: RunAnalysisInput): Promise<AnalysisReport> {
  const rootDir = path.resolve(input.rootDir)
  const files = await collectSourceFiles(rootDir)
  const language = detectLanguage(files)
  const summary = await buildRepoSummary(rootDir, files, language)
  const context: AnalysisContext = { rootDir, language, files }
  const analyzers = input.analyzers ?? defaultAnalyzers

  const start = Date.now()
  const findings: Finding[] = []
  const analyzerStatuses: AnalyzerRunStatus[] = []

  for (const analyzer of analyzers) {
    try {
      const result = await analyzer.analyze(context)
      analyzerStatuses.push({
        analyzer: analyzer.id,
        status: result.status,
        findingCount: result.findings.length,
        durationMs: result.durationMs,
      })
      if (result.status !== 'error') {
        findings.push(...result.findings)
      }
    } catch {
      analyzerStatuses.push({
        analyzer: analyzer.id,
        status: 'error',
        findingCount: 0,
        durationMs: 0,
      })
    }
  }

  const unifiedFindings = unifyFindings(findings)
  const sortedFindings = sortFindings(unifiedFindings)
  const durationMs = Date.now() - start

  return {
    summary,
    findings: sortedFindings,
    severityCounts: calculateSeverityCounts(sortedFindings),
    healthScore: calculateHealthScore(sortedFindings).score,
    technicalDebtMinutes: estimateTechnicalDebtMinutes(sortedFindings),
    durationMs,
    analyzerStatuses,
  }
}
