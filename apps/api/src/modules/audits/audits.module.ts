import { Module } from '@nestjs/common'
import { CqrsModule } from '@nestjs/cqrs'
import { AuditRateLimitGuard } from '../../common/rate-limit/audit-rate-limit.guard'
import { AuditsController } from './audits.controller'
import { AuditsService } from './audits.service'
import { RunAuditHandler } from './commands/run-audit.handler'
import { GetAuditHistoryHandler } from './queries/get-audit-history.handler'
import { GetAuditHandler } from './queries/get-audit.handler'
import { GetHealthTrendHandler } from './queries/get-health-trend.handler'

@Module({
  imports: [CqrsModule],
  controllers: [AuditsController],
  providers: [
    AuditsService,
    RunAuditHandler,
    GetAuditHandler,
    GetAuditHistoryHandler,
    GetHealthTrendHandler,
    AuditRateLimitGuard,
  ],
})
export class AuditsModule {}