import { CommandHandler } from '@nestjs/cqrs'
import type { ICommandHandler } from '@nestjs/cqrs'
import type { AuditsService } from '../audits.service'
import { RunAuditCommand } from './run-audit.command'

@CommandHandler(RunAuditCommand)
export class RunAuditHandler implements ICommandHandler<RunAuditCommand> {
  constructor(private readonly audits: AuditsService) {}

  execute(command: RunAuditCommand) {
    return this.audits.run(command.repositoryId, command.ownerId, command.provider, command.model)
  }
}