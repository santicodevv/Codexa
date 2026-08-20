import path from 'node:path'
import { FindingSeverity, LanguageId, SuggestionType } from '@codexa/contracts'
import type { Finding, RepoSummary } from '@codexa/analysis'
import type { ILanguageModel, LanguageModelResponse } from '../interfaces/language-model.interface'
import { analyzeAndSuggest } from './analyze-and-suggest'

const ROOT_DIR = path.resolve(process.cwd(), 'tools/fixtures/ts-basic')

const SUMMARY: RepoSummary = {
  name: 'ts-basic',
  language: LanguageId.Typescript,
  fileCount: 5,
  dependencyCount: 0,
  analyzedAt: '2026-08-12T00:00:00.000Z',
}

function finding(overrides: Partial<Finding>): Finding {
  return {
    id: 'f1',
    ruleId: 'dead-code',
    severity: FindingSeverity.High,
    message: 'Símbolo sin uso',
    filePath: 'src/math.ts',
    lineNumber: 5,
    likelihood: 1,
    ...overrides,
  }
}

class FakeModel implements ILanguageModel {
  calls = 0

  constructor(private readonly response: string) {}

  async complete(): Promise<LanguageModelResponse> {
    this.calls += 1
    return { content: this.response, usage: { inputTokens: 50, outputTokens: 10 } }
  }
}

const VALID_RESPONSE = JSON.stringify({
  suggestions: [
    {
      type: SuggestionType.Refactor,
      title: 'Extrae la lógica de pagos',
      description: 'El método mezcla responsabilidades; extrae el pago a un servicio propio.',
      targetFile: 'src/math.ts',
      targetLine: 5,
      codeBlocks: ['export function add(a, b) { return a + b }'],
    },
  ],
})

describe('analyzeAndSuggest', () => {
  it('given findings at or above minSeverity, then returns suggestions with citations', async () => {
    const model = new FakeModel(VALID_RESPONSE)

    const result = await analyzeAndSuggest({
      rootDir: ROOT_DIR,
      findings: [
        finding({ severity: FindingSeverity.High, lineNumber: 15 }),
        finding({ severity: FindingSeverity.Low, lineNumber: 2 }),
      ],
      repoSummary: SUMMARY,
      model,
    })

    expect(model.calls).toBe(1)
    expect(result.degraded).toBe(false)
    expect(result.suggestions).toHaveLength(1)
    expect(result.suggestions[0]?.type).toBe(SuggestionType.Refactor)
    expect(result.suggestions[0]?.targetFile).toBe('src/math.ts')
    expect(result.suggestions[0]?.targetLine).toBe(5)
    expect(result.suggestions[0]?.codeBlocks).toHaveLength(1)
    expect(result.inputTokens).toBe(50)
  })

  it('given only low severity findings, then skips the LLM call', async () => {
    const model = new FakeModel(VALID_RESPONSE)

    const result = await analyzeAndSuggest({
      rootDir: ROOT_DIR,
      findings: [finding({ severity: FindingSeverity.Low })],
      repoSummary: SUMMARY,
      model,
    })

    expect(model.calls).toBe(0)
    expect(result.suggestions).toHaveLength(0)
    expect(result.degraded).toBe(false)
  })

  it('given no findings, then returns empty without calling the model', async () => {
    const model = new FakeModel(VALID_RESPONSE)

    const result = await analyzeAndSuggest({
      rootDir: ROOT_DIR,
      findings: [],
      repoSummary: SUMMARY,
      model,
    })

    expect(model.calls).toBe(0)
    expect(result.suggestions).toHaveLength(0)
  })

  it('given an invalid JSON response, then degrades without suggestions', async () => {
    const model = new FakeModel('lo siento, no puedo responder')

    const result = await analyzeAndSuggest({
      rootDir: ROOT_DIR,
      findings: [finding({})],
      repoSummary: SUMMARY,
      model,
    })

    expect(result.degraded).toBe(true)
    expect(result.suggestions).toHaveLength(0)
  })

  it('given a model that throws, then degrades without suggestions', async () => {
    const throwingModel: ILanguageModel = {
      async complete() {
        throw new Error('timeout')
      },
    }

    const result = await analyzeAndSuggest({
      rootDir: ROOT_DIR,
      findings: [finding({})],
      repoSummary: SUMMARY,
      model: throwingModel,
    })

    expect(result.degraded).toBe(true)
    expect(result.suggestions).toHaveLength(0)
  })

  it('given a model response with code fences, then still parses', async () => {
    const model = new FakeModel(`\`\`\`json\n${VALID_RESPONSE}\n\`\`\``)

    const result = await analyzeAndSuggest({
      rootDir: ROOT_DIR,
      findings: [finding({})],
      repoSummary: SUMMARY,
      model,
    })

    expect(result.degraded).toBe(false)
    expect(result.suggestions).toHaveLength(1)
  })

  it('given more suggestions than the limit, then caps them', async () => {
    const many = {
      suggestions: Array.from({ length: 7 }, (_, index) => ({
        type: SuggestionType.Refactor,
        title: `Sugerencia ${index}`,
        description: 'desc',
      })),
    }
    const model = new FakeModel(JSON.stringify(many))

    const result = await analyzeAndSuggest({
      rootDir: ROOT_DIR,
      findings: [finding({})],
      repoSummary: SUMMARY,
      model,
    })

    expect(result.suggestions.length).toBeLessThanOrEqual(5)
  })

  it('given many candidates, then caps them to maxCandidates', async () => {
    const model = new FakeModel(VALID_RESPONSE)
    const findings = Array.from({ length: 20 }, (_, index) =>
      finding({ id: `f${index}`, lineNumber: index + 1 }),
    )

    const result = await analyzeAndSuggest({
      rootDir: ROOT_DIR,
      findings,
      repoSummary: SUMMARY,
      model,
    })

    expect(result.candidatesConsidered).toBeLessThanOrEqual(10)
  })

  it('given a missing code file, then still builds the prompt without snippet', async () => {
    const model = new FakeModel(VALID_RESPONSE)

    const result = await analyzeAndSuggest({
      rootDir: ROOT_DIR,
      findings: [finding({ filePath: 'src/no-existe.ts' })],
      repoSummary: SUMMARY,
      model,
    })

    expect(result.degraded).toBe(false)
    expect(result.suggestions).toHaveLength(1)
  })
})
