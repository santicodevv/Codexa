import { LlmProvider } from '@codexa/contracts'
import { getPreset } from './presets'
import { createProviderConfig } from './provider.factory'

describe('provider presets', () => {
  it('given deepseek, then resolves its base URL and default models', () => {
    const preset = getPreset(LlmProvider.Deepseek)

    expect(preset.baseUrl).toBe('https://api.deepseek.com/v1')
    expect(preset.defaultMiniModel).toBe('deepseek-chat')
    expect(preset.defaultProModel).toBe('deepseek-reasoner')
  })

  it('given kimi, then resolves its base URL', () => {
    expect(getPreset(LlmProvider.Kimi).baseUrl).toBe('https://api.moonshot.cn/v1')
  })

  it('given nvidia, then resolves its default free models', () => {
    const preset = getPreset(LlmProvider.Nvidia)

    expect(preset.baseUrl).toBe('https://integrate.api.nvidia.com/v1')
    expect(preset.defaultMiniModel).toBe('meta/llama-3.1-8b-instruct')
  })

  it('given an unknown provider string, then throws', () => {
    expect(() => getPreset('unknown' as LlmProvider)).toThrow('Proveedor LLM desconocido')
  })
})

describe('createProviderConfig', () => {
  it('given openai-compatible without base URL, then throws', () => {
    expect(() => createProviderConfig(LlmProvider.OpenaiCompatible, { apiKey: 'key' })).toThrow(
      'LLM_BASE_URL',
    )
  })

  it('given openai-compatible with env overrides, then applies them', () => {
    const config = createProviderConfig(LlmProvider.OpenaiCompatible, {
      apiKey: 'key',
      baseUrl: 'https://gateway.local/v1',
      miniModel: 'custom-mini',
    })

    expect(config.baseUrl).toBe('https://gateway.local/v1')
    expect(config.miniModel).toBe('custom-mini')
    expect(config.proModel).toBe('')
  })
})
