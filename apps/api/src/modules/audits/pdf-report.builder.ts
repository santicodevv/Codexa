import PDFDocument from 'pdfkit'

interface FindingData {
  severity: string
  message: string
  filePath: string
  lineNumber: number | null
  ruleId: string
}

interface SuggestionData {
  type: string
  title: string
  description: string
  targetFile: string | null
  targetLine: number | null
}

interface ModuleSummaryData {
  moduleName: string
  moduleScore: number
  findingCount: number
}

export interface AuditPdfData {
  id: string
  repository: { name: string; url: string }
  status: string
  commitSha: string | null
  provider: string | null
  model: string | null
  healthScore: number | null
  severityCounts: { critical: number; medium: number; low: number }
  totalFindings: number | null
  estimatedDebtHours: unknown
  startedAt: Date | string | null
  completedAt: Date | string | null
  findings: FindingData[]
  suggestions: SuggestionData[]
  moduleSummaries: ModuleSummaryData[]
}

export async function buildAuditPdf(audit: AuditPdfData): Promise<Buffer> {
  const doc = new PDFDocument({ margin: 50 })
  const chunks: Buffer[] = []
  doc.on('data', (chunk: Buffer) => chunks.push(chunk))

  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
  })

  renderHeader(doc, audit)
  renderSummary(doc, audit)
  renderModuleSummaries(doc, audit.moduleSummaries)
  renderSuggestions(doc, audit.suggestions)
  renderFindings(doc, audit.findings)

  doc.end()
  return done
}

function renderHeader(doc: PDFKit.PDFDocument, audit: AuditPdfData): void {
  doc.fontSize(20).text('Codexa — Reporte de Auditoría', { align: 'left' })
  doc.moveDown(0.3)
  doc.fontSize(11).fillColor('#555555')
  doc.text(`Repositorio: ${audit.repository.name}`)
  doc.text(`Commit: ${audit.commitSha ?? 'sin commit'}`)
  doc.text(`Proveedor: ${audit.provider ?? '—'}${audit.model !== null ? ` (${audit.model})` : ''}`)
  doc.text(`Generado: ${new Date().toLocaleString('es')}`)
  doc.fillColor('#000000')
  doc.moveDown()
}

function renderSummary(doc: PDFKit.PDFDocument, audit: AuditPdfData): void {
  doc.fontSize(14).text('Resumen', { underline: true })
  doc.moveDown(0.3)
  doc.fontSize(12)
  doc.text(`Health Score: ${audit.healthScore ?? '—'} / 100`)
  doc.text(
    `Hallazgos: ${audit.totalFindings ?? 0} (${audit.severityCounts.critical} críticos, ${audit.severityCounts.medium} medios, ${audit.severityCounts.low} bajos)`,
  )
  doc.text(
    `Deuda técnica estimada: ${audit.estimatedDebtHours === null ? '—' : `${Number(audit.estimatedDebtHours).toFixed(1)} h`}`,
  )
  doc.moveDown()
}

function renderModuleSummaries(doc: PDFKit.PDFDocument, modules: ModuleSummaryData[]): void {
  if (modules.length === 0) {
    return
  }
  doc.fontSize(14).text('Resumen por módulo', { underline: true })
  doc.moveDown(0.3)
  doc.fontSize(10)
  for (const module of modules) {
    doc.text(`${module.moduleName} — score ${module.moduleScore} (${module.findingCount} hallazgos)`)
  }
  doc.moveDown()
}

function renderSuggestions(doc: PDFKit.PDFDocument, suggestions: SuggestionData[]): void {
  if (suggestions.length === 0) {
    return
  }
  doc.fontSize(14).text('Sugerencias de IA', { underline: true })
  doc.moveDown(0.3)
  doc.fontSize(10)
  for (const suggestion of suggestions) {
    doc.font('Helvetica-Bold').text(`[${suggestion.type}] ${suggestion.title}`)
    doc.font('Helvetica').text(suggestion.description)
    if (suggestion.targetFile !== null) {
      doc.fillColor('#555555').text(
        `${suggestion.targetFile}${suggestion.targetLine !== null ? `:${suggestion.targetLine}` : ''}`,
      )
      doc.fillColor('#000000')
    }
    doc.moveDown(0.5)
  }
  doc.moveDown(0.5)
}

function renderFindings(doc: PDFKit.PDFDocument, findings: FindingData[]): void {
  doc.fontSize(14).text(`Hallazgos (${findings.length})`, { underline: true })
  doc.moveDown(0.3)
  doc.fontSize(9)
  for (const finding of findings) {
    const location = `${finding.filePath}${finding.lineNumber !== null ? `:${finding.lineNumber}` : ''}`
    doc.text(`[${finding.severity.toUpperCase()}] ${finding.message} — ${location} (${finding.ruleId})`)
  }
}
