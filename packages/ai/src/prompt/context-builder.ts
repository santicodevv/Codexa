import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { Finding } from '@codexa/analysis'
import { sanitize } from '../sanitize/sanitizer'

export interface ContextItem {
  id: string
  ruleId: string
  severity: string
  message: string
  filePath: string
  lineNumber?: number
  code?: string
}

export interface BuildContextInput {
  rootDir: string
  findings: Finding[]
  maxItems?: number
  contextRadius?: number
  maxContextChars?: number
}

const DEFAULT_MAX_ITEMS = 10
const DEFAULT_CONTEXT_RADIUS = 5
const DEFAULT_MAX_CONTEXT_CHARS = 8000

async function readCodeSnippet(
  rootDir: string,
  filePath: string,
  lineNumber: number | undefined,
  radius: number,
): Promise<string | undefined> {
  if (lineNumber === undefined) {
    return undefined
  }
  try {
    const fullText = await fs.readFile(path.join(rootDir, filePath), 'utf8')
    const lines = fullText.split(/\r?\n/)
    const start = Math.max(0, lineNumber - 1 - radius)
    const end = Math.min(lines.length, lineNumber + radius)
    const snippetLines = lines.slice(start, end)
    const prefix = start > 0 ? '…' : ''
    return `${prefix}${snippetLines.join('\n')}`
  } catch {
    return undefined
  }
}

/**
 * Construye el contexto compacto para el prompt: por cada hallazgo incluye el
 * snippet de código relevante (sanitizado) y limita el tamaño total.
 */
export async function buildSuggestionContext(input: BuildContextInput): Promise<ContextItem[]> {
  const maxItems = input.maxItems ?? DEFAULT_MAX_ITEMS
  const radius = input.contextRadius ?? DEFAULT_CONTEXT_RADIUS
  const maxChars = input.maxContextChars ?? DEFAULT_MAX_CONTEXT_CHARS
  const items: ContextItem[] = []

  for (const finding of input.findings.slice(0, maxItems)) {
    const code = await readCodeSnippet(input.rootDir, finding.filePath, finding.lineNumber, radius)
    const item: ContextItem = {
      id: finding.id,
      ruleId: finding.ruleId,
      severity: finding.severity,
      message: sanitize(finding.message),
      filePath: finding.filePath,
      ...(finding.lineNumber !== undefined ? { lineNumber: finding.lineNumber } : {}),
      ...(code !== undefined ? { code: sanitize(code) } : {}),
    }
    items.push(item)
  }

  let totalChars = 0
  const limited: ContextItem[] = []
  for (const item of items) {
    const itemChars = JSON.stringify(item).length
    if (totalChars + itemChars > maxChars) {
      break
    }
    totalChars += itemChars
    limited.push(item)
  }
  return limited
}
