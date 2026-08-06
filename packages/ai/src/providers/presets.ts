import { LlmProvider } from '@codexa/contracts'

export interface ProviderPreset {
  provider: LlmProvider
  displayName: string
  baseUrl?: string
  defaultMiniModel: string
  defaultProModel: string
}

export const PROVIDER_PRESETS: Record<LlmProvider, ProviderPreset> = {
  [LlmProvider.Anthropic]: {
    provider: LlmProvider.Anthropic,
    displayName: 'Anthropic',
    defaultMiniModel: 'claude-haiku-4-5',
    defaultProModel: 'claude-sonnet-4-5',
  },
  [LlmProvider.Openai]: {
    provider: LlmProvider.Openai,
    displayName: 'OpenAI',
    defaultMiniModel: 'gpt-4o-mini',
    defaultProModel: 'gpt-4o',
  },
  [LlmProvider.Gemini]: {
    provider: LlmProvider.Gemini,
    displayName: 'Google Gemini',
    defaultMiniModel: 'gemini-2.0-flash',
    defaultProModel: 'gemini-2.0-flash',
  },
  [LlmProvider.Deepseek]: {
    provider: LlmProvider.Deepseek,
    displayName: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    defaultMiniModel: 'deepseek-chat',
    defaultProModel: 'deepseek-reasoner',
  },
  [LlmProvider.Kimi]: {
    provider: LlmProvider.Kimi,
    displayName: 'Kimi (Moonshot AI)',
    baseUrl: 'https://api.moonshot.cn/v1',
    defaultMiniModel: 'kimi-k2',
    defaultProModel: 'kimi-k2',
  },
  [LlmProvider.Nvidia]: {
    provider: LlmProvider.Nvidia,
    displayName: 'NVIDIA NIM',
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    defaultMiniModel: 'meta/llama-3.1-8b-instruct',
    defaultProModel: 'deepseek-ai/deepseek-r1',
  },
  [LlmProvider.OpenaiCompatible]: {
    provider: LlmProvider.OpenaiCompatible,
    displayName: 'OpenAI-compatible',
    defaultMiniModel: '',
    defaultProModel: '',
  },
}

export function getPreset(provider: LlmProvider): ProviderPreset {
  const preset = PROVIDER_PRESETS[provider]
  if (preset === undefined) {
    throw new Error(`Proveedor LLM desconocido: ${provider}`)
  }
  return preset
}
