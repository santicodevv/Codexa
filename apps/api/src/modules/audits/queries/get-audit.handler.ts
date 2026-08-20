import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { QueryHandler } from '@nestjs/cqrs'
import type { IQueryHandler } from '@nestjs/cqrs'
import type { PrismaService } from '../../../common/prisma/prisma.service'
import { GetAuditQuery } from './get-audit.query'

@QueryHandler(GetAuditQuery)
export class GetAuditHandler implements IQueryHandler<GetAuditQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetAuditQuery) {
    const audit = await this.prisma.audit.findUnique({
      where: { id: query.auditId },
      include: {
        repository: { select: { ownerId: true, name: true, url: true } },
        findings: { orderBy: [{ severity: 'asc' }, { filePath: 'asc' }] },
        aiSuggestions: { orderBy: { createdAt: 'asc' } },
        moduleSummaries: { orderBy: { moduleName: 'asc' } },
      },
    })

    if (audit === null) {
      throw new NotFoundException('La auditoría no existe')
    }
    if (audit.repository.ownerId !== query.ownerId) {
      throw new ForbiddenException('No tienes acceso a esta auditoría')
    }

    return {
      id: audit.id,
      repository: { name: audit.repository.name, url: audit.repository.url },
      status: audit.status,
      commitSha: audit.commitSha,
      provider: audit.provider,
      model: audit.modelName,
      healthScore: audit.healthScore,
      severityCounts: {
        critical: audit.criticalCount ?? 0,
        medium: audit.mediumCount ?? 0,
        low: audit.lowCount ?? 0,
      },
      totalFindings: audit.totalFindings,
      estimatedDebtHours: audit.estimatedDebtHours,
      durationMs: audit.durationMs,
      startedAt: audit.startedAt,
      completedAt: audit.completedAt,
      errorMessage: audit.errorMessage,
      findings: audit.findings,
      suggestions: audit.aiSuggestions,
      moduleSummaries: audit.moduleSummaries,
    }
  }
}