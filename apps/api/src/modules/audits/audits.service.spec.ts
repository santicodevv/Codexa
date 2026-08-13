import { NotFoundException } from '@nestjs/common'
import type { ConfigService } from '@nestjs/config'
import { AuditStatus } from '@codexa/contracts'
import type { PrismaService } from '../../common/prisma/prisma.service'
import { AuditsService } from './audits.service'

jest.mock('@codexa/analysis', () => ({
  runAnalysis: jest.fn(),
}))

jest.mock('@codexa/ai', () => ({
  analyzeAndSuggest: jest.fn(),
  createLanguageModel: jest.fn(),
  hasLlmCredentials: jest.fn(),
  resolveLlmConfig: jest.fn(),
}))

import { runAnalysis } from '@codexa/analysis'
import { hasLlmCredentials, resolveLlmConfig } from '@codexa/ai'

const sampleReport = {
  summary: { name: 'demo', language: 'typescript', fileCount: 1, dependencyCount: 0, analyzedAt: 'x' },
  findings: [
    {
      id: 'f1',
      ruleId: 'dead-code',
      severity: 'low',
      message: 'unused symbol',
      filePath: 'src/a.ts',
      lineNumber: 3,
      likelihood: 1,
    },
  ],
  severityCounts: { critical: 0, high: 0, medium: 0, low: 1, info: 0 },
  healthScore: 80,
  technicalDebtMinutes: 30,
  durationMs: 120,
  analyzerStatuses: [],
}

describe('AuditsService', () => {
  function buildService(overrides: Partial<Record<string, unknown>> = {}) {
    const prisma = {
      repository: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      audit: {
        create: jest.fn(),
        update: jest.fn(),
      },
      finding: { createMany: jest.fn() },
      aiSuggestion: { createMany: jest.fn() },
      moduleSummary: { createMany: jest.fn() },
      llmUsage: { create: jest.fn() },
      $transaction: jest.fn((operations: unknown[]) => Promise.all(operations)),
    }
    const config = {
      get: jest.fn((key: string) => {
        if (key === 'LLM_PROVIDER') return 'anthropic'
        if (key === 'LLM_API_KEY') return ''
        return undefined
      }),
    }

    const service = new AuditsService(
      (overrides.prisma ?? prisma) as unknown as PrismaService,
      (overrides.config ?? config) as unknown as ConfigService,
    )
    return { service, prisma, config }
  }

  beforeEach(() => {
    jest.mocked(runAnalysis).mockReset()
    jest.mocked(hasLlmCredentials).mockReset()
    jest.mocked(resolveLlmConfig).mockReset()
  })

  it('given an unauthorized repository, then throws not found', async () => {
    const { service, prisma } = buildService()
    prisma.repository.findFirst.mockResolvedValue(null)
    await expect(service.run('repo-1', 'owner-1')).rejects.toBeInstanceOf(NotFoundException)
  })

  it('given a local repository, then runs the analysis and persists results', async () => {
    const { service, prisma } = buildService()
    prisma.repository.findFirst.mockResolvedValue({
      id: 'repo-1',
      ownerId: 'owner-1',
      url: '',
      localPath: 'tools/fixtures/ts-basic',
    })
    prisma.audit.create.mockResolvedValue({ id: 'audit-1' })
    prisma.audit.update.mockResolvedValue({ id: 'audit-1' })
    jest.mocked(runAnalysis).mockResolvedValue(sampleReport as never)
    jest.mocked(hasLlmCredentials).mockReturnValue(false)

    const result = await service.run('repo-1', 'owner-1')

    expect(result.status).toBe(AuditStatus.Completed)
    expect(runAnalysis).toHaveBeenCalledWith({ rootDir: expect.stringContaining('ts-basic') })
    expect(prisma.finding.createMany).toHaveBeenCalledWith({
      data: [
        {
          auditId: 'audit-1',
          ruleId: 'dead-code',
          severity: 'low',
          likelihood: 1,
          message: 'unused symbol',
          filePath: 'src/a.ts',
          lineNumber: 3,
          columnNumber: null,
          metadata: {},
        },
      ],
    })
    expect(prisma.moduleSummary.createMany).toHaveBeenCalledWith({
      data: [
        {
          auditId: 'audit-1',
          moduleName: 'src',
          findingCount: 1,
          moduleScore: 95,
          breakdown: {},
        },
      ],
    })
    expect(prisma.audit.update).toHaveBeenCalledWith({
      where: { id: 'audit-1' },
      data: expect.objectContaining({ status: AuditStatus.Completed, healthScore: 80 }),
    })
    expect(prisma.repository.update).toHaveBeenCalledWith({
      where: { id: 'repo-1' },
      data: { lastAuditAt: expect.any(Date) },
    })
  })

  it('given a failing analysis, then marks the audit as failed', async () => {
    const { service, prisma } = buildService()
    prisma.repository.findFirst.mockResolvedValue({
      id: 'repo-1',
      ownerId: 'owner-1',
      url: '',
      localPath: 'tools/fixtures/ts-basic',
    })
    prisma.audit.create.mockResolvedValue({ id: 'audit-1' })
    jest.mocked(runAnalysis).mockRejectedValue(new Error('boom'))

    const result = await service.run('repo-1', 'owner-1')

    expect(result.status).toBe(AuditStatus.Failed)
    expect(prisma.audit.update).toHaveBeenCalledWith({
      where: { id: 'audit-1' },
      data: expect.objectContaining({ status: AuditStatus.Failed, errorMessage: 'boom' }),
    })
  })

  it('given a repository without source, then rejects with a 400 source error', async () => {
    const { service, prisma } = buildService()
    prisma.repository.findFirst.mockResolvedValue({
      id: 'repo-1',
      ownerId: 'owner-1',
      url: '',
      localPath: null,
    })
    prisma.audit.create.mockResolvedValue({ id: 'audit-1' })

    await expect(service.run('repo-1', 'owner-1')).rejects.toMatchObject({
      code: 'repository.no_source',
      status: 400,
    })
    expect(prisma.audit.create).not.toHaveBeenCalled()
  })
})