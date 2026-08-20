import { NotFoundException } from '@nestjs/common'
import { QueryHandler } from '@nestjs/cqrs'
import type { IQueryHandler } from '@nestjs/cqrs'
import type { PrismaService } from '../../../common/prisma/prisma.service'
import { GetRepositoryQuery } from './get-repository.query'

@QueryHandler(GetRepositoryQuery)
export class GetRepositoryHandler implements IQueryHandler<GetRepositoryQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetRepositoryQuery) {
    const repository = await this.prisma.repository.findFirst({
      where: { id: query.repositoryId, ownerId: query.ownerId },
      select: {
        id: true,
        name: true,
        provider: true,
        url: true,
        localPath: true,
        createdAt: true,
        lastAuditAt: true,
      },
    })
    if (repository === null) {
      throw new NotFoundException('El repositorio no existe')
    }
    return repository
  }
}