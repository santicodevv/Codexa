import type {
  ChatMessage,
  CompleteOptions,
  ILanguageModel,
  LanguageModelResponse,
} from '../interfaces/language-model.interface'
import type { ProviderConfig } from './provider.factory'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_VERSION = '2023-06-01'
const DEFAULT_TIMEOUT_MS = 120_000

interface AnthropicTextBlock {
  type: 'text'
  text: string
}

interface AnthropicResponse {
  content: AnthropicTextBlock[]
  usage: { input_tokens: number; output_tokens: number }
}

/**
 * Adapter nativo de Anthropic (Messages API) implementado con fetch para no
 * añadir dependencias de SDK. Espera credenciales vía `apiKey`.
 */
export class AnthropicProvider implements ILanguageModel {
  private readonly apiUrl: string
  private readonly defaultModel: string

  constructor(
    private readonly config: ProviderConfig,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {
    this.apiUrl =
      config.baseUrl !== undefined && config.baseUrl !== ''
        ? config.baseUrl
        : ANTHROPIC_API_URL
    this.defaultModel = config.proModel
  }

  async complete(messages: ChatMessage[], options?: CompleteOptions): Promise<LanguageModelResponse> {
    const systemMessages = messages.filter((message) => message.role === 'system')
    const chatMessages = messages.filter((message) => message.role !== 'system')
    const system = systemMessages.map((message) => message.content).join('\n')

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)

    try {
      const response = await this.fetchImpl(this.apiUrl, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': this.config.apiKey,
          'anthropic-version': ANTHROPIC_VERSION,
        },
        body: JSON.stringify({
          model: options?.model ?? this.defaultModel,
          max_tokens: options?.maxTokens ?? 2048,
          ...(system.length > 0 ? { system } : {}),
          messages: chatMessages,
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(
          `Anthropic API error ${response.status}: ${(await response.text()).slice(0, 500)}`,
        )
      }

      const data = (await response.json()) as AnthropicResponse
      const content = data.content
        .map((block) => (block.type === 'text' ? block.text : ''))
        .join('')

      return {
        content,
        usage: {
          inputTokens: data.usage.input_tokens,
          outputTokens: data.usage.output_tokens,
        },
      }
    } finally {
      clearTimeout(timeout)
    }
  }
}
