import { UnauthorizedException } from '@nestjs/common'
import type { ExecutionContext } from '@nestjs/common'
import type { PrismaService } from '../prisma/prisma.service'
import { CiApiKeyGuard, hashCiApiKey } from './ci-api-key.guard'

function buildContext(headers: Record<string, string>): ExecutionContext {
  const request = { headers }
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext
}

describe('CiApiKeyGuard', () => {
  function buildGuard() {
    const prisma = { repository: { findUnique: jest.fn() } }
    const guard = new CiApiKeyGuard(prisma as unknown as PrismaService)
    return { guard, prisma }
  }

  it('rechaza si falta el header de la API key', async () => {
    const { guard } = buildGuard()
    await expect(guard.canActivate(buildContext({}))).rejects.toThrow(UnauthorizedException)
  })

  it('rechaza si la API key no matchea ningún repositorio', async () => {
    const { guard, prisma } = buildGuard()
    prisma.repository.findUnique.mockResolvedValue(null)

    await expect(
      guard.canActivate(buildContext({ 'x-codexa-api-key': 'cxa_invalid' })),
    ).rejects.toThrow(UnauthorizedException)
  })

  it('adjunta el repositorio a la request y permite el acceso con una key válida', async () => {
    const { guard, prisma } = buildGuard()
    const repository = { id: 'repo-1', ownerId: 'owner-1' }
    prisma.repository.findUnique.mockResolvedValue(repository)

    const request = { headers: { 'x-codexa-api-key': 'cxa_valid' } }
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext

    await expect(guard.canActivate(context)).resolves.toBe(true)
    expect((request as unknown as { repository: unknown }).repository).toBe(repository)
    expect(prisma.repository.findUnique).toHaveBeenCalledWith({
      where: { ciApiKeyHash: hashCiApiKey('cxa_valid') },
    })
  })
})
