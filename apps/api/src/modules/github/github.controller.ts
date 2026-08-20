import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common'
import type { CommandBus, QueryBus } from '@nestjs/cqrs'
import { ApiTags } from '@nestjs/swagger'
import { CiApiKeyGuard } from '../../common/auth/ci-api-key.guard'
import { CurrentRepository } from '../../common/auth/current-repository.decorator'
import type { CiAuthenticatedRepository } from '../../common/auth/current-repository.decorator'
import { Public } from '../../common/auth/public.decorator'
import { CiAuditRateLimitGuard } from '../../common/rate-limit/ci-audit-rate-limit.guard'
import { RunCiAuditCommand } from './commands/run-ci-audit.command'
import type { RunCiAuditDto } from './dto/run-ci-audit.dto'
import { GetCiAuditQuery } from './queries/get-ci-audit.query'

// Endpoints consumidos por la GitHub Action `codexa/audit` (autenticación por API key de
// repositorio, no por JWT de usuario). Ver docs/13-GitHub-Integration.md.
@ApiTags('ci')
@Public()
@UseGuards(CiApiKeyGuard)
@Controller('ci')
export class GithubController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @UseGuards(CiAuditRateLimitGuard)
  @Post('audits')
  async run(
    @Body() body: RunCiAuditDto,
    @CurrentRepository() repository: CiAuthenticatedRepository,
  ) {
    return this.commandBus.execute(
      new RunCiAuditCommand(repository.id, repository.ownerId, body.ref, body.provider, body.model),
    )
  }

  @Get('audits/:auditId')
  async get(
    @Param('auditId', ParseUUIDPipe) auditId: string,
    @CurrentRepository() repository: CiAuthenticatedRepository,
  ) {
    return this.queryBus.execute(new GetCiAuditQuery(auditId, repository.id))
  }
}
