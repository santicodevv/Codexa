import type { Command } from 'commander'
import { LlmProvider } from '@codexa/contracts'

export function registerProvidersCommand(program: Command): void {
  program
    .command('providers')
    .description('Lista los proveedores LLM disponibles')
    .action(() => {
      const providers = Object.values(LlmProvider).join('\n')
      console.log(providers)
    })
}
