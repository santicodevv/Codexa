import type { LanguageModelResponse } from '@codexa/ai'
import { LanguageId } from '@codexa/contracts'
import type { RepoSummary } from '@codexa/analysis'
import { runAiSuggestions } from './ai-suggestions'

jest.mock('@codexa/ai', () => ({
  hasLlmCredentials: jest.fn(),
  resolveLlmConfig: jest.fn().mockReturnValue({
    provider: 'deepseek',
    apiKey: 'key',
    baseUrl: 'https://api.deepseek.com/v1',
    miniModel: 'deepseek-chat',
    proModel: 'deepseek-reasoner',
  }),
  createLanguageModel: jest.fn().mockReturnValue({
    async complete(): Promise<LanguageModelResponse> {
      return { content: '{}', usage: { inputTokens: 1, outputTokens: 1 } }
    },
  }),
  analyzeAndSuggest: jest.fn().mockResolvedValue({
    suggestions: [],
    inputTokens: 0,
    outputTokens: 0,
    degraded: false,
    candidatesConsidered: 0,
  }),
}))

import { analyzeAndSuggest, hasLlmCredentials } from '@codexa/ai'

const analyzeAndSuggestMock = analyzeAndSuggest as jest.Mock
const hasLlmCredentialsMock = hasLlmCredentials as jest.Mock

const minimalSummary: RepoSummary = {
  name: 'demo',
  language: LanguageId.Typescript,
  fileCount: 1,
  dependencyCount: 0,
  analyzedAt: '2026-08-12T00:00:00.000Z',
}

describe('ai-suggestions', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('given no credentials, then skips the LLM and warns', async () => {
    hasLlmCredentialsMock.mockReturnValue(false)
    const stderrSpy = jest.spyOn(process.stderr, 'write').mockImplementation(() => true)

    const outcome = await runAiSuggestions({
      rootDir: '/tmp',
      findings: [],
      repoSummary: minimalSummary,
      healthScore: 50,
      provider: 'deepseek',
      env: {},
    })

    expect(outcome.skipped).toBe(true)
    expect(analyzeAndSuggestMock).not.toHaveBeenCalled()
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('LLM_API_KEY'))
  })

  it('given credentials, then runs the pipeline and returns suggestions', async () => {
    hasLlmCredentialsMock.mockReturnValue(true)
    analyzeAndSuggestMock.mockResolvedValue({
      suggestions: [{ id: 's1', type: 'refactor', title: 'Divide X', description: 'd', codeBlocks: [] }],
      inputTokens: 10,
      outputTokens: 4,
      degraded: false,
      candidatesConsidered: 2,
    })

    const outcome = await runAiSuggestions({
      rootDir: '/tmp',
      findings: [],
      repoSummary: minimalSummary,
      healthScore: 50,
      provider: 'deepseek',
      env: { LLM_API_KEY: 'key' },
    })

    expect(outcome.skipped).toBe(false)
    expect(outcome.degraded).toBe(false)
    expect(outcome.suggestions).toHaveLength(1)
    expect(analyzeAndSuggestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        rootDir: '/tmp',
        healthScore: 50,
        modelName: 'deepseek-reasoner',
      }),
    )
  })

  it('given a degraded pipeline result, then warns and keeps the report', async () => {
    hasLlmCredentialsMock.mockReturnValue(true)
    analyzeAndSuggestMock.mockResolvedValue({
      suggestions: [],
      inputTokens: 0,
      outputTokens: 0,
      degraded: true,
      candidatesConsidered: 2,
    })
    const stderrSpy = jest.spyOn(process.stderr, 'write').mockImplementation(() => true)

    const outcome = await runAiSuggestions({
      rootDir: '/tmp',
      findings: [],
      repoSummary: minimalSummary,
      healthScore: 50,
      provider: 'deepseek',
      env: { LLM_API_KEY: 'key' },
    })

    expect(outcome.degraded).toBe(true)
    expect(outcome.suggestions).toHaveLength(0)
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('falló'))
  })
})
