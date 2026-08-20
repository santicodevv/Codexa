import { Global, Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Queue } from 'bullmq'
import { buildBullConnection } from './bullmq-connection'
import { AUDITS_QUEUE, AUDITS_QUEUE_NAME } from './queue.constants'

@Global()
@Module({
  providers: [
    {
      provide: AUDITS_QUEUE,
      useFactory: (config: ConfigService) =>
        new Queue(AUDITS_QUEUE_NAME, { connection: buildBullConnection(config) }),
      inject: [ConfigService],
    },
  ],
  exports: [AUDITS_QUEUE],
})
export class QueueModule {}
