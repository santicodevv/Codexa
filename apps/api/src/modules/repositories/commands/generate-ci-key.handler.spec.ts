import { NotFoundException } from '@nestjs/common'
import type { PrismaService } from '../../../common/prisma/prisma.service'
import { GenerateCiKeyCommand } from './generate-ci-key.command'
import { GenerateCiKeyHandler } from './generate-ci-key.handler'

describe('GenerateCiKeyHandler', () => {
  function buildHandler() {
    const prisma = { repository: { updateMany: jest.fn() } }
    const handler = new GenerateCiKeyHandler(prisma as unknown as PrismaService)
    return { handler, prisma }
  }

  it('lanza NotFoundException si el repositorio no existe o no es del owner', async () => {
    const { handler, prisma } = buildHandler()
    prisma.repository.updateMany.mockResolvedValue({ count: 0 })

    await expect(handler.execute(new GenerateCiKeyCommand('repo-1', 'owner-1'))).rejects.toThrow(
      NotFoundException,
    )
  })

  it('genera una key con prefijo cxa_ y persiste solo su hash', async () => {
    const { handler, prisma } = buildHandler()
    prisma.repository.updateMany.mockResolvedValue({ count: 1 })

    const result = await handler.execute(new GenerateCiKeyCommand('repo-1', 'owner-1'))

    expect(result.apiKey).toMatch(/^cxa_[0-9a-f]{48}$/)
    expect(prisma.repository.updateMany).toHaveBeenCalledWith({
      where: { id: 'repo-1', ownerId: 'owner-1' },
      data: { ciApiKeyHash: expect.any(String) },
    })
    const persistedHash = prisma.repository.updateMany.mock.calls[0][0].data.ciApiKeyHash
    expect(persistedHash).not.toBe(result.apiKey)
  })
})
