import { CommandHandler } from '@nestjs/cqrs'
import type { ICommandHandler } from '@nestjs/cqrs'
import type { AuditsService } from '../../audits/audits.service'
import { RunCiAuditCommand } from './run-ci-audit.command'

@CommandHandler(RunCiAuditCommand)
export class RunCiAuditHandler implements ICommandHandler<RunCiAuditCommand> {
  constructor(private readonly audits: AuditsService) {}

  execute(command: RunCiAuditCommand) {
    return this.audits.enqueue(
      command.repositoryId,
      command.ownerId,
      command.provider,
      command.model,
      command.ref,
    )
  }
}
