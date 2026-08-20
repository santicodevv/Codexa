import { LlmProvider } from '@codexa/contracts'
import type { ProviderConfig } from './provider.factory'
import { OpenAICompatibleProvider } from './openai-compatible.provider'

const CONFIG: ProviderConfig = {
  provider: LlmProvider.Deepseek,
  apiKey: 'test-key',
  baseUrl: 'https://api.deepseek.com/v1',
  miniModel: 'deepseek-chat',
  proModel: 'deepseek-reasoner',
}

describe('openai-compatible.provider', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('given a valid response, then returns content and usage', async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: 'sugerencia' } }],
          usage: { prompt_tokens: 20, completion_tokens: 8 },
        }),
        { status: 200 },
      ),
    )
    jest.spyOn(globalThis, 'fetch').mockImplementation(fetchMock)

    const provider = new OpenAICompatibleProvider(CONFIG)
    const result = await provider.complete(
      [{ role: 'system', content: 'sys' }, { role: 'user', content: 'usuario' }],
      { model: 'deepseek-chat', maxTokens: 512 },
    )

    expect(result.content).toBe('sugerencia')
    expect(result.usage).toEqual({ inputTokens: 20, outputTokens: 8 })

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://api.deepseek.com/v1/chat/completions')
    const headers = init.headers as Record<string, string>
    expect(headers.authorization).toBe('Bearer test-key')
    const body = JSON.parse(init.body as string) as Record<string, unknown>
    expect(body.model).toBe('deepseek-chat')
    expect(body.max_tokens).toBe(512)
    expect(body.messages).toHaveLength(2)
  })

  it('given an empty content choice, then returns an empty string', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ choices: [] }), { status: 200 }),
    )

    const provider = new OpenAICompatibleProvider(CONFIG)
    const result = await provider.complete([{ role: 'user', content: 'x' }])

    expect(result.content).toBe('')
  })

  it('given a non-ok response, then throws with status and body', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('invalid key', { status: 401 }))

    const provider = new OpenAICompatibleProvider(CONFIG)

    await expect(provider.complete([{ role: 'user', content: 'x' }])).rejects.toThrow(
      'LLM API error 401: invalid key',
    )
  })

  it('given an empty apiKey, then throws on construction', () => {
    expect(
      () => new OpenAICompatibleProvider({ ...CONFIG, apiKey: '' }),
    ).toThrow('LLM_API_KEY es requerido')
  })
})
