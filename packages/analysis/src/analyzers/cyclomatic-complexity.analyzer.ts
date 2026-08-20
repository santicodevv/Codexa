import { promises as fs } from 'node:fs'
import path from 'node:path'
import { FindingSeverity } from '@codexa/contracts'
import ts from 'typescript'
import type { AnalysisContext, AnalyzerResult, IAnalyzer } from '../interfaces/analyzer.interface'
import type { Finding } from '../interfaces/result.types'

interface NamedFunction {
  name: string | undefined
  node: ts.FunctionLikeDeclaration
  positionNode: ts.Node
}

const TYPESCRIPT_EXTENSIONS: ReadonlySet<string> = new Set(['.ts', '.tsx'])
const EXCLUDED_SUFFIXES: ReadonlyArray<string> = [
  '.d.ts',
  '.spec.ts',
  '.test.ts',
  '.spec.tsx',
  '.test.tsx',
]

function isSourceFileEligible(filePath: string): boolean {
  const extension = path.extname(filePath)
  if (!TYPESCRIPT_EXTENSIONS.has(extension)) {
    return false
  }
  return EXCLUDED_SUFFIXES.every((suffix) => !filePath.endsWith(suffix))
}

function isFunctionLike(node: ts.Node): boolean {
  return (
    ts.isFunctionDeclaration(node) ||
    ts.isFunctionExpression(node) ||
    ts.isArrowFunction(node) ||
    ts.isMethodDeclaration(node) ||
    ts.isGetAccessorDeclaration(node) ||
    ts.isSetAccessorDeclaration(node) ||
    ts.isConstructorDeclaration(node)
  )
}

function getPropertyNameText(name: ts.PropertyName | undefined): string | undefined {
  if (name === undefined || ts.isComputedPropertyName(name)) {
    return undefined
  }
  return name.text
}

function collectNamedFunctions(sourceFile: ts.SourceFile): NamedFunction[] {
  const functions: NamedFunction[] = []
  function visit(node: ts.Node): void {
    if (
      ts.isFunctionDeclaration(node) ||
      ts.isMethodDeclaration(node) ||
      ts.isGetAccessorDeclaration(node) ||
      ts.isSetAccessorDeclaration(node)
    ) {
      functions.push({
        name: getPropertyNameText(node.name),
        node,
        positionNode: node.name ?? node,
      })
    } else if (ts.isConstructorDeclaration(node)) {
      functions.push({ name: 'constructor', node, positionNode: node })
    } else if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
      const initializer = node.initializer
      if (
        initializer !== undefined &&
        (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer))
      ) {
        functions.push({ name: undefined, node: initializer, positionNode: initializer })
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)
  return functions
}

function computeCyclomaticComplexity(functionNode: ts.FunctionLikeDeclaration): number {
  if (functionNode.body === undefined) {
    return 1
  }
  let complexity = 1
  function walk(node: ts.Node): void {
    if (isFunctionLike(node)) {
      return
    }
    if (ts.isIfStatement(node)) {
      complexity += 1
    } else if (
      ts.isForStatement(node) ||
      ts.isForInStatement(node) ||
      ts.isForOfStatement(node) ||
      ts.isWhileStatement(node) ||
      ts.isDoStatement(node)
    ) {
      complexity += 1
    } else if (ts.isConditionalExpression(node)) {
      complexity += 1
    } else if (ts.isBinaryExpression(node)) {
      const operator = node.operatorToken.kind
      if (
        operator === ts.SyntaxKind.AmpersandAmpersandToken ||
        operator === ts.SyntaxKind.BarBarToken ||
        operator === ts.SyntaxKind.QuestionQuestionToken
      ) {
        complexity += 1
      }
    } else if (ts.isCaseClause(node) || ts.isCatchClause(node)) {
      complexity += 1
    }
    ts.forEachChild(node, walk)
  }
  walk(functionNode.body)
  return complexity
}

function createFinding(
  fn: NamedFunction,
  complexity: number,
  threshold: number,
  filePath: string,
  sourceFile: ts.SourceFile,
): Finding {
  const location = sourceFile.getLineAndCharacterOfPosition(fn.positionNode.getStart(sourceFile))
  const message =
    fn.name === undefined
      ? `La función anónima tiene complejidad ciclomática ${complexity} (umbral: ${threshold})`
      : `La función '${fn.name}' tiene complejidad ciclomática ${complexity} (umbral: ${threshold})`
  return {
    id: `cyclomatic-complexity:${filePath}:${location.line + 1}:${location.character + 1}`,
    ruleId: 'cyclomatic-complexity',
    severity: complexity >= 20 ? FindingSeverity.Medium : FindingSeverity.Low,
    message,
    filePath,
    lineNumber: location.line + 1,
    columnNumber: location.character + 1,
    likelihood: complexity >= 20 ? 0.9 : 0.7,
    metadata: { complexity, threshold },
  }
}

/**
 * Calcula la complejidad ciclomática por función contando únicamente las
 * estructuras de control del cuerpo propio; las funciones anidadas se ignoran
 * al computar la complejidad de la función que las contiene.
 */
export class CyclomaticComplexityAnalyzer implements IAnalyzer {
  readonly id = 'cyclomatic-complexity'
  readonly threshold: number

  constructor(threshold = 10) {
    this.threshold = threshold
  }

  async analyze(context: AnalysisContext): Promise<AnalyzerResult> {
    const startedAt = Date.now()
    const findings: Finding[] = []

    for (const file of context.files.filter(isSourceFileEligible)) {
      const text = await fs.readFile(path.join(context.rootDir, file), 'utf8')
      const sourceFile = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true)
      for (const fn of collectNamedFunctions(sourceFile)) {
        const complexity = computeCyclomaticComplexity(fn.node)
        if (complexity >= this.threshold) {
          findings.push(createFinding(fn, complexity, this.threshold, file, sourceFile))
        }
      }
    }

    const status: AnalyzerResult['status'] = findings.some(
      (finding) =>
        finding.severity === FindingSeverity.Medium ||
        finding.severity === FindingSeverity.High ||
        finding.severity === FindingSeverity.Critical,
    )
      ? 'failed'
      : 'passed'

    return {
      analyzer: this.id,
      status,
      findings,
      durationMs: Date.now() - startedAt,
    }
  }
}
