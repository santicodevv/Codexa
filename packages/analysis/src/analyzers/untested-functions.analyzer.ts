import { promises as fs } from 'node:fs'
import path from 'node:path'
import { FindingSeverity } from '@codexa/contracts'
import ts from 'typescript'
import type { AnalysisContext, AnalyzerResult, IAnalyzer } from '../interfaces/analyzer.interface'
import type { Finding } from '../interfaces/result.types'

const RULE_ID = 'untested-function'

const SOURCE_EXTENSIONS: ReadonlySet<string> = new Set(['.ts', '.tsx'])

const TEST_SUFFIXES: readonly string[] = ['.spec.ts', '.test.ts', '.spec.tsx', '.test.tsx']

interface ExportedFunction {
  name: string
  lineNumber: number
  columnNumber: number
}

/**
 * Analizador de funciones exportadas sin tests (heurística determinista del MVP).
 *
 * Para cada archivo fuente busca un archivo de test candidato por convención de
 * nombres (`c.spec.ts`, `c.test.ts`, `c.spec.tsx`, `c.test.tsx`, o dentro de
 * `__tests__`) y considera cubierta una función si su nombre aparece como
 * substring en alguno de esos tests.
 *
 * Limitaciones conocidas del MVP:
 * - Solo analiza funciones; quedan fuera las clases, los métodos y los default
 *   exports anónimos.
 * - La cobertura se determina por substring, por lo que puede producir falsos
 *   positivos si el nombre aparece en un comentario o en otro contexto.
 * - No se resuelven re-exports, imports con alias ni archivos barrel/index.
 * - Los tests en directorios no convencionales (p.ej. `test/`) no se detectan.
 * - El status siempre es 'passed' porque los hallazgos son de severidad Info.
 */
export class UntestedFunctionsAnalyzer implements IAnalyzer {
  readonly id = RULE_ID

  async analyze(context: AnalysisContext): Promise<AnalyzerResult> {
    const startedAt = Date.now()
    const filesSet = new Set(context.files)
    const sourceFiles = context.files.filter((file) => this.isSourceFile(file))

    const findings: Finding[] = []

    for (const sourceFile of sourceFiles) {
      const sourceText = await fs.readFile(path.join(context.rootDir, sourceFile), 'utf8')
      const sourceFileNode = ts.createSourceFile(
        sourceFile,
        sourceText,
        ts.ScriptTarget.Latest,
        true,
      )

      const exportedFunctions = collectExportedFunctions(sourceFileNode)
      if (exportedFunctions.length === 0) {
        continue
      }

      const existingTestFiles = this.candidateTestFiles(sourceFile).filter((candidate) =>
        filesSet.has(candidate),
      )

      const testContents: string[] = []
      for (const testFile of existingTestFiles) {
        try {
          testContents.push(await fs.readFile(path.join(context.rootDir, testFile), 'utf8'))
        } catch {
          testContents.push('')
        }
      }

      for (const exportedFunction of exportedFunctions) {
        const isReferenced = testContents.some((content) => content.includes(exportedFunction.name))
        if (existingTestFiles.length > 0 && isReferenced) {
          continue
        }
        findings.push(this.buildFinding(sourceFile, exportedFunction))
      }
    }

    return {
      analyzer: this.id,
      status: 'passed',
      findings,
      durationMs: Date.now() - startedAt,
    }
  }

  private isSourceFile(file: string): boolean {
    return (
      SOURCE_EXTENSIONS.has(path.posix.extname(file)) &&
      !file.endsWith('.d.ts') &&
      !file.endsWith('.spec.ts') &&
      !file.endsWith('.test.ts') &&
      !file.endsWith('.spec.tsx') &&
      !file.endsWith('.test.tsx')
    )
  }

  private candidateTestFiles(sourceFile: string): string[] {
    const directory = path.posix.dirname(sourceFile)
    const baseName = path.posix.basename(sourceFile, path.posix.extname(sourceFile))

    const candidates: string[] = []
    for (const suffix of TEST_SUFFIXES) {
      candidates.push(path.posix.join(directory, `${baseName}${suffix}`))
    }
    for (const suffix of TEST_SUFFIXES) {
      candidates.push(path.posix.join(directory, '__tests__', `${baseName}${suffix}`))
    }
    return candidates
  }

  private buildFinding(filePath: string, exportedFunction: ExportedFunction): Finding {
    return {
      id: `${RULE_ID}:${filePath}:${exportedFunction.lineNumber}:${exportedFunction.columnNumber}`,
      ruleId: RULE_ID,
      severity: FindingSeverity.Info,
      message: `La función exportada '${exportedFunction.name}' no tiene tests`,
      filePath,
      lineNumber: exportedFunction.lineNumber,
      columnNumber: exportedFunction.columnNumber,
      likelihood: 0.4,
      metadata: { functionName: exportedFunction.name },
    }
  }
}

function collectExportedFunctions(sourceFile: ts.SourceFile): ExportedFunction[] {
  const exportedFunctions: ExportedFunction[] = []

  for (const statement of sourceFile.statements) {
    if (ts.isFunctionDeclaration(statement)) {
      if (statement.name === undefined) {
        continue
      }
      if (!hasExportModifier(statement)) {
        continue
      }
      exportedFunctions.push(toExportedFunction(statement.name.text, statement, sourceFile))
      continue
    }

    if (ts.isVariableStatement(statement) && hasExportModifier(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        const initializer = declaration.initializer
        if (initializer === undefined) {
          continue
        }
        if (!ts.isArrowFunction(initializer) && !ts.isFunctionExpression(initializer)) {
          continue
        }
        if (!ts.isIdentifier(declaration.name)) {
          continue
        }
        exportedFunctions.push(toExportedFunction(declaration.name.text, declaration, sourceFile))
      }
    }
  }

  return exportedFunctions
}

function hasExportModifier(node: ts.HasModifiers): boolean {
  const modifiers = ts.getModifiers(node)
  if (modifiers === undefined) {
    return false
  }
  return modifiers.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)
}

function toExportedFunction(
  name: string,
  node: ts.Node,
  sourceFile: ts.SourceFile,
): ExportedFunction {
  const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile))
  return {
    name,
    lineNumber: position.line + 1,
    columnNumber: position.character + 1,
  }
}
