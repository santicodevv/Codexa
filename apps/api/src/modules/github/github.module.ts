import { Module } from '@nestjs/common'
import { CqrsModule } from '@nestjs/cqrs'
import { CiApiKeyGuard } from '../../common/auth/ci-api-key.guard'
import { CiAuditRateLimitGuard } from '../../common/rate-limit/ci-audit-rate-limit.guard'
import { AuditsModule } from '../audits/audits.module'
import { RunCiAuditHandler } from './commands/run-ci-audit.handler'
import { GithubController } from './github.controller'
import { GetCiAuditHandler } from './queries/get-ci-audit.handler'

@Module({
  imports: [CqrsModule, AuditsModule],
  controllers: [GithubController],
  providers: [RunCiAuditHandler, GetCiAuditHandler, CiApiKeyGuard, CiAuditRateLimitGuard],
})
export class GithubModule {}
