import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import type { CommandBus, QueryBus } from '@nestjs/cqrs'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { CurrentUser } from '../../common/auth/current-user.decorator'
import type { AuthenticatedUser } from '../../common/auth/current-user.decorator'
import { AuditRateLimitGuard } from '../../common/rate-limit/audit-rate-limit.guard'
import { RunAuditCommand } from './commands/run-audit.command'
import type { RunAuditDto } from './dto/run-audit.dto'
import { GetAuditHistoryQuery } from './queries/get-audit-history.query'
import { GetAuditQuery } from './queries/get-audit.query'

@ApiTags('audits')
@ApiBearerAuth()
@Controller('repositories/:repositoryId/audits')
export class AuditsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @UseGuards(AuditRateLimitGuard)
  @Post()
  async run(
    @Param('repositoryId', ParseUUIDPipe) repositoryId: string,
    @Body() body: RunAuditDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.commandBus.execute(
      new RunAuditCommand(repositoryId, user.id, body.provider, body.model),
    )
  }

  @Get()
  async history(
    @Param('repositoryId', ParseUUIDPipe) repositoryId: string,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize = 20,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.queryBus.execute(
      new GetAuditHistoryQuery(repositoryId, user.id, page, pageSize),
    )
  }

  @Get(':auditId')
  async get(
    @Param('repositoryId', ParseUUIDPipe) repositoryId: string,
    @Param('auditId', ParseUUIDPipe) auditId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.queryBus.execute(new GetAuditQuery(auditId, user.id))
  }
}