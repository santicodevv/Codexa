import type { LanguageId } from '@codexa/contracts'
import type { Finding } from './result.types'

export interface AnalysisContext {
  rootDir: string
  language: LanguageId
  files: string[]
}

export interface AnalyzerResult {
  analyzer: string
  status: 'passed' | 'failed' | 'error'
  findings: Finding[]
  durationMs: number
}

export interface IAnalyzer {
  readonly id: string
  analyze(context: AnalysisContext): Promise<AnalyzerResult>
}
