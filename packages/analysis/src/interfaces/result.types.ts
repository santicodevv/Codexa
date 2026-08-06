import type { FindingSeverity } from '@codexa/contracts'

export interface Finding {
  ruleId: string
  severity: FindingSeverity
  message: string
  filePath: string
  lineNumber?: number
  columnNumber?: number
  metadata?: Record<string, unknown>
}
