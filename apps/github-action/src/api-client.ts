import type { AiSuggestionDto, FindingDto } from '@codexa/contracts'

export interface RunCiAuditInput {
  ref?: string
  provider?: string
}

export interface CiAuditResult {
  id: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  commitSha: string | null
  healthScore: number | null
  severityCounts: { critical: number; medium: number; low: number }
  totalFindings: number | null
  estimatedDebtHours: number | null
  errorMessage: string | null
  findings: FindingDto[]
  suggestions: AiSuggestionDto[]
}

export class CodexaApiError extends Error {}

export class CodexaApiClient {
  constructor(
    private readonly apiUrl: string,
    private readonly apiKey: string,
  ) {}

  async runCiAudit(input: RunCiAuditInput): Promise<{ id: string; status: string }> {
    return this.request<{ id: string; status: string }>('POST', '/api/ci/audits', input)
  }

  async getCiAudit(auditId: string): Promise<CiAuditResult> {
    return this.request<CiAuditResult>('GET', `/api/ci/audits/${auditId}`)
  }

  async pollUntilFinished(
    auditId: string,
    options: { timeoutMs: number; intervalMs: number },
  ): Promise<CiAuditResult> {
    const deadline = Date.now() + options.timeoutMs
    for (;;) {
      const audit = await this.getCiAudit(auditId)
      if (audit.status === 'completed' || audit.status === 'failed') {
        return audit
      }
      if (Date.now() >= deadline) {
        throw new CodexaApiError(
          `Timeout esperando la auditoría ${auditId} (¿el worker de Codexa está corriendo?)`,
        )
      }
      await sleep(options.intervalMs)
    }
  }

  private async request<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
    const response = await fetch(`${this.apiUrl.replace(/\/$/, '')}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Codexa-Api-Key': this.apiKey,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      throw new CodexaApiError(`Codexa API ${method} ${path} -> ${response.status}: ${text}`)
    }

    return (await response.json()) as T
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
