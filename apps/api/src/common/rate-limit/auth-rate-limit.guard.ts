import type { CanActivate, ExecutionContext } from '@nestjs/common'
import { HttpException, HttpStatus, Injectable } from '@nestjs/common'
import type { ConfigService } from '@nestjs/config'
import type { Request } from 'express'
import type { RedisService } from '../redis/redis.service'

const WINDOW_SECONDS = 15 * 60

@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  constructor(
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>()
    const key = request.ip ?? 'anonymous'
    const limit = Number(this.config.get<string>('AUTH_RATE_LIMIT') ?? '10')

    const count = await this.redis.incr(`rate:auth:${key}`)
    if (count === 1) {
      await this.redis.expire(`rate:auth:${key}`, WINDOW_SECONDS)
    }
    if (count > limit) {
      throw new HttpException(
        'Demasiados intentos. Intenta de nuevo en unos minutos.',
        HttpStatus.TOO_MANY_REQUESTS,
      )
    }
    return true
  }
}
