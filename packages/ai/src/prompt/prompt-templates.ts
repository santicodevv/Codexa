import type { LanguageId } from '@codexa/contracts'
import type { ContextItem } from './context-builder'

export const SYSTEM_PROMPT_SUGGEST = `Eres un ingeniero de software senior experto en refactorización de código.

Te entrego hallazgos de una auditoría estática con su código fuente relevante. Debes generar
sugerencias de mejora accionables, concretas y priorizadas.

Reglas estrictas:
1. Responde ÚNICAMENTE con un objeto JSON válido, sin texto adicional ni bloques de código
   con triple comilla. Formato: {"suggestions": [ ... ]}
2. Cada sugerencia tiene: type ("refactor" | "vulnerability" | "performance" | "best-practice"),
   title (máximo 12 palabras), description (explica el problema y la solución en 2-4 frases),
   targetFile (ruta relativa del archivo afectado), targetLine (número de línea, si aplica) y
   codeBlocks (máximo 2 bloques de código de ejemplo: antes/después, sin delimitadores de bloque).
3. Genera como máximo 5 sugerencias. Prioriza las de severidad más alta.
4. No inventes archivos ni líneas que no estén en el contexto.
5. No incluyas secretos, claves ni datos personales en el texto.`

export interface SuggestPromptInput {
  repoName: string
  language: LanguageId
  healthScore: number
  items: ContextItem[]
}

function formatItem(item: ContextItem): string {
  const lines: string[] = [
    `- [${item.severity}] ${item.ruleId} ${item.filePath}${item.lineNumber !== undefined ? `:${item.lineNumber}` : ''}`,
    `  mensaje: ${item.message}`,
  ]
  if (item.code !== undefined) {
    lines.push(`  código:\n${indent(item.code, 4)}`)
  }
  return lines.join('\n')
}

function indent(text: string, spaces: number): string {
  const prefix = ' '.repeat(spaces)
  return text
    .split('\n')
    .map((line) => `${prefix}${line}`)
    .join('\n')
}

export function buildSuggestPrompt(input: SuggestPromptInput): string {
  const items = input.items.map(formatItem).join('\n')
  return [
    `Repositorio: ${input.repoName}`,
    `Lenguaje principal: ${input.language}`,
    `Health Score actual: ${input.healthScore}`,
    '',
    'Hallazgos con contexto:',
    items,
    '',
    'Genera las sugerencias siguiendo el contrato JSON. Para cada hallazgo propone un fix',
    'específico citando archivo y línea reales.',
  ].join('\n')
}
