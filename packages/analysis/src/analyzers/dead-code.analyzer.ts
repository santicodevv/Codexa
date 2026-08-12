import { promises as fs } from 'node:fs'
import path from 'node:path'
import { FindingSeverity } from '@codexa/contracts'
import ts from 'typescript'
import type { AnalysisContext, AnalyzerResult, IAnalyzer } from '../interfaces/analyzer.interface'
import type { Finding } from '../interfaces/result.types'

type DeclarationKind = 'function' | 'class' | 'variable'

interface TopLevelDeclaration {
  name: string
  kind: DeclarationKind
  exported: boolean
  filePath: string
  lineNumber: number
  columnNumber: number
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

function hasExportModifier(modifiers: ts.NodeArray<ts.ModifierLike> | undefined): boolean {
  if (modifiers === undefined) {
    return false
  }
  return modifiers.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)
}

function getLineNumber(sourceFile: ts.SourceFile, node: ts.Node): number {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1
}

function getColumnNumber(sourceFile: ts.SourceFile, node: ts.Node): number {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).character + 1
}

function collectDeclarations(sourceFile: ts.SourceFile, filePath: string): TopLevelDeclaration[] {
  const declarations: TopLevelDeclaration[] = []
  for (const statement of sourceFile.statements) {
    if (ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) {
      if (statement.name === undefined) {
        continue
      }
      declarations.push({
        name: statement.name.text,
        kind: ts.isFunctionDeclaration(statement) ? 'function' : 'class',
        exported: hasExportModifier(statement.modifiers),
        filePath,
        lineNumber: getLineNumber(sourceFile, statement),
        columnNumber: getColumnNumber(sourceFile, statement),
      })
    } else if (ts.isVariableStatement(statement)) {
      const exported = hasExportModifier(statement.modifiers)
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)) {
          declarations.push({
            name: declaration.name.text,
            kind: 'variable',
            exported,
            filePath,
            lineNumber: getLineNumber(sourceFile, declaration),
            columnNumber: getColumnNumber(sourceFile, declaration),
          })
        }
      }
    }
  }
  return declarations
}

function isExcludedName(node: ts.Identifier): boolean {
  const parent = node.parent
  if (ts.isPropertyAccessExpression(parent)) {
    return node === parent.name
  }
  if (ts.isShorthandPropertyAssignment(parent)) {
    return node === parent.name
  }
  if (
    ts.isFunctionDeclaration(parent) ||
    ts.isVariableDeclaration(parent) ||
    ts.isClassDeclaration(parent) ||
    ts.isParameter(parent) ||
    ts.isPropertyDeclaration(parent)
  ) {
    return node === parent.name
  }
  return false
}

function collectReferences(sourceFile: ts.SourceFile): Map<string, number> {
  const references = new Map<string, number>()
  function visit(node: ts.Node): void {
    if (ts.isIdentifier(node) && !isExcludedName(node)) {
      references.set(node.text, (references.get(node.text) ?? 0) + 1)
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)
  return references
}

/**
 * Detecta símbolos de nivel superior sin uso mediante un conteo name-based de
 * identificadores. Limitaciones del MVP: el shadowing de nombres produce tanto
 * falsos negativos como positivos, y una API exportada sin importadores internos
 * (p. ej. una librería consumida solo desde fuera del repo) se marca como muerta.
 */
export class DeadCodeAnalyzer implements IAnalyzer {
  readonly id = 'dead-code'

  async analyze(context: AnalysisContext): Promise<AnalyzerResult> {
    const startedAt = Date.now()
    const findings: Finding[] = []
    const files = context.files.filter(isSourceFileEligible)

    const declarationsByFile = new Map<string, TopLevelDeclaration[]>()
    const referencesByFile = new Map<string, Map<string, number>>()

    for (const file of files) {
      const text = await fs.readFile(path.join(context.rootDir, file), 'utf8')
      const sourceFile = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true)
      declarationsByFile.set(file, collectDeclarations(sourceFile, file))
      referencesByFile.set(file, collectReferences(sourceFile))
    }

    const otherFileCount = files.length - 1

    for (const [file, declarations] of declarationsByFile) {
      const ownReferences = referencesByFile.get(file) ?? new Map<string, number>()
      for (const declaration of declarations) {
        let otherFileReferences = 0
        for (const [otherFile, references] of referencesByFile) {
          if (otherFile !== file) {
            otherFileReferences += references.get(declaration.name) ?? 0
          }
        }
        const ownReferenceCount = ownReferences.get(declaration.name) ?? 0
        const isDead = declaration.exported
          ? otherFileCount > 0 && otherFileReferences === 0 && ownReferenceCount === 0
          : otherFileReferences === 0 && ownReferenceCount === 0
        if (isDead) {
          findings.push({
            id: `dead-code:${declaration.filePath}:${declaration.lineNumber}:${declaration.columnNumber}`,
            ruleId: 'dead-code',
            severity: FindingSeverity.Low,
            message: `El símbolo '${declaration.name}' no se usa en ningún lugar del proyecto`,
            filePath: declaration.filePath,
            lineNumber: declaration.lineNumber,
            columnNumber: declaration.columnNumber,
            likelihood: 1,
            metadata: {
              kind: declaration.kind,
              exported: declaration.exported,
            },
          })
        }
      }
    }

    return {
      analyzer: this.id,
      status: 'passed',
      findings,
      durationMs: Date.now() - startedAt,
    }
  }
}
