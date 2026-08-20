/**
 * `fail-on-critical` (docs/13-GitHub-Integration.md §3): "Fallar si hay críticos ≥ umbral
 * (default 0 = siempre fallar con críticos)". Con umbral 0 la falla es "hay al menos un
 * crítico", no "criticalCount >= 0" (que sería siempre true): por eso se exige además
 * criticalCount > 0.
 */
export function shouldFailOnCritical(criticalCount: number, threshold: number): boolean {
  return criticalCount > 0 && criticalCount >= threshold
}
