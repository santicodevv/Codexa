import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { Injectable, Logger } from '@nestjs/common'
import type { ConfigService } from '@nestjs/config'
import type { Job } from 'bullmq'
import { Worker } from 'bullmq'
import { buildBullConnection } from '../../common/queue/bullmq-connection'
import { AUDITS_QUEUE_NAME } from '../../common/queue/queue.constants'
import type { AuditsService } from './audits.service'

@Injectable()
export class AuditProcessorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AuditProcessorService.name)
  private worker: Worker | null = null

  constructor(
    private readonly audits: AuditsService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit(): void {
    this.worker = new Worker(
      AUDITS_QUEUE_NAME,
      async (job: Job<{ auditId: string; ref?: string }>) =>
        this.audits.processAudit(job.data.auditId, job.data.ref),
      { connection: buildBullConnection(this.config), concurrency: 1 },
    )
    this.worker.on('completed', (job) => {
      this.logger.log(`Auditoría ${job.data.auditId} completada`)
    })
    this.worker.on('failed', (job, error) => {
      this.logger.error(`Auditoría ${job?.data.auditId} falló: ${error.message}`)
    })
  }

  async onModuleDestroy(): Promise<void> {
    if (this.worker !== null) {
      await this.worker.close()
      this.worker = null
    }
  }
}
