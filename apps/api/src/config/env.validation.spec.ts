import { validateEnv } from './env.validation'

const validEnv = {
  DATABASE_URL: 'postgresql://codexa:codexa@localhost:5432/codexa',
  REDIS_URL: 'redis://localhost:6379',
  JWT_SECRET: 'x'.repeat(32),
}

describe('validateEnv', () => {
  it('given a valid env, then returns the normalized config', () => {
    const result = validateEnv(validEnv)

    expect(result.JWT_SECRET).toBe('x'.repeat(32))
    expect(result.NODE_ENV).toBe('development')
    expect(result.PORT).toBe(3001)
  })

  it('given a missing DATABASE_URL, then throws', () => {
    const env = { REDIS_URL: validEnv.REDIS_URL, JWT_SECRET: validEnv.JWT_SECRET }

    expect(() => validateEnv(env)).toThrow('Configuración inválida')
  })

  it('given a short JWT_SECRET, then throws', () => {
    expect(() => validateEnv({ ...validEnv, JWT_SECRET: 'short' })).toThrow()
  })

  it('given an empty LLM_BASE_URL, then accepts it as unset', () => {
    const result = validateEnv({ ...validEnv, LLM_BASE_URL: '' })

    expect(result.LLM_BASE_URL).toBe('')
  })
})
