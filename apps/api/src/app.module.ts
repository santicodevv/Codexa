import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ConfigModule } from '@nestjs/config'
import { JwtAuthGuard } from './common/auth/jwt-auth.guard'
import { PrismaModule } from './common/prisma/prisma.module'
import { QueueModule } from './common/queue/queue.module'
import { RedisModule } from './common/redis/redis.module'
import { validateEnv } from './config/env.validation'
import { AuditsModule } from './modules/audits/audits.module'
import { AuthModule } from './modules/auth/auth.module'
import { HealthModule } from './modules/health/health.module'
import { RepositoriesModule } from './modules/repositories/repositories.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    PrismaModule,
    RedisModule,
    QueueModule,
    HealthModule,
    AuthModule,
    RepositoriesModule,
    AuditsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}