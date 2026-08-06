#Requires -Version 7
<#
.SYNOPSIS
  Exporta los diagramas Mermaid de los documentos de Codexa a PNG o SVG usando mmdc.

.DESCRIPTION
  Escanea docs/*.md en busca de bloques ```mermaid, escribe cada uno a un archivo .mmd
  temporal y lo renderiza con @mermaid-js/mermaid-cli (mmdc). Los .mmd se generan en
  out/_source/ para debug; las imágenes finales quedan en out/.

.PARAMETER Doc
  Número de documento a exportar (ej: "03"). Por defecto exporta todos.

.PARAMETER Format
  Formato de salida: "png" (default, 2x) o "svg".

.PARAMETER PngOut
  Directorio de salida. Default: "out".
#>
param(
    [string]$Doc = "",
    [ValidateSet('png', 'svg')]
    [string]$Format = 'png',
    [string]$PngOut = 'out'
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$docsDir = Join-Path $root 'docs'
$outDir  = Join-Path $PSScriptRoot $PngOut
$srcDir  = Join-Path $outDir '_source'
$ext     = if ($Format -eq 'svg') { 'svg' } else { 'png' }

# 1. Comprobar mmdc
if (-not (Get-Command 'mmdc' -ErrorAction SilentlyContinue)) {
    Write-Error "mmdc no encontrado. Instala con: npm i -g @mermaid-js/mermaid-cli"
    exit 1
}

# 2. Recopilar documentos
$docs = Get-ChildItem -Path (Join-Path $docsDir '*.md') | Where-Object {
    $_.Name -notlike 'diagrams*' -and $_.Name -notlike 'prompts*'
}
if ($Doc) { $docs = $docs | Where-Object { $_.Name -like "$Doc-*" } }

# 3. Extraer bloques mermaid
$blocks = [System.Collections.Generic.List[object]]::new()
foreach ($file in $docs) {
    $lines = Get-Content -LiteralPath $file.FullName
    $inBlock = $false
    $buf = [System.Collections.Generic.List[string]]::new()
    $docNum = ($file.Name -split '-')[0]
    $index = 0
    foreach ($line in $lines) {
        if ($line -match '^```mermaid') { $inBlock = $true; $buf = [System.Collections.Generic.List[string]]::new(); continue }
        if ($inBlock -and $line -match '^```') {
            $inBlock = $false
            $index++
            $slug = if ($buf[0] -match '^(flowchart|graph|sequenceDiagram|classDiagram|erDiagram|stateDiagram|gantt|pie)\s') {
                (($buf[0] -replace '^[^\s]+\s*', '') -replace '[^a-zA-Z0-9]+', '-') -replace '-+', '-'
            } else { "diagram" }
            $slug = $slug.Trim('-')
            if (-not $slug) { $slug = "diagram" }
            $blocks.Add([pscustomobject]@{ Doc = $docNum; Index = $index; Slug = $slug; Content = $buf -join "`n" })
            continue
        }
        if ($inBlock) { $buf.Add($line) }
    }
}

if ($blocks.Count -eq 0) { Write-Host 'No se encontraron diagramas.'; exit 0 }

# 4. Crear directorios
New-Item -ItemType Directory -Force -Path $srcDir | Out-Null

# 5. Renderizar cada bloque
$scale = if ($Format -eq 'png') { '2' } else { '1' }
foreach ($b in $blocks) {
    $mmdFile = Join-Path $srcDir ("{0}-{1:00}-{2}.mmd" -f $b.Doc, $b.Index, $b.Slug)
    Set-Content -LiteralPath $mmdFile -Value $b.Content -Encoding utf8
    $outFile = Join-Path $outDir ("{0}-{1:00}-{2}.{3}" -f $b.Doc, $b.Index, $b.Slug, $ext)
    Write-Host "Exportando $($b.Doc)-$($b.Index) $($b.Slug) -> $outFile"
    & mmdc --input $mmdFile --output $outFile --scale $scale
}

Write-Host "Listo: $($blocks.Count) diagramas en $outDir"
