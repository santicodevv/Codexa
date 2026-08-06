import type { Command } from 'commander'

interface AuditOptions {
  path: string
  provider: string
  output: string
}

export function registerAuditCommand(program: Command): void {
  program
    .command('audit')
    .description('Ejecuta una auditoría en un repositorio local')
    .requiredOption('--path <path>', 'Ruta al repositorio a auditar')
    .option('--provider <provider>', 'Proveedor LLM', 'anthropic')
    .option('--output <format>', 'Formato de reporte: markdown|html', 'markdown')
    .action((options: AuditOptions) => {
      console.error(`Auditoría no disponible aún: ${options.path}`)
      process.exitCode = 1
    })
}
