import type { AiSuggestionDto } from '@codexa/contracts'
import type { Finding, RepoSummary } from '@codexa/analysis'
import {
  analyzeAndSuggest,
  createLanguageModel,
  hasLlmCredentials,
  resolveLlmConfig,
} from '@codexa/ai'

export interface RunAiSuggestionsOptions {
  rootDir: string
  findings: Finding[]
  repoSummary: RepoSummary
  healthScore: number
  provider: string
  apiKey?: string
  env?: NodeJS.ProcessEnv
}

export interface AiSuggestionsOutcome {
  suggestions: AiSuggestionDto[]
  skipped: boolean
  degraded: boolean
}

/**
 * Ejecuta el pipeline de sugerencias de IA para el reporte ya calculado.
 * Si no hay credenciales, omite la llamada (no falla la auditoría).
 */
export async function runAiSuggestions(options: RunAiSuggestionsOptions): Promise<AiSuggestionsOutcome> {
  let env = options.env ?? process.env

  if (options.apiKey !== undefined && options.apiKey !== '') {
    env = { ...env, LLM_API_KEY: options.apiKey }
  }

  if (!hasLlmCredentials(env)) {
    process.stderr.write(
      'Aviso: sin LLM_API_KEY o ANTHROPIC_API_KEY; omitiendo sugerencias de IA.\n',
    )
    return { suggestions: [], skipped: true, degraded: false }
  }

  const config = resolveLlmConfig({
    ...env,
    LLM_PROVIDER: options.provider,
  })

  try {
    const model = createLanguageModel(config)
    const result = await analyzeAndSuggest({
      rootDir: options.rootDir,
      findings: options.findings,
      repoSummary: options.repoSummary,
      healthScore: options.healthScore,
      model,
      modelName: config.proModel,
    })

    if (result.degraded) {
      process.stderr.write(
        'Aviso: el proveedor LLM falló; el reporte se completa sin sugerencias de IA.\n',
      )
    }

    return { suggestions: result.suggestions, skipped: false, degraded: result.degraded }
  } catch (error: unknown) {
    process.stderr.write(
      `Aviso: no se pudieron generar sugerencias de IA (${error instanceof Error ? error.message : String(error)}).\n`,
    )
    return { suggestions: [], skipped: false, degraded: true }
  }
}
