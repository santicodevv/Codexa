import { isSecretFree, sanitize } from './sanitizer'

describe('sanitizer', () => {
  it('given a line with an api key assignment, then redacts the key value', () => {
    expect(sanitize('const apiKey = "sk-abcdefghijklmnop1234567890"')).toBe(
      'const apiKey = "[REDACTED]"',
    )
  })

  it('given a line with a token env assignment, then redacts the value', () => {
    expect(sanitize('DATABASE_TOKEN=super-secret-value-12345')).toBe(
      'DATABASE_TOKEN=[REDACTED]',
    )
  })

  it('given a password in an object literal, then redacts it', () => {
    expect(sanitize('{ password: "hunter2-secret", user: "admin" }')).toBe(
      '{ password: "[REDACTED]", user: "admin" }',
    )
  })

  it('given an AWS access key, then redacts it', () => {
    expect(sanitize('awsKey = AKIAIOSFODNN7EXAMPLE')).toBe('awsKey = [REDACTED]')
  })

  it('given a Google API key, then redacts it', () => {
    expect(sanitize('key=AIzaSyA1234567890abcdefghijklmnopqrstuvwx')).toBe('key=[REDACTED]')
  })

  it('given a GitHub PAT, then redacts it', () => {
    expect(sanitize('token=github_pat_11ABCxyz4567890abcdefghijklmnopqrstuvwxyz')).toBe(
      'token=[REDACTED]',
    )
  })

  it('given a JWT, then redacts it', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U'
    expect(sanitize(`Authorization: Bearer ${jwt}`)).toBe('Authorization: Bearer [REDACTED]')
  })

  it('given an RSA private key block, then redacts it entirely', () => {
    const block =
      '-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA\nsecret-material\n-----END RSA PRIVATE KEY-----'
    expect(sanitize(block)).toBe('[REDACTED]')
  })

  it('given a generic ssh key prefix, then redacts it', () => {
    expect(sanitize('sk-ant-abcdefghijklmnopqrstuvwxyz012345')).toBe('[REDACTED]')
  })

  it('given a plain code snippet without secrets, then leaves it untouched', () => {
    const code = 'export function add(a: number, b: number): number { return a + b }'
    expect(sanitize(code)).toBe(code)
  })

  it('given an already redacted text, then isSecretFree returns true', () => {
    expect(isSecretFree('password = "[REDACTED]"')).toBe(true)
  })

  it('given a text with a live secret, then isSecretFree returns false', () => {
    expect(isSecretFree('const token = "ghp_1234567890abcdefghijklmnopqrstuvwx"')).toBe(false)
  })
})
