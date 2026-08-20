import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { QueryHandler } from '@nestjs/cqrs'
import type { IQueryHandler } from '@nestjs/cqrs'
import type { PrismaService } from '../../../common/prisma/prisma.service'
import { GetCiAuditQuery } from './get-ci-audit.query'

// Variante de GetAuditQuery (modules/audits/queries/get-audit.handler.ts) que autoriza
// por repositoryId (resuelto por CiApiKeyGuard) en vez de por ownerId de un JWT de usuario.
@QueryHandler(GetCiAuditQuery)
export class GetCiAuditHandler implements IQueryHandler<GetCiAuditQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetCiAuditQuery) {
    const audit = await this.prisma.audit.findUnique({
      where: { id: query.auditId },
      include: {
        findings: { orderBy: [{ severity: 'asc' }, { filePath: 'asc' }] },
        aiSuggestions: { orderBy: { createdAt: 'asc' } },
      },
    })

    if (audit === null) {
      throw new NotFoundException('La auditoría no existe')
    }
    if (audit.repositoryId !== query.repositoryId) {
      throw new ForbiddenException('No tienes acceso a esta auditoría')
    }

    return {
      id: audit.id,
      status: audit.status,
      commitSha: audit.commitSha,
      healthScore: audit.healthScore,
      severityCounts: {
        critical: audit.criticalCount ?? 0,
        medium: audit.mediumCount ?? 0,
        low: audit.lowCount ?? 0,
      },
      totalFindings: audit.totalFindings,
      estimatedDebtHours: audit.estimatedDebtHours,
      errorMessage: audit.errorMessage,
      findings: audit.findings,
      suggestions: audit.aiSuggestions,
    }
  }
}
