import { createHash } from 'node:crypto'
import type { CanActivate, ExecutionContext } from '@nestjs/common'
import { Injectable, UnauthorizedException } from '@nestjs/common'
import type { Request } from 'express'
import type { PrismaService } from '../prisma/prisma.service'

export const CI_API_KEY_HEADER = 'x-codexa-api-key'

export function hashCiApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}

@Injectable()
export class CiApiKeyGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>()
    const apiKey = request.headers[CI_API_KEY_HEADER]

    if (typeof apiKey !== 'string' || apiKey.trim() === '') {
      throw new UnauthorizedException('Falta la API key de CI')
    }

    const repository = await this.prisma.repository.findUnique({
      where: { ciApiKeyHash: hashCiApiKey(apiKey) },
    })

    if (repository === null) {
      throw new UnauthorizedException('API key de CI inválida')
    }

    ;(request as Request & { repository: typeof repository }).repository = repository
    return true
  }
}
