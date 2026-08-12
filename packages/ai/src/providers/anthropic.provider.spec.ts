import { LlmProvider } from '@codexa/contracts'
import type { ProviderConfig } from './provider.factory'
import { AnthropicProvider } from './anthropic.provider'

const CONFIG: ProviderConfig = {
  provider: LlmProvider.Anthropic,
  apiKey: 'test-key',
  baseUrl: 'https://api.anthropic.com/v1/messages',
  miniModel: 'claude-haiku-4-5',
  proModel: 'claude-sonnet-4-5',
}

describe('anthropic.provider', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('given a valid response, then returns the joined text content and usage', async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          content: [{ type: 'text', text: 'hola' }, { type: 'text', text: ' mundo' }],
          usage: { input_tokens: 10, output_tokens: 5 },
        }),
        { status: 200 },
      ),
    )
    jest.spyOn(globalThis, 'fetch').mockImplementation(fetchMock)

    const provider = new AnthropicProvider(CONFIG)
    const result = await provider.complete(
      [{ role: 'system', content: 'sistema' }, { role: 'user', content: 'usuario' }],
      { maxTokens: 100 },
    )

    expect(result.content).toBe('hola mundo')
    expect(result.usage).toEqual({ inputTokens: 10, outputTokens: 5 })

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://api.anthropic.com/v1/messages')
    expect(init.method).toBe('POST')
    const headers = init.headers as Record<string, string>
    expect(headers['x-api-key']).toBe('test-key')
    expect(headers['anthropic-version']).toBe('2023-06-01')
    const body = JSON.parse(init.body as string) as Record<string, unknown>
    expect(body.system).toBe('sistema')
    expect(body.max_tokens).toBe(100)
    expect(body.model).toBe('claude-sonnet-4-5')
    expect(body.messages).toEqual([{ role: 'user', content: 'usuario' }])
  })

  it('given a non-ok response, then throws with status and body', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('rate limit', { status: 429 }),
    )

    const provider = new AnthropicProvider(CONFIG)

    await expect(provider.complete([{ role: 'user', content: 'x' }])).rejects.toThrow(
      'Anthropic API error 429: rate limit',
    )
  })

  it('given a custom baseUrl, then calls that endpoint', async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ content: [], usage: { input_tokens: 0, output_tokens: 0 } }), {
        status: 200,
      }),
    )
    jest.spyOn(globalThis, 'fetch').mockImplementation(fetchMock)

    const provider = new AnthropicProvider({ ...CONFIG, baseUrl: 'https://proxy.local' })
    await provider.complete([{ role: 'user', content: 'x' }])

    expect(fetchMock).toHaveBeenCalledWith(
      'https://proxy.local',
      expect.objectContaining({ method: 'POST' }),
    )
  })
})
