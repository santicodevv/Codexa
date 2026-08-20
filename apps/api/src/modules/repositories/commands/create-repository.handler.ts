import { CommandHandler } from '@nestjs/cqrs'
import type { ICommandHandler } from '@nestjs/cqrs'
import { ServiceException } from '@codexa/contracts'
import type { PrismaService } from '../../../common/prisma/prisma.service'
import { CreateRepositoryCommand } from './create-repository.command'

@CommandHandler(CreateRepositoryCommand)
export class CreateRepositoryHandler implements ICommandHandler<CreateRepositoryCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: CreateRepositoryCommand) {
    if (command.url === undefined && command.localPath === undefined) {
      throw new ServiceException(
        'Debes indicar una url o una localPath para el repositorio',
        'repository.source_required',
        400,
      )
    }

    try {
      return await this.prisma.repository.create({
        data: {
          ownerId: command.ownerId,
          name: command.name,
          provider: command.provider,
          url: command.url ?? '',
          localPath: command.localPath,
        },
        select: { id: true, name: true, provider: true, url: true },
      })
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ServiceException(
          'Ya tienes un repositorio con este proveedor y URL',
          'repository.duplicated',
          409,
        )
      }
      throw error
    }
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: string }).code === 'P2002'
  )
}