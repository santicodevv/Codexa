import type { CanActivate, ExecutionContext } from '@nestjs/common'
import { HttpException, HttpStatus, Injectable } from '@nestjs/common'
import type { ConfigService } from '@nestjs/config'
import type { Request } from 'express'
import type { RedisService } from '../redis/redis.service'

const WINDOW_SECONDS = 60 * 60

@Injectable()
export class CiAuditRateLimitGuard implements CanActivate {
  constructor(
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>()
    const repositoryId = (request as Request & { repository?: { id: string } }).repository?.id
    const limit = Number(this.config.get<string>('CI_AUDIT_RATE_LIMIT') ?? '30')

    const key = `rate:ci-audit:${repositoryId ?? request.ip ?? 'anonymous'}`
    const count = await this.redis.incr(key)
    if (count === 1) {
      await this.redis.expire(key, WINDOW_SECONDS)
    }
    if (count > limit) {
      throw new HttpException(
        'Límite de auditorías de CI superado. Intenta de nuevo en una hora.',
        HttpStatus.TOO_MANY_REQUESTS,
      )
    }
    return true
  }
}
