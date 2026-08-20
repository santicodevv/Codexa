import { randomUUID } from 'node:crypto'
import type { AiSuggestionDto } from '@codexa/contracts'
import { FindingSeverity } from '@codexa/contracts'
import type { Finding, RepoSummary } from '@codexa/analysis'
import type { ILanguageModel } from '../interfaces/language-model.interface'
import { buildSuggestionContext } from '../prompt/context-builder'
import { buildSuggestPrompt, SYSTEM_PROMPT_SUGGEST } from '../prompt/prompt-templates'
import { parseSuggestions, type SuggestionPayload } from './suggestion-schema'

const SEVERITY_RANK: Record<FindingSeverity, number> = {
  [FindingSeverity.Critical]: 4,
  [FindingSeverity.High]: 3,
  [FindingSeverity.Medium]: 2,
  [FindingSeverity.Low]: 1,
  [FindingSeverity.Info]: 0,
}

export interface AnalyzeAndSuggestInput {
  rootDir: string
  findings: Finding[]
  repoSummary: RepoSummary
  model: ILanguageModel
  modelName?: string
  minSeverity?: FindingSeverity
  maxCandidates?: number
  maxSuggestions?: number
  healthScore?: number
}

export interface AnalyzeAndSuggestResult {
  suggestions: AiSuggestionDto[]
  inputTokens: number
  outputTokens: number
  degraded: boolean
  candidatesConsidered: number
}

const DEFAULT_MIN_SEVERITY: FindingSeverity = FindingSeverity.High
const DEFAULT_MAX_CANDIDATES = 10
const DEFAULT_MAX_SUGGESTIONS = 5

function isAtLeastSeverity(severity: FindingSeverity, minSeverity: FindingSeverity): boolean {
  return SEVERITY_RANK[severity] >= SEVERITY_RANK[minSeverity]
}

function toSuggestionDto(payload: SuggestionPayload): AiSuggestionDto {
  return {
    id: `suggestion-${randomUUID()}`,
    type: payload.type,
    title: payload.title,
    description: payload.description,
    ...(payload.targetFile !== undefined ? { targetFile: payload.targetFile } : {}),
    ...(payload.targetLine !== undefined ? { targetLine: payload.targetLine } : {}),
    codeBlocks: payload.codeBlocks,
  }
}

/**
 * Pipeline `analyzeAndSuggest`: filtra hallazgos por severidad mínima, construye
 * el contexto sanitizado y pide al modelo sugerencias validadas con zod.
 * Ante cualquier error del proveedor o de validación, devuelve una auditoría
 * "degradada" (sin sugerencias) en lugar de lanzar una excepción.
 */
export async function analyzeAndSuggest(
  input: AnalyzeAndSuggestInput,
): Promise<AnalyzeAndSuggestResult> {
  const minSeverity = input.minSeverity ?? DEFAULT_MIN_SEVERITY
  const maxCandidates = input.maxCandidates ?? DEFAULT_MAX_CANDIDATES
  const maxSuggestions = input.maxSuggestions ?? DEFAULT_MAX_SUGGESTIONS

  const candidates = input.findings
    .filter((finding) => isAtLeastSeverity(finding.severity, minSeverity))
    .slice(0, maxCandidates)

  if (candidates.length === 0) {
    return { suggestions: [], inputTokens: 0, outputTokens: 0, degraded: false, candidatesConsidered: 0 }
  }

  try {
    const items = await buildSuggestionContext({
      rootDir: input.rootDir,
      findings: candidates,
    })

    const userPrompt = buildSuggestPrompt({
      repoName: input.repoSummary.name,
      language: input.repoSummary.language,
      healthScore: input.healthScore ?? 0,
      items,
    })

    const response = await input.model.complete(
      [
        { role: 'system', content: SYSTEM_PROMPT_SUGGEST },
        { role: 'user', content: userPrompt },
      ],
      input.modelName !== undefined ? { model: input.modelName } : undefined,
    )

    const payloads = parseSuggestions(response.content)
    const suggestions = payloads.slice(0, maxSuggestions).map(toSuggestionDto)

    return {
      suggestions,
      inputTokens: response.usage.inputTokens,
      outputTokens: response.usage.outputTokens,
      degraded: false,
      candidatesConsidered: candidates.length,
    }
  } catch {
    // Fallback: la auditoría se completa sin sugerencias de IA (degradada).
    return {
      suggestions: [],
      inputTokens: 0,
      outputTokens: 0,
      degraded: true,
      candidatesConsidered: candidates.length,
    }
  }
}
