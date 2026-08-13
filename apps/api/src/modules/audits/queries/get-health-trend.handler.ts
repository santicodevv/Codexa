import { QueryHandler } from '@nestjs/cqrs'
import type { IQueryHandler } from '@nestjs/cqrs'
import { AuditStatus } from '@codexa/contracts'
import type { PrismaService } from '../../../common/prisma/prisma.service'
import { GetHealthTrendQuery } from './get-health-trend.query'

@QueryHandler(GetHealthTrendQuery)
export class GetHealthTrendHandler implements IQueryHandler<GetHealthTrendQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetHealthTrendQuery) {
    const items = await this.prisma.audit.findMany({
      where: {
        repository: { id: query.repositoryId, ownerId: query.ownerId },
        status: AuditStatus.Completed,
      },
      orderBy: { startedAt: 'desc' },
      take: query.limit,
      select: {
        id: true,
        healthScore: true,
        criticalCount: true,
        mediumCount: true,
        lowCount: true,
        totalFindings: true,
        startedAt: true,
      },
    })

    return { items: items.reverse() }
  }
}
