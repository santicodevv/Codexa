import { SuggestionType } from '@codexa/contracts'
import { z } from 'zod'

const SUGGESTION_TYPES = [
  SuggestionType.Refactor,
  SuggestionType.Vulnerability,
  SuggestionType.Performance,
  SuggestionType.BestPractice,
] as const

export const SuggestionSchema = z.object({
  type: z.enum(SUGGESTION_TYPES),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(4000),
  targetFile: z.string().optional(),
  targetLine: z.number().int().positive().optional(),
  codeBlocks: z.array(z.string()).max(3).default([]),
})

export const SuggestionsSchema = z.object({
  suggestions: z.array(SuggestionSchema).max(5),
})

export type SuggestionPayload = z.infer<typeof SuggestionSchema>

/**
 * Extrae el primer objeto/array JSON válido del texto del modelo, tolerando
 * delimitadores de bloque tipo ```json.
 */
export function extractJsonPayload(raw: string): unknown {
  const withoutFences = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()

  try {
    return JSON.parse(withoutFences) as unknown
  } catch {
    // intento final: buscar el primer objeto JSON balanceado en el texto
    const start = raw.indexOf('{')
    const end = raw.lastIndexOf('}')
    if (start !== -1 && end > start) {
      return JSON.parse(raw.slice(start, end + 1)) as unknown
    }
    throw new Error('No se encontró un objeto JSON válido en la respuesta del modelo')
  }
}

export function parseSuggestions(raw: string): SuggestionPayload[] {
  const payload = extractJsonPayload(raw)

  const suggestions = Array.isArray(payload)
    ? payload
    : (payload as { suggestions?: unknown }).suggestions

  if (!Array.isArray(suggestions)) {
    throw new Error('La respuesta del modelo no contiene el campo "suggestions"')
  }

  return SuggestionsSchema.parse({ suggestions }).suggestions
}
