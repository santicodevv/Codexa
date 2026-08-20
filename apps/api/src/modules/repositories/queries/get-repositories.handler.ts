import { QueryHandler } from '@nestjs/cqrs'
import type { IQueryHandler } from '@nestjs/cqrs'
import type { PrismaService } from '../../../common/prisma/prisma.service'
import { GetRepositoriesQuery } from './get-repositories.query'

@QueryHandler(GetRepositoriesQuery)
export class GetRepositoriesHandler implements IQueryHandler<GetRepositoriesQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetRepositoriesQuery) {
    const repositories = await this.prisma.repository.findMany({
      where: { ownerId: query.ownerId },
      orderBy: { createdAt: 'desc' },
      include: {
        audits: {
          orderBy: { startedAt: 'desc' },
          take: 1,
          select: {
            id: true,
            status: true,
            healthScore: true,
            startedAt: true,
            completedAt: true,
            totalFindings: true,
          },
        },
      },
    })

    return repositories.map((repository) => ({
      id: repository.id,
      name: repository.name,
      provider: repository.provider,
      url: repository.url,
      createdAt: repository.createdAt,
      lastAudit: repository.audits[0] ?? null,
    }))
  }
}