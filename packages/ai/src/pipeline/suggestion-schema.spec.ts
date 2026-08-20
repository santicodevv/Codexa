import { SuggestionType } from '@codexa/contracts'
import { extractJsonPayload, parseSuggestions } from './suggestion-schema'

describe('suggestion-schema', () => {
  const validPayload = {
    suggestions: [
      {
        type: SuggestionType.Refactor,
        title: 'Divide UserService',
        description: 'Extrae la lógica de pagos a un servicio propio.',
        targetFile: 'src/user.service.ts',
        targetLine: 42,
        codeBlocks: ['// antes', '// después'],
      },
    ],
  }

  it('given a valid JSON object, then parses suggestions with citations', () => {
    const suggestions = parseSuggestions(JSON.stringify(validPayload))

    expect(suggestions).toHaveLength(1)
    expect(suggestions[0]?.title).toBe('Divide UserService')
    expect(suggestions[0]?.targetFile).toBe('src/user.service.ts')
    expect(suggestions[0]?.targetLine).toBe(42)
    expect(suggestions[0]?.codeBlocks).toEqual(['// antes', '// después'])
  })

  it('given a response wrapped in json fences, then extracts the payload', () => {
    const fenced = `\`\`\`json\n${JSON.stringify(validPayload)}\n\`\`\``

    expect(parseSuggestions(fenced)).toHaveLength(1)
  })

  it('given a response with a top-level array, then accepts it', () => {
    const suggestions = parseSuggestions(JSON.stringify(validPayload.suggestions))

    expect(suggestions).toHaveLength(1)
  })

  it('given a missing suggestions field, then rejects', () => {
    expect(() => parseSuggestions('{"foo": 1}')).toThrow('no contiene el campo "suggestions"')
  })

  it('given malformed JSON, then rejects', () => {
    expect(() => parseSuggestions('esto no es json')).toThrow()
  })

  it('given an invalid suggestion type, then rejects', () => {
    const invalid = { suggestions: [{ type: 'magic', title: 'x', description: 'y' }] }

    expect(() => parseSuggestions(JSON.stringify(invalid))).toThrow()
  })

  it('given a suggestion missing required fields, then rejects', () => {
    const invalid = { suggestions: [{ type: SuggestionType.Refactor }] }

    expect(() => parseSuggestions(JSON.stringify(invalid))).toThrow()
  })

  it('given more than 5 suggestions, then rejects', () => {
    const tooMany = {
      suggestions: Array.from({ length: 6 }, () => ({
        type: SuggestionType.Refactor,
        title: 'x',
        description: 'y',
      })),
    }

    expect(() => parseSuggestions(JSON.stringify(tooMany))).toThrow()
  })

  it('given a negative targetLine, then rejects', () => {
    const invalid = {
      suggestions: [
        { type: SuggestionType.Refactor, title: 'x', description: 'y', targetLine: -3 },
      ],
    }

    expect(() => parseSuggestions(JSON.stringify(invalid))).toThrow()
  })

  it('given prose around a JSON object, then extracts the first object', () => {
    const noisy = `Aquí tienes:\n${JSON.stringify(validPayload)}\nSaludos.`

    expect(extractJsonPayload(noisy)).toEqual(validPayload)
  })
})
