import { LlmProvider } from '@codexa/contracts'
import { getPreset } from './presets'

export interface ProviderEnvConfig {
  apiKey?: string
  baseUrl?: string
  miniModel?: string
  proModel?: string
}

export interface ProviderConfig {
  provider: LlmProvider
  apiKey: string
  baseUrl?: string
  miniModel: string
  proModel: string
}

export function createProviderConfig(
  provider: LlmProvider,
  env: ProviderEnvConfig,
): ProviderConfig {
  const preset = getPreset(provider)

  if (provider === LlmProvider.OpenaiCompatible) {
    if (env.baseUrl === undefined || env.baseUrl === '') {
      throw new Error('LLM_BASE_URL es requerido para el proveedor openai-compatible')
    }
    if (env.apiKey === undefined || env.apiKey === '') {
      throw new Error('LLM_API_KEY es requerido para el proveedor openai-compatible')
    }
  }

  return {
    provider,
    apiKey: env.apiKey ?? '',
    baseUrl: env.baseUrl ?? preset.baseUrl,
    miniModel: env.miniModel ?? preset.defaultMiniModel,
    proModel: env.proModel ?? preset.defaultProModel,
  }
}
