/**
 * Elimina secretos y credenciales del texto antes de enviarlo a un LLM.
 * Aplicado a mensajes de hallazgos y snippets de código del prompt.
 */

const SECRET_PATTERNS: ReadonlyArray<RegExp> = [
  // claves por nombre de variable: api_key=..., secret: ..., token="..."
  // (captura el nombre y redacta solo el valor)
  /((?:api[_-]?key|apikey|access[_-]?key|secret|token|password|passwd|pwd|private[_-]?key|client[_-]?secret|auth[_-]?token)\s*[:=]\s*["']?)([^\s"',;)]+)/gi,
  // bloques de claves privadas
  /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z0-9 ]*PRIVATE KEY-----/g,
  /-----BEGIN (RSA|EC|OPENSSH|PGP) PRIVATE KEY BLOCK-----[\s\S]*?-----END (RSA|EC|OPENSSH|PGP) PRIVATE KEY BLOCK-----/g,
  // prefijos comunes de APIs: sk-, pk-, AKIA, AIza, GitHub, Slack
  /\b(?:sk|pk|rk)-[A-Za-z0-9_-]{12,}\b/g,
  /\bAKIA[A-Z0-9]{16}\b/g,
  /\bAIza[0-9A-Za-z_-]{30,}\b/g,
  /\bgithub_pat_[0-9A-Za-z_]{30,}\b/g,
  /\bgh[pousr]_[0-9A-Za-z]{30,}\b/g,
  /\bxox[baprs]-[0-9A-Za-z-]{10,}\b/g,
  // JWT
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
]

const REDACTED = '[REDACTED]'

export function sanitize(text: string): string {
  let result = text
  for (const pattern of SECRET_PATTERNS) {
    result = result.replace(pattern, (match, group?: string) =>
      typeof group === 'string' ? `${group}[REDACTED]` : REDACTED,
    )
  }
  return result
}

export function sanitizeUrl(url: string): string {
  return url.replace(/(https?:\/\/)([^/@:]+)(:[^/@]+)?@/, '$1$3@')
}

export function isSecretFree(text: string): boolean {
  return sanitize(text) === text
}
