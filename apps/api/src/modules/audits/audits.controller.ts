import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
  StreamableFile,
  UseGuards,
} from '@nestjs/common'
import type { CommandBus, QueryBus } from '@nestjs/cqrs'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { CurrentUser } from '../../common/auth/current-user.decorator'
import type { AuthenticatedUser } from '../../common/auth/current-user.decorator'
import { AuditRateLimitGuard } from '../../common/rate-limit/audit-rate-limit.guard'
import { RunAuditCommand } from './commands/run-audit.command'
import type { RunAuditDto } from './dto/run-audit.dto'
import type { AuditPdfData } from './pdf-report.builder'
import { buildAuditPdf } from './pdf-report.builder'
import { GetAuditHistoryQuery } from './queries/get-audit-history.query'
import { GetAuditQuery } from './queries/get-audit.query'
import { GetHealthTrendQuery } from './queries/get-health-trend.query'

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

  // Declarado antes de `:auditId` a propósito: con un segmento literal, si se declarara
  // después, Nest/Express intentaría matchear 'trend' contra `:auditId` (ParseUUIDPipe lo
  // rechazaría con 400 en vez de devolver la tendencia).
  @Get('trend')
  async trend(
    @Param('repositoryId', ParseUUIDPipe) repositoryId: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.queryBus.execute(new GetHealthTrendQuery(repositoryId, user.id, limit))
  }

  @Get(':auditId')
  async get(
    @Param('repositoryId', ParseUUIDPipe) repositoryId: string,
    @Param('auditId', ParseUUIDPipe) auditId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.queryBus.execute(new GetAuditQuery(auditId, user.id))
  }

  @Get(':auditId/export.pdf')
  @Header('Content-Type', 'application/pdf')
  async exportPdf(
    @Param('repositoryId', ParseUUIDPipe) repositoryId: string,
    @Param('auditId', ParseUUIDPipe) auditId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<StreamableFile> {
    const audit = (await this.queryBus.execute(
      new GetAuditQuery(auditId, user.id),
    )) as AuditPdfData
    const buffer = await buildAuditPdf(audit)
    return new StreamableFile(buffer, {
      disposition: `attachment; filename="codexa-audit-${auditId}.pdf"`,
    })
  }
}