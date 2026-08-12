import { LlmProvider } from '@codexa/contracts'
import { hasLlmCredentials, resolveLlmConfig } from './llm-config'

describe('llm-config', () => {
  it('given no LLM_PROVIDER, then defaults to anthropic', () => {
    const config = resolveLlmConfig({ LLM_API_KEY: 'key' })

    expect(config.provider).toBe(LlmProvider.Anthropic)
    expect(config.proModel).toBe('claude-sonnet-4-5')
  })

  it('given deepseek with no baseUrl, then uses the preset baseUrl', () => {
    const config = resolveLlmConfig({ LLM_PROVIDER: 'deepseek', LLM_API_KEY: 'key' })

    expect(config.baseUrl).toBe('https://api.deepseek.com/v1')
    expect(config.proModel).toBe('deepseek-reasoner')
  })

  it('given openai-compatible without baseUrl, then throws', () => {
    expect(() => resolveLlmConfig({ LLM_PROVIDER: 'openai-compatible', LLM_API_KEY: 'key' })).toThrow(
      'LLM_BASE_URL es requerido',
    )
  })

  it('given explicit model overrides, then applies them', () => {
    const config = resolveLlmConfig({
      LLM_PROVIDER: 'deepseek',
      LLM_API_KEY: 'key',
      LLM_MODEL_MINI: 'mi-mini',
      LLM_MODEL_PRO: 'mi-pro',
    })

    expect(config.miniModel).toBe('mi-mini')
    expect(config.proModel).toBe('mi-pro')
  })

  it('given ANTHROPIC_API_KEY only, then uses it as apiKey', () => {
    const config = resolveLlmConfig({ ANTHROPIC_API_KEY: 'anthropic-key' })

    expect(config.apiKey).toBe('anthropic-key')
  })

  it('given no keys at all, then hasLlmCredentials is false', () => {
    expect(hasLlmCredentials({})).toBe(false)
  })

  it('given any key, then hasLlmCredentials is true', () => {
    expect(hasLlmCredentials({ ANTHROPIC_API_KEY: 'x' })).toBe(true)
    expect(hasLlmCredentials({ LLM_API_KEY: 'x' })).toBe(true)
  })
})
