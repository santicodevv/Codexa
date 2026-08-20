import { execFile } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common'
import type { ConfigService } from '@nestjs/config'
import { AuditStatus, ServiceException } from '@codexa/contracts'
import type { AiSuggestionDto } from '@codexa/contracts'
import {
  analyzeAndSuggest,
  createLanguageModel,
  hasLlmCredentials,
  resolveLlmConfig,
} from '@codexa/ai'
import type { AnalysisReport, Finding } from '@codexa/analysis'
import { runAnalysis } from '@codexa/analysis'
import type { Queue } from 'bullmq'
import { AUDITS_QUEUE, RUN_AUDIT_JOB } from '../../common/queue/queue.constants'
import type { PrismaService } from '../../common/prisma/prisma.service'
import type { RedisService } from '../../common/redis/redis.service'

const execFileAsync = promisify(execFile)
const DEFAULT_LLM_CACHE_TTL_SECONDS = 60 * 60 * 24

@Injectable()
export class AuditsService {
  private readonly logger = new Logger(AuditsService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly redis: RedisService,
    @Inject(AUDITS_QUEUE) private readonly auditsQueue: Queue,
  ) {}

  async enqueue(
    repositoryId: string,
    ownerId: string,
    provider?: string,
    modelName?: string,
    ref?: string,
  ): Promise<{ id: string; status: string }> {
    const repository = await this.prisma.repository.findFirst({
      where: { id: repositoryId, ownerId },
    })
    if (repository === null) {
      throw new NotFoundException('El repositorio no existe')
    }

    const audit = await this.prisma.audit.create({
      data: {
        repositoryId,
        triggeredBy: ownerId,
        status: AuditStatus.Pending,
        provider: provider ?? null,
        modelName: modelName ?? null,
      },
    })

    await this.auditsQueue.add(
      RUN_AUDIT_JOB,
      { auditId: audit.id, ref },
      {
        jobId: audit.id,
        attempts: 1,
        removeOnComplete: { count: 200 },
        removeOnFail: { count: 500 },
      },
    )

    return { id: audit.id, status: AuditStatus.Pending }
  }

  async processAudit(auditId: string, ref?: string): Promise<{ id: string; status: string }> {
    const audit = await this.prisma.audit.findUniqueOrThrow({
      where: { id: auditId },
      include: { repository: true },
    })
    await this.prisma.audit.update({
      where: { id: auditId },
      data: { status: AuditStatus.Running, startedAt: new Date() },
    })

    try {
      const started = Date.now()
      const sourcePath = await this.resolveSourcePath(
        audit.repository.url,
        audit.repository.localPath,
        ref,
      )
      const report = await runAnalysis({ rootDir: sourcePath })
      const llmRun = await this.runSuggestions(
        report,
        sourcePath,
        audit.repositoryId,
        audit.provider ?? undefined,
        audit.modelName ?? undefined,
      )

      await this.persistResults(audit.id, report, llmRun)
      await this.prisma.audit.update({
        where: { id: audit.id },
        data: {
          status: AuditStatus.Completed,
          commitSha: report.summary.commitSha ?? null,
          healthScore: report.healthScore,
          criticalCount: report.severityCounts.critical,
          mediumCount: report.severityCounts.medium,
          lowCount: report.severityCounts.low,
          totalFindings: report.findings.length,
          estimatedDebtHours: report.technicalDebtMinutes / 60,
          durationMs: Date.now() - started,
          completedAt: new Date(),
        },
      })
      await this.prisma.repository.update({
        where: { id: audit.repositoryId },
        data: { lastAuditAt: new Date() },
      })

      return { id: audit.id, status: AuditStatus.Completed }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      this.logger.error(`Auditoría ${audit.id} falló: ${message}`)
      await this.prisma.audit.update({
        where: { id: audit.id },
        data: { status: AuditStatus.Failed, errorMessage: message, completedAt: new Date() },
      })
      throw error
    }
  }

  private async resolveSourcePath(
    url: string,
    localPath: string | null,
    ref?: string,
  ): Promise<string> {
    if (localPath !== null && localPath.trim() !== '') {
      return path.resolve(localPath)
    }
    if (url !== null && url !== '') {
      return this.cloneRepository(url, ref)
    }
    throw new ServiceException(
      'El repositorio no tiene una fuente local ni remota',
      'repository.no_source',
      400,
    )
  }

  private async cloneRepository(url: string, ref?: string): Promise<string> {
    if (!/^(https?:\/\/|git@)[^\s]+$/.test(url)) {
      throw new ServiceException('URL de repositorio inválida', 'repository.invalid_url', 400)
    }
    if (ref !== undefined && !/^[\w./-]+$/.test(ref)) {
      throw new ServiceException('Ref de auditoría inválida', 'repository.invalid_ref', 400)
    }

    const workspace =
      this.config.get<string>('WORKSPACE_DIR') ?? path.join(os.tmpdir(), 'codexa-workspace')
    const destination = path.join(workspace, `${randomUUID()}`)
    const cloneArgs = ['clone', '--depth', '1']
    if (ref !== undefined) {
      cloneArgs.push('--branch', ref)
    }
    cloneArgs.push(url, destination)

    try {
      await execFileAsync('git', cloneArgs, { timeout: 120_000 })
      return destination
    } catch (error) {
      throw new ServiceException(
        `No se pudo clonar el repositorio: ${error instanceof Error ? error.message : 'error'}`,
        'repository.clone_failed',
        400,
      )
    }
  }

  private async runSuggestions(
    report: AnalysisReport,
    sourcePath: string,
    repositoryId: string,
    provider?: string,
    modelName?: string,
  ): Promise<SuggestionsResult | null> {
    const env = this.config.get('LLM_PROVIDER')
    const llmConfig = resolveLlmConfig({
      LLM_PROVIDER: provider ?? env,
      LLM_API_KEY: this.config.get('LLM_API_KEY') ?? undefined,
      ANTHROPIC_API_KEY: this.config.get('ANTHROPIC_API_KEY') ?? undefined,
      LLM_BASE_URL: this.config.get('LLM_BASE_URL') ?? undefined,
      LLM_MODEL_MINI: this.config.get('LLM_MODEL_MINI') ?? undefined,
      LLM_MODEL_PRO: this.config.get('LLM_MODEL_PRO') ?? undefined,
    })

    const credentialsAvailable = hasLlmCredentials({
      LLM_API_KEY: this.config.get('LLM_API_KEY') ?? undefined,
      ANTHROPIC_API_KEY: this.config.get('ANTHROPIC_API_KEY') ?? undefined,
    })
    if (!credentialsAvailable) {
      return null
    }

    const invokedModel = modelName ?? llmConfig.proModel
    const cacheKey = this.buildSuggestionsCacheKey(
      repositoryId,
      report.summary.commitSha,
      llmConfig.provider,
      invokedModel,
    )

    if (cacheKey !== null) {
      const cached = await this.redis.get(cacheKey)
      if (cached !== null) {
        this.logger.log(`Sugerencias de IA servidas desde caché (${cacheKey})`)
        const parsed = JSON.parse(cached) as CachedSuggestions
        return { ...parsed, inputTokens: 0, outputTokens: 0 }
      }
    }

    const model = createLanguageModel(llmConfig)
    const result = await analyzeAndSuggest({
      rootDir: sourcePath,
      findings: report.findings,
      repoSummary: report.summary,
      model,
      modelName: invokedModel,
      healthScore: report.healthScore,
    })

    const suggestionsResult: SuggestionsResult = {
      suggestions: result.suggestions,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      degraded: result.degraded,
      provider: llmConfig.provider,
      modelName: llmConfig.proModel,
    }

    if (cacheKey !== null) {
      const cacheable: CachedSuggestions = {
        suggestions: suggestionsResult.suggestions,
        degraded: suggestionsResult.degraded,
        provider: suggestionsResult.provider,
        modelName: suggestionsResult.modelName,
      }
      const ttlSeconds = Number(
        this.config.get<string>('LLM_CACHE_TTL_SECONDS') ?? String(DEFAULT_LLM_CACHE_TTL_SECONDS),
      )
      await this.redis.set(cacheKey, JSON.stringify(cacheable), ttlSeconds)
    }

    return suggestionsResult
  }

  private buildSuggestionsCacheKey(
    repositoryId: string,
    commitSha: string | undefined,
    provider: string,
    modelName: string,
  ): string | null {
    if (commitSha === undefined || commitSha.trim() === '') {
      return null
    }
    return `llm:suggestions:${repositoryId}:${commitSha}:${provider}:${modelName}`
  }

  private async persistResults(
    auditId: string,
    report: AnalysisReport,
    llmRun: SuggestionsResult | null,
  ): Promise<void> {
    const findings = report.findings.map((finding) => ({
      auditId,
      ruleId: finding.ruleId,
      severity: finding.severity,
      likelihood: finding.likelihood,
      message: finding.message,
      filePath: finding.filePath,
      lineNumber: finding.lineNumber ?? null,
      columnNumber: finding.columnNumber ?? null,
      metadata: (finding.metadata ?? {}) as object,
    }))

    const suggestions = (llmRun?.suggestions ?? []).map((suggestion) => ({
      auditId,
      type: suggestion.type,
      title: suggestion.title,
      description: suggestion.description,
      targetFile: suggestion.targetFile ?? null,
      targetLine: suggestion.targetLine ?? null,
      codeBlocks: suggestion.codeBlocks,
      modelReasoning: llmRun?.modelName ?? null,
    }))

    const moduleSummaries = groupByModule(auditId, report.findings)

    await this.prisma.$transaction([
      this.prisma.finding.createMany({ data: findings }),
      ...(suggestions.length > 0
        ? [this.prisma.aiSuggestion.createMany({ data: suggestions })]
        : []),
      this.prisma.moduleSummary.createMany({ data: moduleSummaries }),
      ...(llmRun !== null && llmRun.inputTokens + llmRun.outputTokens > 0
        ? [
            this.prisma.llmUsage.create({
              data: {
                auditId,
                provider: llmRun.provider,
                modelName: llmRun.modelName,
                inputTokens: llmRun.inputTokens,
                outputTokens: llmRun.outputTokens,
              },
            }),
          ]
        : []),
    ])
  }
}

interface SuggestionsResult {
  suggestions: AiSuggestionDto[]
  inputTokens: number
  outputTokens: number
  degraded: boolean
  provider: string
  modelName: string
}

interface CachedSuggestions {
  suggestions: AiSuggestionDto[]
  degraded: boolean
  provider: string
  modelName: string
}

function groupByModule(auditId: string, findings: Finding[]): ModuleSummaryInput[] {
  const counts = new Map<string, number>()
  for (const finding of findings) {
    const moduleName = finding.filePath.split('/')[0] || 'root'
    counts.set(moduleName, (counts.get(moduleName) ?? 0) + 1)
  }
  return [...counts.entries()].map(([moduleName, findingCount]) => ({
    auditId,
    moduleName,
    findingCount,
    moduleScore: Math.max(0, 100 - findingCount * 5),
    breakdown: {},
  }))
}

interface ModuleSummaryInput {
  auditId: string
  moduleName: string
  findingCount: number
  moduleScore: number
  breakdown: Record<string, never>
}