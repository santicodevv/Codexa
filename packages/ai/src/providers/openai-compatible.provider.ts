import type {
  ChatMessage,
  CompleteOptions,
  ILanguageModel,
  LanguageModelResponse,
} from '../interfaces/language-model.interface'
import type { ProviderConfig } from './provider.factory'

const DEFAULT_TIMEOUT_MS = 120_000

interface OpenAiResponse {
  choices: Array<{ message?: { content?: string | null } }>
  usage?: { prompt_tokens?: number; completion_tokens?: number }
}

/**
 * Adapter genérico para APIs compatibles con Chat Completions de OpenAI
 * (OpenAI, DeepSeek, Kimi, NVIDIA NIM y cualquier endpoint `openai-compatible`).
 * Configurable mediante `baseUrl` y modelos por defecto del preset.
 */
export class OpenAICompatibleProvider implements ILanguageModel {
  private readonly defaultModel: string

  constructor(
    private readonly config: ProviderConfig,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {
    if (config.apiKey === '') {
      throw new Error('LLM_API_KEY es requerido para el proveedor openai-compatible')
    }
    this.defaultModel = config.proModel
  }

  async complete(messages: ChatMessage[], options?: CompleteOptions): Promise<LanguageModelResponse> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)

    try {
      const response = await this.fetchImpl(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: options?.model ?? this.defaultModel,
          max_tokens: options?.maxTokens ?? 2048,
          messages,
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(
          `LLM API error ${response.status}: ${(await response.text()).slice(0, 500)}`,
        )
      }

      const data = (await response.json()) as OpenAiResponse
      const content = data.choices[0]?.message?.content ?? ''

      return {
        content,
        usage: {
          inputTokens: data.usage?.prompt_tokens ?? 0,
          outputTokens: data.usage?.completion_tokens ?? 0,
        },
      }
    } finally {
      clearTimeout(timeout)
    }
  }
}
