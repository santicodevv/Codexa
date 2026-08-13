import { QueryHandler } from '@nestjs/cqrs'
import type { IQueryHandler } from '@nestjs/cqrs'
import type { PrismaService } from '../../../common/prisma/prisma.service'
import { GetAuditHistoryQuery } from './get-audit-history.query'

@QueryHandler(GetAuditHistoryQuery)
export class GetAuditHistoryHandler implements IQueryHandler<GetAuditHistoryQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetAuditHistoryQuery) {
    const where = { repository: { id: query.repositoryId, ownerId: query.ownerId } }

    const [items, totalCount] = await Promise.all([
      this.prisma.audit.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        select: {
          id: true,
          status: true,
          healthScore: true,
          criticalCount: true,
          mediumCount: true,
          lowCount: true,
          totalFindings: true,
          durationMs: true,
          startedAt: true,
          completedAt: true,
        },
      }),
      this.prisma.audit.count({ where }),
    ])

    return {
      items,
      page: query.page,
      pageSize: query.pageSize,
      totalCount,
    }
  }
}