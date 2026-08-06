import { FindingSeverity } from '@codexa/contracts'
import type { Finding } from '../interfaces/result.types'
import { calculateHealthScore } from './health-score-calculator'

function finding(severity: FindingSeverity): Finding {
  return {
    ruleId: 'TEST-001',
    severity,
    message: 'hallazgo de prueba',
    filePath: 'src/main.ts',
  }
}

describe('calculateHealthScore', () => {
  it('given no findings, then returns a perfect score', () => {
    const result = calculateHealthScore([])

    expect(result.score).toBe(100)
    expect(result.total).toBe(0)
  })

  it('given one critical finding, then the score is reduced', () => {
    const result = calculateHealthScore([finding(FindingSeverity.Critical)])

    expect(result.score).toBeLessThan(100)
    expect(result.critical).toBe(1)
    expect(result.total).toBe(1)
  })

  it('given many findings, then the score never goes below zero', () => {
    const manyFindings = Array.from({ length: 20 }, () => finding(FindingSeverity.Critical))
    const result = calculateHealthScore(manyFindings)

    expect(result.score).toBeGreaterThanOrEqual(0)
    expect(result.score).toBeLessThanOrEqual(100)
  })
})
