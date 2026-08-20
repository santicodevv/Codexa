import { LlmProvider } from '@codexa/contracts'
import type { ProviderConfig } from '../providers/provider.factory'
import { createProviderConfig } from '../providers/provider.factory'

export interface LlmEnvironment {
  LLM_PROVIDER?: string
  LLM_API_KEY?: string
  ANTHROPIC_API_KEY?: string
  LLM_BASE_URL?: string
  LLM_MODEL_MINI?: string
  LLM_MODEL_PRO?: string
}

export const DEFAULT_PROVIDER: LlmProvider = LlmProvider.Anthropic

/**
 * Resuelve la configuración del proveedor LLM desde variables de entorno,
 * aplicando los presets por proveedor para baseUrl y modelos por defecto.
 */
export function resolveLlmConfig(env: LlmEnvironment): ProviderConfig {
  const rawProvider = env.LLM_PROVIDER ?? ''
  const provider = (rawProvider === '' ? DEFAULT_PROVIDER : rawProvider) as LlmProvider

  const apiKey = env.LLM_API_KEY ?? env.ANTHROPIC_API_KEY ?? ''

  return createProviderConfig(provider, {
    apiKey,
    baseUrl: env.LLM_BASE_URL,
    miniModel: env.LLM_MODEL_MINI,
    proModel: env.LLM_MODEL_PRO,
  })
}

/**
 * Indica si hay credenciales suficientes para llamar al proveedor configurado.
 */
export function hasLlmCredentials(env: LlmEnvironment): boolean {
  const apiKey = env.LLM_API_KEY ?? env.ANTHROPIC_API_KEY
  return apiKey !== undefined && apiKey.trim() !== ''
}
