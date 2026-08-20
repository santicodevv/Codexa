import path from 'node:path'
import { LanguageId } from '@codexa/contracts'
import { buildRepoSummary, collectSourceFiles, detectLanguage } from './repo-collector'

const FIXTURES_DIR = path.resolve(process.cwd(), 'tools/fixtures')

describe('repo-collector', () => {
  describe('collectSourceFiles', () => {
    it('given ts-basic, then returns only src files with no node_modules and no dotfiles', async () => {
      const files = await collectSourceFiles(path.join(FIXTURES_DIR, 'ts-basic'))

      expect(files).toEqual(
        expect.arrayContaining([
          'src/index.ts',
          'src/legacy.ts',
          'src/main.ts',
          'src/math.ts',
          'src/plain.js',
        ]),
      )
      expect(files.some((file) => file.includes('node_modules'))).toBe(false)
      expect(files.some((file) => file.split('/').some((segment) => segment.startsWith('.')))).toBe(
        false,
      )
      expect(files).toEqual([...files].sort())
    })

    it('given an unexisting path, then rejects with a clear error', async () => {
      const missingDir = path.join(FIXTURES_DIR, 'does-not-exist')

      await expect(collectSourceFiles(missingDir)).rejects.toThrow(
        `El directorio no existe: ${missingDir}`,
      )
    })
  })

  describe('detectLanguage', () => {
    it('given ts-basic, then returns Typescript', async () => {
      const files = await collectSourceFiles(path.join(FIXTURES_DIR, 'ts-basic'))

      expect(detectLanguage(files)).toBe(LanguageId.Typescript)
    })

    it('given js-esm, then returns Javascript', async () => {
      const files = await collectSourceFiles(path.join(FIXTURES_DIR, 'js-esm'))

      expect(detectLanguage(files)).toBe(LanguageId.Javascript)
    })

    it('given no files, then returns Unknown', () => {
      expect(detectLanguage([])).toBe(LanguageId.Unknown)
    })

    it('given a tie between typescript and javascript, then returns Typescript', () => {
      expect(detectLanguage(['src/a.ts', 'src/b.js'])).toBe(LanguageId.Typescript)
    })
  })

  describe('buildRepoSummary', () => {
    it('given ts-basic, then returns name ts-basic, fileCount correcto, language Typescript y dependencyCount 0', async () => {
      const rootDir = path.join(FIXTURES_DIR, 'ts-basic')
      const files = await collectSourceFiles(rootDir)
      const summary = await buildRepoSummary(rootDir, files, detectLanguage(files))

      expect(summary.name).toBe('ts-basic')
      expect(summary.fileCount).toBe(files.length)
      expect(summary.language).toBe(LanguageId.Typescript)
      expect(summary.dependencyCount).toBe(0)
      expect(summary.analyzedAt).toBeTruthy()
    })
  })
})
