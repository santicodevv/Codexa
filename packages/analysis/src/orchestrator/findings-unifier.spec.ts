import { FindingSeverity } from '@codexa/contracts'
import type { Finding } from '../interfaces/result.types'
import { unifyFindings } from './findings-unifier'

function finding(overrides: Partial<Finding> & { id: string }): Finding {
  return {
    ruleId: 'RULE-001',
    severity: FindingSeverity.Low,
    message: 'hallazgo duplicado',
    filePath: 'src/a.ts',
    lineNumber: 1,
    columnNumber: 2,
    likelihood: 1,
    ...overrides,
  }
}

describe('findings-unifier', () => {
  it('given two identical findings, then keeps only one with the highest likelihood', () => {
    const unified = unifyFindings([
      finding({ id: 'A', likelihood: 0.4 }),
      finding({ id: 'B', likelihood: 0.9 }),
    ])

    expect(unified).toHaveLength(1)
    expect(unified[0]?.id).toBe('A')
    expect(unified[0]?.likelihood).toBe(0.9)
  })

  it('given two identical findings, then merges the highest priority', () => {
    const unified = unifyFindings([
      finding({ id: 'A', priority: 1 }),
      finding({ id: 'B', priority: 5 }),
    ])

    expect(unified).toHaveLength(1)
    expect(unified[0]?.priority).toBe(5)
  })

  it('given findings in distinct locations, then keeps all of them', () => {
    const unified = unifyFindings([
      finding({ id: 'A', lineNumber: 1 }),
      finding({ id: 'B', lineNumber: 2 }),
      finding({ id: 'C', lineNumber: undefined }),
    ])

    expect(unified).toHaveLength(3)
  })

  it('given two findings at the same location with different rules, then keeps both', () => {
    const unified = unifyFindings([
      finding({ id: 'A', ruleId: 'dead-code' }),
      finding({ id: 'B', ruleId: 'eslint.eqeqeq' }),
    ])

    expect(unified).toHaveLength(2)
  })

  it('given two findings at the same location with different messages, then keeps both', () => {
    const unified = unifyFindings([
      finding({ id: 'A', message: 'mensaje uno' }),
      finding({ id: 'B', message: 'mensaje dos' }),
    ])

    expect(unified).toHaveLength(2)
  })

  it('given an empty list, then returns an empty list', () => {
    expect(unifyFindings([])).toEqual([])
  })
})
