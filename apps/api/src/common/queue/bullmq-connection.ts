import type { ConfigService } from '@nestjs/config'
import type { ConnectionOptions } from 'bullmq'

export function buildBullConnection(config: ConfigService): ConnectionOptions {
  return {
    url: config.getOrThrow<string>('REDIS_URL'),
    maxRetriesPerRequest: null,
  }
}
