import fs from 'node:fs'
import path from 'node:path'
import type { Command } from 'commander'
import { runAnalysis } from '@codexa/analysis'
import { renderHtmlReport } from '../report/html-reporter'
import { renderMarkdownReport } from '../report/markdown-reporter'
import { toAuditReportDto } from '../report/map-report'

interface AuditOptions {
  path: string
  provider: string
  output: string
}

/**
 * Registra el comando `audit`. El flag `--provider` se acepta pero no se usa
 * en esta fase: el LLM Gateway se integra en la Fase 2.
 */
export function registerAuditCommand(program: Command): void {
  program
    .command('audit')
    .description('Ejecuta una auditoría en un repositorio local')
    .requiredOption('--path <path>', 'Ruta al repositorio a auditar')
    .option('--provider <provider>', 'Proveedor LLM', 'anthropic')
    .option('--output <format>', 'Formato de reporte: markdown|html|json', 'markdown')
    .action(async (options: AuditOptions) => {
      try {
        const rootDir = path.resolve(options.path)

        let isDirectory = false
        try {
          isDirectory = fs.statSync(rootDir).isDirectory()
        } catch {
          isDirectory = false
        }

        if (!isDirectory) {
          console.error(`El directorio no existe: ${rootDir}`)
          process.exitCode = 1
          return
        }

        const report = await runAnalysis({ rootDir })

        if (options.output === 'html') {
          console.log(renderHtmlReport(report))
        } else if (options.output === 'json') {
          console.log(JSON.stringify(toAuditReportDto(report), null, 2))
        } else {
          console.log(renderMarkdownReport(report))
        }
      } catch (error: unknown) {
        console.error(error instanceof Error ? error.message : String(error))
        process.exitCode = 1
      }
    })
}
