import type { IAnalyzer } from '../interfaces/analyzer.interface'
import { CyclomaticComplexityAnalyzer } from './cyclomatic-complexity.analyzer'
import { DeadCodeAnalyzer } from './dead-code.analyzer'
import { EsLintAnalyzer } from './eslint.analyzer'
import { NpmAuditAnalyzer } from './npm-audit.analyzer'
import { UntestedFunctionsAnalyzer } from './untested-functions.analyzer'

export const defaultAnalyzers: IAnalyzer[] = [
  new DeadCodeAnalyzer(),
  new CyclomaticComplexityAnalyzer(),
  new EsLintAnalyzer(),
  new NpmAuditAnalyzer(),
  new UntestedFunctionsAnalyzer(),
]
