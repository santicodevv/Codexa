import { addedLinesFromPatch, buildChangedFilesMap } from './diff'

describe('addedLinesFromPatch', () => {
  it('marca solo las líneas agregadas (no contexto ni eliminadas)', () => {
    const patch = [
      '@@ -10,3 +10,4 @@',
      ' const a = 1',
      '-const b = 2',
      '+const b = 22',
      '+const c = 3',
      ' const d = 4',
    ].join('\n')

    const added = addedLinesFromPatch(patch)
    expect([...added].sort((a, b) => a - b)).toEqual([11, 12])
  })

  it('soporta múltiples hunks', () => {
    const patch = [
      '@@ -1,2 +1,3 @@',
      ' a',
      '+b',
      ' c',
      '@@ -20,2 +21,3 @@',
      ' x',
      '+y',
      ' z',
    ].join('\n')

    const added = addedLinesFromPatch(patch)
    expect([...added].sort((a, b) => a - b)).toEqual([2, 22])
  })

  it('devuelve un set vacío para un patch sin agregados', () => {
    const patch = ['@@ -1,2 +1,2 @@', ' a', ' b'].join('\n')
    expect(addedLinesFromPatch(patch).size).toBe(0)
  })
})

describe('buildChangedFilesMap', () => {
  it('ignora archivos sin patch (binarios o demasiado grandes)', () => {
    const map = buildChangedFilesMap([
      { filename: 'a.ts', patch: '@@ -1,1 +1,2 @@\n a\n+b' },
      { filename: 'binary.png' },
    ])

    expect(map.has('a.ts')).toBe(true)
    expect(map.has('binary.png')).toBe(false)
  })
})
