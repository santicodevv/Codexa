import { LlmProvider } from '@codexa/contracts'
import type { ILanguageModel } from '../interfaces/language-model.interface'
import { AnthropicProvider } from './anthropic.provider'
import { OpenAICompatibleProvider } from './openai-compatible.provider'
import type { ProviderConfig } from './provider.factory'

/**
 * Registro de proveedores: los adapters OpenAI-compatible cubren OpenAI,
 * DeepSeek, Kimi, NVIDIA NIM y cualquier endpoint compatible.
 */
export function createLanguageModel(config: ProviderConfig): ILanguageModel {
  switch (config.provider) {
    case LlmProvider.Anthropic:
      return new AnthropicProvider(config)
    case LlmProvider.Openai:
    case LlmProvider.Deepseek:
    case LlmProvider.Kimi:
    case LlmProvider.Nvidia:
    case LlmProvider.OpenaiCompatible:
      return new OpenAICompatibleProvider(config)
    case LlmProvider.Gemini:
      throw new Error('El proveedor Gemini aún no está implementado en el CLI')
    default:
      throw new Error(`Proveedor LLM desconocido: ${config.provider}`)
  }
}
