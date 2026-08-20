import { execFileSync } from 'node:child_process'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { LanguageId } from '@codexa/contracts'
import type { RepoSummary } from '../interfaces/result.types'

export const DEFAULT_SKIPPED_DIRECTORIES: string[] = [
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  'out',
  'target',
  '.next',
  '.nuxt',
  '.cache',
  '__fixtures__',
  'tools',
  '.venv',
  'venv',
  'bin',
  'obj',
]

const DEFAULT_EXTENSIONS: string[] = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']

const TYPESCRIPT_EXTENSIONS: ReadonlySet<string> = new Set(['.ts', '.tsx'])

const JAVASCRIPT_EXTENSIONS: ReadonlySet<string> = new Set(['.js', '.jsx', '.mjs', '.cjs'])

export interface RepoCollectorOptions {
  extensions?: string[]
}

function toPosixPath(relativePath: string): string {
  return relativePath.replaceAll(path.sep, '/')
}

async function walkDirectory(
  rootDir: string,
  extensionSet: ReadonlySet<string>,
): Promise<string[]> {
  const relativeFiles: string[] = []

  async function walk(currentDir: string): Promise<void> {
    const entries = await fs.readdir(currentDir, { withFileTypes: true })

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const isSkipped = DEFAULT_SKIPPED_DIRECTORIES.some(
          (skipped) => entry.name.toLowerCase() === skipped.toLowerCase(),
        )
        if (!isSkipped) {
          await walk(path.join(currentDir, entry.name))
        }
      } else if (entry.isFile()) {
        if (entry.name.endsWith('.d.ts')) {
          continue
        }
        if (!extensionSet.has(path.extname(entry.name))) {
          continue
        }
        relativeFiles.push(toPosixPath(path.relative(rootDir, path.join(currentDir, entry.name))))
      }
    }
  }

  await walk(rootDir)
  return relativeFiles
}

export async function collectSourceFiles(
  rootDir: string,
  options: RepoCollectorOptions = {},
): Promise<string[]> {
  const extensionSet = new Set(options.extensions ?? DEFAULT_EXTENSIONS)

  try {
    const rootStat = await fs.stat(rootDir)
    if (!rootStat.isDirectory()) {
      throw new Error(`El directorio no existe: ${rootDir}`)
    }
  } catch {
    throw new Error(`El directorio no existe: ${rootDir}`)
  }

  const relativeFiles = await walkDirectory(rootDir, extensionSet)
  return relativeFiles.sort()
}

export function detectLanguage(files: string[]): LanguageId {
  let typescriptCount = 0
  let javascriptCount = 0

  for (const file of files) {
    const extension = path.extname(file)
    if (TYPESCRIPT_EXTENSIONS.has(extension)) {
      typescriptCount += 1
    } else if (JAVASCRIPT_EXTENSIONS.has(extension)) {
      javascriptCount += 1
    }
  }

  if (typescriptCount > javascriptCount) {
    return LanguageId.Typescript
  }
  if (javascriptCount > typescriptCount) {
    return LanguageId.Javascript
  }
  if (typescriptCount === 0 && javascriptCount === 0) {
    return LanguageId.Unknown
  }
  return LanguageId.Typescript
}

async function countDependencies(rootDir: string): Promise<number> {
  try {
    const packageJsonContent = await fs.readFile(path.join(rootDir, 'package.json'), 'utf8')
    const packageJson = JSON.parse(packageJsonContent) as {
      dependencies?: Record<string, string>
      devDependencies?: Record<string, string>
    }
    const dependencies = packageJson.dependencies ?? {}
    const devDependencies = packageJson.devDependencies ?? {}
    return Object.keys(dependencies).length + Object.keys(devDependencies).length
  } catch {
    return 0
  }
}

function readCommitSha(rootDir: string): string | undefined {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: rootDir,
      encoding: 'utf8',
    }).trim()
  } catch {
    return undefined
  }
}

export async function buildRepoSummary(
  rootDir: string,
  files: string[],
  language: LanguageId,
): Promise<RepoSummary> {
  const resolvedRoot = path.resolve(rootDir)
  const commitSha = readCommitSha(rootDir)

  return {
    name: path.basename(resolvedRoot),
    language,
    fileCount: files.length,
    dependencyCount: await countDependencies(rootDir),
    ...(commitSha !== undefined ? { commitSha } : {}),
    analyzedAt: new Date().toISOString(),
  }
}
