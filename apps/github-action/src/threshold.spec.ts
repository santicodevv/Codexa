import { shouldFailOnCritical } from './threshold'

describe('shouldFailOnCritical', () => {
  it('con umbral 0 (default), falla si hay al menos un crítico', () => {
    expect(shouldFailOnCritical(0, 0)).toBe(false)
    expect(shouldFailOnCritical(1, 0)).toBe(true)
  })

  it('con umbral > 0, falla solo al llegar o superar el umbral', () => {
    expect(shouldFailOnCritical(1, 2)).toBe(false)
    expect(shouldFailOnCritical(2, 2)).toBe(true)
    expect(shouldFailOnCritical(3, 2)).toBe(true)
  })
})
