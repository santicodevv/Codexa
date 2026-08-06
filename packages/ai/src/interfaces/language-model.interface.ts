import type { LlmProvider, ModelRole } from '@codexa/contracts'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ModelConfig {
  provider: LlmProvider
  apiKey: string
  baseUrl?: string
  model: string
  role: ModelRole
  temperature?: number
  maxTokens?: number
}

export interface LanguageModelUsage {
  inputTokens: number
  outputTokens: number
}

export interface LanguageModelResponse {
  content: string
  usage: LanguageModelUsage
}

export interface ILanguageModel {
  complete(messages: ChatMessage[]): Promise<LanguageModelResponse>
}
