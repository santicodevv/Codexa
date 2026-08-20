import type { CanActivate, ExecutionContext} from '@nestjs/common';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common'
import type { ConfigService } from '@nestjs/config'
import type { Request } from 'express'
import type { RedisService } from '../redis/redis.service'

const WINDOW_SECONDS = 60 * 60

@Injectable()
export class AuditRateLimitGuard implements CanActivate {
  constructor(
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>()
    const key = (request.user as { id?: string } | undefined)?.id ?? request.ip ?? 'anonymous'
    const limit = Number(this.config.get<string>('AUDIT_RATE_LIMIT') ?? '20')

    const count = await this.redis.incr(`rate:audit:${key}`)
    if (count === 1) {
      await this.redis.expire(`rate:audit:${key}`, WINDOW_SECONDS)
    }
    if (count > limit) {
      throw new HttpException(
        'Límite de auditorías superado. Intenta de nuevo en una hora.',
        HttpStatus.TOO_MANY_REQUESTS,
      )
    }
    return true
  }
}