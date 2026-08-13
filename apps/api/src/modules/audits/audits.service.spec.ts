import { NotFoundException } from '@nestjs/common'
import type { ConfigService } from '@nestjs/config'
import { AuditStatus } from '@codexa/contracts'
import type { PrismaService } from '../../common/prisma/prisma.service'
import type { RedisService } from '../../common/redis/redis.service'
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
import { analyzeAndSuggest, createLanguageModel, hasLlmCredentials, resolveLlmConfig } from '@codexa/ai'

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

const sampleReportWithCommit = {
  ...sampleReport,
  summary: { ...sampleReport.summary, commitSha: 'abc123' },
}

const sampleLlmConfig = {
  provider: 'anthropic',
  miniModel: 'claude-haiku-4-5',
  proModel: 'claude-sonnet-4-5',
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
    const redis = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn(),
    }

    const service = new AuditsService(
      (overrides.prisma ?? prisma) as unknown as PrismaService,
      (overrides.config ?? config) as unknown as ConfigService,
      (overrides.redis ?? redis) as unknown as RedisService,
    )
    return { service, prisma, config, redis }
  }

  beforeEach(() => {
    jest.mocked(runAnalysis).mockReset()
    jest.mocked(hasLlmCredentials).mockReset()
    jest.mocked(resolveLlmConfig).mockReset()
    jest.mocked(analyzeAndSuggest).mockReset()
    jest.mocked(createLanguageModel).mockReset()
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

  it('given a cache miss with LLM credentials, then calls the LLM and caches the suggestions', async () => {
    const { service, prisma, redis } = buildService()
    prisma.repository.findFirst.mockResolvedValue({
      id: 'repo-1',
      ownerId: 'owner-1',
      url: '',
      localPath: 'tools/fixtures/ts-basic',
    })
    prisma.audit.create.mockResolvedValue({ id: 'audit-1' })
    prisma.audit.update.mockResolvedValue({ id: 'audit-1' })
    jest.mocked(runAnalysis).mockResolvedValue(sampleReportWithCommit as never)
    jest.mocked(hasLlmCredentials).mockReturnValue(true)
    jest.mocked(resolveLlmConfig).mockReturnValue(sampleLlmConfig as never)
    jest.mocked(createLanguageModel).mockReturnValue({} as never)
    jest.mocked(analyzeAndSuggest).mockResolvedValue({
      suggestions: [{ type: 'refactor', title: 'Divide módulo', description: 'x', codeBlocks: [] }],
      inputTokens: 100,
      outputTokens: 50,
      degraded: false,
    } as never)

    await service.run('repo-1', 'owner-1')

    expect(redis.get).toHaveBeenCalledWith(
      'llm:suggestions:repo-1:abc123:anthropic:claude-sonnet-4-5',
    )
    expect(analyzeAndSuggest).toHaveBeenCalledTimes(1)
    expect(redis.set).toHaveBeenCalledWith(
      'llm:suggestions:repo-1:abc123:anthropic:claude-sonnet-4-5',
      expect.stringContaining('Divide módulo'),
      60 * 60 * 24,
    )
    expect(prisma.llmUsage.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ inputTokens: 100, outputTokens: 50 }),
    })
  })

  it('given a cache hit with LLM credentials, then reuses the cached suggestions without calling the LLM', async () => {
    const cached = JSON.stringify({
      suggestions: [{ type: 'refactor', title: 'Divide módulo', description: 'x', codeBlocks: [] }],
      degraded: false,
      provider: 'anthropic',
      modelName: 'claude-sonnet-4-5',
    })
    const { service, prisma, redis } = buildService()
    redis.get.mockResolvedValue(cached)
    prisma.repository.findFirst.mockResolvedValue({
      id: 'repo-1',
      ownerId: 'owner-1',
      url: '',
      localPath: 'tools/fixtures/ts-basic',
    })
    prisma.audit.create.mockResolvedValue({ id: 'audit-1' })
    prisma.audit.update.mockResolvedValue({ id: 'audit-1' })
    jest.mocked(runAnalysis).mockResolvedValue(sampleReportWithCommit as never)
    jest.mocked(hasLlmCredentials).mockReturnValue(true)
    jest.mocked(resolveLlmConfig).mockReturnValue(sampleLlmConfig as never)

    await service.run('repo-1', 'owner-1')

    expect(analyzeAndSuggest).not.toHaveBeenCalled()
    expect(createLanguageModel).not.toHaveBeenCalled()
    expect(redis.set).not.toHaveBeenCalled()
    expect(prisma.aiSuggestion.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ auditId: 'audit-1', title: 'Divide módulo' })],
    })
    expect(prisma.llmUsage.create).not.toHaveBeenCalled()
  })
})