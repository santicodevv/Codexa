import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Injectable, Logger } from '@nestjs/common'
import type { ConfigService } from '@nestjs/config'
import Redis from 'ioredis'

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name)
  private client: Redis | null = null

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const url = this.config.getOrThrow<string>('REDIS_URL')
    this.client = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 2 })
    this.client.on('error', (error: Error) => {
      this.logger.warn(`Redis: ${error.message}`)
    })
    await this.client.connect()
    this.logger.log('Redis conectado')
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client !== null) {
      this.client.disconnect()
      this.client = null
    }
  }

  private getConnection(): Redis {
    if (this.client === null) {
      throw new Error('Redis no está conectado')
    }
    return this.client
  }

  async incr(key: string): Promise<number> {
    return this.getConnection().incr(key)
  }

  async expire(key: string, seconds: number): Promise<void> {
    await this.getConnection().expire(key, seconds)
  }

  async get(key: string): Promise<string | null> {
    return this.getConnection().get(key)
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds !== undefined) {
      await this.getConnection().set(key, value, 'EX', ttlSeconds)
    } else {
      await this.getConnection().set(key, value)
    }
  }

  async del(key: string): Promise<void> {
    await this.getConnection().del(key)
  }

  async ping(): Promise<string> {
    return this.getConnection().ping()
  }
}