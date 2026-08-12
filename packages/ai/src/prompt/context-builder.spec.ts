import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { FindingSeverity, LanguageId } from '@codexa/contracts'
import type { Finding } from '@codexa/analysis'
import { buildSuggestionContext } from './context-builder'
import { buildSuggestPrompt, SYSTEM_PROMPT_SUGGEST } from './prompt-templates'

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

describe('context-builder', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codexa-context-'))
    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true })
  })

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it('given a finding with a line number, then includes the surrounding code snippet', async () => {
    fs.writeFileSync(
      path.join(tempDir, 'src/math.ts'),
      ['const a = 1', 'const b = 2', 'const c = 3', 'const d = 4', 'const e = 5'].join('\n'),
    )

    const items = await buildSuggestionContext({
      rootDir: tempDir,
      findings: [finding({ lineNumber: 2 })],
      contextRadius: 1,
    })

    expect(items).toHaveLength(1)
    expect(items[0]?.code).toBe('const a = 1\nconst b = 2\nconst c = 3')
    expect(items[0]?.filePath).toBe('src/math.ts')
  })

  it('given a snippet not starting at line 1, then prefixes with an ellipsis', async () => {
    fs.writeFileSync(
      path.join(tempDir, 'src/math.ts'),
      ['const a = 1', 'const b = 2', 'const c = 3', 'const d = 4', 'const e = 5'].join('\n'),
    )

    const items = await buildSuggestionContext({
      rootDir: tempDir,
      findings: [finding({ lineNumber: 4 })],
      contextRadius: 1,
    })

    expect(items[0]?.code).toBe('…const c = 3\nconst d = 4\nconst e = 5')
  })

  it('given a finding without a line number, then omits the snippet', async () => {
    const items = await buildSuggestionContext({
      rootDir: tempDir,
      findings: [finding({ lineNumber: undefined })],
    })

    expect(items).toHaveLength(1)
    expect(items[0]?.code).toBeUndefined()
  })

  it('given a missing file, then omits the snippet gracefully', async () => {
    const items = await buildSuggestionContext({
      rootDir: tempDir,
      findings: [finding({ filePath: 'src/no-existe.ts', lineNumber: 1 })],
    })

    expect(items).toHaveLength(1)
    expect(items[0]?.code).toBeUndefined()
  })

  it('given code containing a secret, then sanitizes the snippet', async () => {
    fs.writeFileSync(
      path.join(tempDir, 'src/math.ts'),
      ['const apiKey = "sk-abcdefghijklmnopqrstuvwxyz123"'].join('\n'),
    )

    const items = await buildSuggestionContext({
      rootDir: tempDir,
      findings: [finding({ lineNumber: 1 })],
    })

    expect(items[0]?.code).toContain('[REDACTED]')
    expect(items[0]?.code).not.toContain('sk-abcdefghijklmnopqrstuvwxyz123')
  })

  it('given more context than the limit, then truncates items', async () => {
    const findings = Array.from({ length: 20 }, (_, index) =>
      finding({ id: `f${index}`, lineNumber: index + 1 }),
    )

    const items = await buildSuggestionContext({
      rootDir: tempDir,
      findings,
      maxItems: 20,
      maxContextChars: 400,
    })

    expect(items.length).toBeLessThan(20)
    expect(items.length).toBeGreaterThan(0)
  })

  it('given a message with a secret, then sanitizes the message', async () => {
    const items = await buildSuggestionContext({
      rootDir: tempDir,
      findings: [finding({ message: 'usa la clave ghp_1234567890abcdefghijklmnopqrstuvwx aquí' })],
    })

    expect(items[0]?.message).toContain('[REDACTED]')
  })
})

describe('prompt-templates', () => {
  it('given a repo context, then builds a prompt mentioning file and line', () => {
    const prompt = buildSuggestPrompt({
      repoName: 'demo',
      language: LanguageId.Typescript,
      healthScore: 70,
      items: [
        {
          id: 'f1',
          ruleId: 'dead-code',
          severity: FindingSeverity.High,
          message: 'Símbolo sin uso',
          filePath: 'src/math.ts',
          lineNumber: 5,
        },
      ],
    })

    expect(prompt).toContain('Repositorio: demo')
    expect(prompt).toContain('Health Score actual: 70')
    expect(prompt).toContain('src/math.ts:5')
    expect(prompt).toContain('Símbolo sin uso')
  })

  it('given the system prompt, then requires JSON-only output', () => {
    expect(SYSTEM_PROMPT_SUGGEST).toContain('{"suggestions": [ ... ]}')
    expect(SYSTEM_PROMPT_SUGGEST).toContain('máximo 5 sugerencias')
  })
})
