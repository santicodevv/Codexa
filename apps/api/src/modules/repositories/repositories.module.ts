import { Module } from '@nestjs/common'
import { CqrsModule } from '@nestjs/cqrs'
import { CreateRepositoryHandler } from './commands/create-repository.handler'
import { DeleteRepositoryHandler } from './commands/delete-repository.handler'
import { GetRepositoriesHandler } from './queries/get-repositories.handler'
import { GetRepositoryHandler } from './queries/get-repository.handler'
import { RepositoriesController } from './repositories.controller'

@Module({
  imports: [CqrsModule],
  controllers: [RepositoriesController],
  providers: [
    CreateRepositoryHandler,
    DeleteRepositoryHandler,
    GetRepositoriesHandler,
    GetRepositoryHandler,
  ],
})
export class RepositoriesModule {}