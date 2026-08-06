import { Result } from './result'

describe('Result', () => {
  it('given an ok value, when isOk, then returns true and getOrThrow returns the value', () => {
    const result = Result.ok(42)

    expect(result.isOk()).toBe(true)
    expect(result.getOrThrow()).toBe(42)
  })

  it('given an error, when isErr, then returns true and getOrThrow throws', () => {
    const result = Result.err<number>('boom')

    expect(result.isErr()).toBe(true)
    expect(() => result.getOrThrow()).toThrow('boom')
  })

  it('given an ok result, when map, then transforms the value', () => {
    const result = Result.ok(2).map((value) => value * 3)

    expect(result.getOrThrow()).toBe(6)
  })

  it('given an error result, when map, then propagates the error', () => {
    const result = Result.err<number, string>('boom').map((value) => value * 2)

    expect(result.isErr()).toBe(true)
    expect(result.getError()).toBe('boom')
  })
})
