import * as core from '@actions/core'
import * as github from '@actions/github'
import { CodexaApiClient } from './api-client'
import { buildReviewComments, buildSummaryComment } from './comment-formatter'
import { buildChangedFilesMap } from './diff'
import { shouldFailOnCritical } from './threshold'

const POLL_INTERVAL_MS = 5_000
const POLL_TIMEOUT_MS = 5 * 60 * 1000

async function run(): Promise<void> {
  const apiUrl = core.getInput('api-url', { required: true })
  const apiKey = core.getInput('api-key', { required: true })
  const llmProvider = core.getInput('llm-provider') || undefined
  const failOnCritical = Number.parseInt(core.getInput('fail-on-critical') || '0', 10)
  const githubToken = core.getInput('github-token', { required: true })

  const { context } = github
  const pullRequest = context.payload.pull_request
  const ref = typeof pullRequest?.head?.ref === 'string' ? pullRequest.head.ref : undefined

  const client = new CodexaApiClient(apiUrl, apiKey)

  core.info(`Disparando auditoría de Codexa${ref !== undefined ? ` (ref: ${ref})` : ''}...`)
  const { id: auditId } = await client.runCiAudit({ ref, provider: llmProvider })

  core.info(`Auditoría encolada (${auditId}), esperando resultado...`)
  const audit = await client.pollUntilFinished(auditId, {
    timeoutMs: POLL_TIMEOUT_MS,
    intervalMs: POLL_INTERVAL_MS,
  })

  if (audit.status === 'failed') {
    core.setFailed(`La auditoría falló: ${audit.errorMessage ?? 'error desconocido'}`)
    return
  }

  if (audit.healthScore !== null) {
    core.setOutput('health-score', audit.healthScore)
  }

  if (pullRequest !== undefined) {
    await publishPullRequestFeedback(githubToken, pullRequest.number, audit)
  } else {
    core.info('No hay Pull Request asociado a este evento; se omiten comentarios y check run.')
  }

  if (shouldFailOnCritical(audit.severityCounts.critical, failOnCritical)) {
    core.setFailed(
      `${audit.severityCounts.critical} hallazgo(s) crítico(s) (umbral: ${failOnCritical})`,
    )
  }
}

async function publishPullRequestFeedback(
  githubToken: string,
  prNumber: number,
  audit: Awaited<ReturnType<CodexaApiClient['pollUntilFinished']>>,
): Promise<void> {
  const octokit = github.getOctokit(githubToken)
  const { owner, repo } = github.context.repo

  await octokit.rest.issues.createComment({
    owner,
    repo,
    issue_number: prNumber,
    body: buildSummaryComment(audit, prNumber),
  })

  const { data: files } = await octokit.rest.pulls.listFiles({
    owner,
    repo,
    pull_number: prNumber,
    per_page: 100,
  })
  const changedLines = buildChangedFilesMap(files)
  const reviewComments = buildReviewComments(audit, changedLines)

  if (reviewComments.length > 0) {
    await octokit.rest.pulls.createReview({
      owner,
      repo,
      pull_number: prNumber,
      event: 'COMMENT',
      comments: reviewComments,
    })
  }

  const conclusion = audit.severityCounts.critical > 0 ? 'failure' : 'success'
  await octokit.rest.checks.create({
    owner,
    repo,
    name: 'Codexa Audit',
    head_sha: audit.commitSha ?? github.context.sha,
    status: 'completed',
    conclusion,
    output: {
      title: `Health Score: ${audit.healthScore ?? 'N/D'}`,
      summary: buildSummaryComment(audit, prNumber),
    },
  })
}

run().catch((error: unknown) => {
  core.setFailed(error instanceof Error ? error.message : String(error))
})
