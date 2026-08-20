import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common'
import type { CommandBus, QueryBus } from '@nestjs/cqrs'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { CurrentUser } from '../../common/auth/current-user.decorator'
import type { AuthenticatedUser } from '../../common/auth/current-user.decorator'
import { CreateRepositoryCommand } from './commands/create-repository.command'
import { DeleteRepositoryCommand } from './commands/delete-repository.command'
import { GenerateCiKeyCommand } from './commands/generate-ci-key.command'
import type { CreateRepositoryDto } from './dto/create-repository.dto'
import { GetRepositoriesQuery } from './queries/get-repositories.query'
import { GetRepositoryQuery } from './queries/get-repository.query'

@ApiTags('repositories')
@ApiBearerAuth()
@Controller('repositories')
export class RepositoriesController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  async create(@Body() body: CreateRepositoryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.commandBus.execute(
      new CreateRepositoryCommand(user.id, body.name, body.provider, body.url, body.localPath),
    )
  }

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    return this.queryBus.execute(new GetRepositoriesQuery(user.id))
  }

  @Get(':repositoryId')
  async get(
    @Param('repositoryId', ParseUUIDPipe) repositoryId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.queryBus.execute(new GetRepositoryQuery(repositoryId, user.id))
  }

  @Delete(':repositoryId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('repositoryId', ParseUUIDPipe) repositoryId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.commandBus.execute(new DeleteRepositoryCommand(repositoryId, user.id))
  }

  // Genera (o rota) la API key de CI del repositorio. El valor en texto plano solo
  // se devuelve en esta respuesta; solo el hash queda persistido.
  @Post(':repositoryId/ci-key')
  async generateCiKey(
    @Param('repositoryId', ParseUUIDPipe) repositoryId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.commandBus.execute(new GenerateCiKeyCommand(repositoryId, user.id))
  }
}