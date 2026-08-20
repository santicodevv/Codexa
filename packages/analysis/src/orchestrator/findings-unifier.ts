import type { Finding } from '../interfaces/result.types'

/**
 * Unifica y deduplica hallazgos de todos los analizadores.
 *
 * Clave de duplicado: ruleId + filePath + línea + columna + mensaje.
 * Si dos hallazgos coinciden, se conserva el de mayor `likelihood`/`priority`
 * (en caso de empate, el primero). Hallazgos distintos en la misma ubicación
 * (p. ej. reglas diferentes) se conservan por separado.
 */
export function unifyFindings(findings: Finding[]): Finding[] {
  const unified = new Map<string, Finding>()

  for (const finding of findings) {
    const key = buildFindingKey(finding)
    const existing = unified.get(key)

    if (existing === undefined) {
      unified.set(key, { ...finding })
      continue
    }

    existing.likelihood = Math.max(existing.likelihood, finding.likelihood)
    existing.priority = Math.max(existing.priority ?? 0, finding.priority ?? 0)
  }

  return [...unified.values()]
}

function buildFindingKey(finding: Finding): string {
  return [
    finding.ruleId,
    finding.filePath,
    finding.lineNumber ?? -1,
    finding.columnNumber ?? -1,
    finding.message,
  ].join('|')
}
