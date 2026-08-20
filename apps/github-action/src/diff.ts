const HUNK_HEADER = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/

/**
 * Devuelve el conjunto de números de línea (en la versión nueva del archivo) que fueron
 * agregados por el PR, a partir del `patch` unificado que devuelve la API de GitHub
 * (GET /repos/{owner}/{repo}/pulls/{pr}/files). Solo esas líneas son válidas para comentarios
 * inline (regla de docs/13-GitHub-Integration.md §4.2: "solo se comentan hallazgos en líneas
 * que pertenecen al diff del PR").
 */
export function addedLinesFromPatch(patch: string): Set<number> {
  const added = new Set<number>()
  let currentLine = 0

  for (const line of patch.split('\n')) {
    const hunkMatch = HUNK_HEADER.exec(line)
    if (hunkMatch !== null) {
      currentLine = Number(hunkMatch[1])
      continue
    }
    if (currentLine === 0) {
      continue
    }
    if (line.startsWith('+')) {
      added.add(currentLine)
      currentLine += 1
    } else if (line.startsWith('-')) {
      // Línea eliminada: no existe en el archivo nuevo, no avanza el contador.
    } else {
      // Línea de contexto: existe en ambas versiones.
      currentLine += 1
    }
  }

  return added
}

export interface ChangedFile {
  filePath: string
  addedLines: Set<number>
}

export function buildChangedFilesMap(
  files: Array<{ filename: string; patch?: string }>,
): Map<string, Set<number>> {
  const map = new Map<string, Set<number>>()
  for (const file of files) {
    if (file.patch === undefined) {
      continue
    }
    map.set(file.filename, addedLinesFromPatch(file.patch))
  }
  return map
}
