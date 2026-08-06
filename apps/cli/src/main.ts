#!/usr/bin/env node
import { Command } from 'commander'
import { registerAuditCommand } from './commands/audit.command'
import { registerProvidersCommand } from './commands/providers.command'

const program = new Command()

program.name('codexa').description('Codexa CLI — Auditoría de código con IA').version('0.1.0')

registerAuditCommand(program)
registerProvidersCommand(program)

program.parseAsync(process.argv).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
