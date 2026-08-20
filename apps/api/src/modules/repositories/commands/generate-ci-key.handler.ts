import { randomBytes } from 'node:crypto'
import { NotFoundException } from '@nestjs/common'
import { CommandHandler } from '@nestjs/cqrs'
import type { ICommandHandler } from '@nestjs/cqrs'
import { hashCiApiKey } from '../../../common/auth/ci-api-key.guard'
import type { PrismaService } from '../../../common/prisma/prisma.service'
import { GenerateCiKeyCommand } from './generate-ci-key.command'

@CommandHandler(GenerateCiKeyCommand)
export class GenerateCiKeyHandler implements ICommandHandler<GenerateCiKeyCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: GenerateCiKeyCommand): Promise<{ apiKey: string }> {
    const apiKey = `cxa_${randomBytes(24).toString('hex')}`

    const result = await this.prisma.repository.updateMany({
      where: { id: command.repositoryId, ownerId: command.ownerId },
      data: { ciApiKeyHash: hashCiApiKey(apiKey) },
    })
    if (result.count === 0) {
      throw new NotFoundException('El repositorio no existe')
    }

    return { apiKey }
  }
}
