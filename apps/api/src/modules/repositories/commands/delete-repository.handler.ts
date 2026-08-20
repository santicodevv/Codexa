import { NotFoundException } from '@nestjs/common'
import { CommandHandler } from '@nestjs/cqrs'
import type { ICommandHandler } from '@nestjs/cqrs'
import type { PrismaService } from '../../../common/prisma/prisma.service'
import { DeleteRepositoryCommand } from './delete-repository.command'

@CommandHandler(DeleteRepositoryCommand)
export class DeleteRepositoryHandler implements ICommandHandler<DeleteRepositoryCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: DeleteRepositoryCommand): Promise<void> {
    const result = await this.prisma.repository.deleteMany({
      where: { id: command.repositoryId, ownerId: command.ownerId },
    })
    if (result.count === 0) {
      throw new NotFoundException('El repositorio no existe')
    }
  }
}