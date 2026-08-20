import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { PrismaModule } from './common/prisma/prisma.module'
import { QueueModule } from './common/queue/queue.module'
import { RedisModule } from './common/redis/redis.module'
import { validateEnv } from './config/env.validation'
import { AuditProcessorService } from './modules/audits/audit-processor.service'
import { AuditsModule } from './modules/audits/audits.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    PrismaModule,
    RedisModule,
    QueueModule,
    AuditsModule,
  ],
  providers: [AuditProcessorService],
})
export class WorkerModule {}
