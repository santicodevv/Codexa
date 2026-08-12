import fs from 'node:fs'
import path from 'node:path'
import type { Command } from 'commander'
import { runAnalysis } from '@codexa/analysis'
import { runAiSuggestions } from './ai-suggestions'
import { renderHtmlReport } from '../report/html-reporter'
import { renderMarkdownReport } from '../report/markdown-reporter'
import { toAuditReportDto } from '../report/map-report'

interface AuditOptions {
  path: string
  provider?: string
  llmKey?: string
  output: string
  file?: string
}

/**
 * Registra el comando `audit`. Las sugerencias de IA se activan pasando
 * `--provider` explícitamente (junto a `LLM_API_KEY`/`ANTHROPIC_API_KEY`
 * en el entorno o `--llm-key`); sin credenciales la auditoría se completa
 * igualmente, solo sin sugerencias.
 */
export function registerAuditCommand(program: Command): void {
  program
    .command('audit')
    .description('Ejecuta una auditoría en un repositorio local')
    .requiredOption('--path <path>', 'Ruta al repositorio a auditar')
    .option('--provider <provider>', 'Proveedor LLM para sugerencias de IA (anthropic|openai|deepseek|kimi|nvidia|openai-compatible)')
    .option('--llm-key <key>', 'Clave de API del proveedor LLM (por defecto LLM_API_KEY o ANTHROPIC_API_KEY)')
    .option('--output <format>', 'Formato de reporte: markdown|html|json', 'markdown')
    .option('--file <path>', 'Ruta del archivo donde escribir el reporte (UTF-8)')
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

        let suggestions = undefined
        if (options.provider !== undefined) {
          const outcome = await runAiSuggestions({
            rootDir,
            findings: report.findings,
            repoSummary: report.summary,
            healthScore: report.healthScore,
            provider: options.provider,
            apiKey: options.llmKey,
          })
          suggestions = outcome.suggestions
        }

        const reportWithSuggestions = { ...report, ...(suggestions !== undefined ? { suggestions } : {}) }

        const rendered =
          options.output === 'html'
            ? renderHtmlReport(reportWithSuggestions)
            : options.output === 'json'
              ? JSON.stringify(toAuditReportDto(reportWithSuggestions), null, 2)
              : renderMarkdownReport(reportWithSuggestions)

        if (options.file !== undefined) {
          const outputPath = path.resolve(options.file)
          fs.mkdirSync(path.dirname(outputPath), { recursive: true })
          fs.writeFileSync(outputPath, rendered, 'utf8')
          console.error(`Reporte escrito en: ${outputPath}`)
        } else {
          console.log(rendered)
        }
      } catch (error: unknown) {
        console.error(error instanceof Error ? error.message : String(error))
        process.exitCode = 1
      }
    })
}
