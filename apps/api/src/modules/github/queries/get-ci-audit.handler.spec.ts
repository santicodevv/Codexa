import { ForbiddenException, NotFoundException } from '@nestjs/common'
import type { PrismaService } from '../../../common/prisma/prisma.service'
import { GetCiAuditHandler } from './get-ci-audit.handler'
import { GetCiAuditQuery } from './get-ci-audit.query'

describe('GetCiAuditHandler', () => {
  function buildHandler() {
    const prisma = { audit: { findUnique: jest.fn() } }
    const handler = new GetCiAuditHandler(prisma as unknown as PrismaService)
    return { handler, prisma }
  }

  it('lanza NotFoundException si la auditoría no existe', async () => {
    const { handler, prisma } = buildHandler()
    prisma.audit.findUnique.mockResolvedValue(null)

    await expect(handler.execute(new GetCiAuditQuery('audit-1', 'repo-1'))).rejects.toThrow(
      NotFoundException,
    )
  })

  it('lanza ForbiddenException si la auditoría pertenece a otro repositorio', async () => {
    const { handler, prisma } = buildHandler()
    prisma.audit.findUnique.mockResolvedValue({
      id: 'audit-1',
      repositoryId: 'repo-other',
      findings: [],
      aiSuggestions: [],
    })

    await expect(handler.execute(new GetCiAuditQuery('audit-1', 'repo-1'))).rejects.toThrow(
      ForbiddenException,
    )
  })

  it('devuelve el detalle de la auditoría cuando pertenece al repositorio', async () => {
    const { handler, prisma } = buildHandler()
    prisma.audit.findUnique.mockResolvedValue({
      id: 'audit-1',
      repositoryId: 'repo-1',
      status: 'completed',
      commitSha: 'abc123',
      healthScore: 87,
      criticalCount: 1,
      mediumCount: 2,
      lowCount: 3,
      totalFindings: 6,
      estimatedDebtHours: 4,
      errorMessage: null,
      findings: [{ id: 'f1' }],
      aiSuggestions: [{ id: 's1' }],
    })

    const result = await handler.execute(new GetCiAuditQuery('audit-1', 'repo-1'))

    expect(result).toEqual({
      id: 'audit-1',
      status: 'completed',
      commitSha: 'abc123',
      healthScore: 87,
      severityCounts: { critical: 1, medium: 2, low: 3 },
      totalFindings: 6,
      estimatedDebtHours: 4,
      errorMessage: null,
      findings: [{ id: 'f1' }],
      suggestions: [{ id: 's1' }],
    })
  })
})
