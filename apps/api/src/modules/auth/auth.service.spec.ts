import { UnauthorizedException } from '@nestjs/common'
import type { JwtService } from '@nestjs/jwt'
import type { PrismaService } from '../../common/prisma/prisma.service'
import { AuthService, REFRESH_TOKEN_TTL_DAYS } from './auth.service'
import type { PasswordHasher } from './password-hasher'

describe('AuthService', () => {
  function buildService(overrides: Partial<Record<string, unknown>> = {}) {
    const prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      refreshToken: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    }
    const hasher = {
      hash: jest.fn(async (value: string) => `hash:${value}`),
      verify: jest.fn(async (_value: string, hash: string) => hash.startsWith('hash:')),
    }
    const jwt = {
      signAsync: jest.fn(async () => 'access-token'),
    }

    const service = new AuthService(
      (overrides.prisma ?? prisma) as unknown as PrismaService,
      (overrides.hasher ?? hasher) as unknown as PasswordHasher,
      (overrides.jwt ?? jwt) as unknown as JwtService,
    )
    return { service, prisma, hasher, jwt }
  }

  describe('register', () => {
    it('given an email already in use, then throws 409 conflict', async () => {
      const { service, prisma } = buildService()
      prisma.user.findUnique.mockResolvedValue({ id: 'u1' })

      await expect(service.register('dev@example.com', 'S3gura!123456')).rejects.toMatchObject({
        code: 'email.in_use',
        status: 409,
      })
    })

    it('given valid data, then creates the user with hashed password', async () => {
      const { service, prisma, hasher } = buildService()
      prisma.user.findUnique.mockResolvedValue(null)
      prisma.user.create.mockResolvedValue({ id: 'u1' })

      const result = await service.register('DEV@Example.com', 'S3gura!123456', 'Dev')

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: { email: 'dev@example.com', passwordHash: 'hash:S3gura!123456', displayName: 'Dev' },
        select: { id: true },
      })
      expect(hasher.hash).toHaveBeenCalledWith('S3gura!123456')
      expect(result).toEqual({ id: 'u1' })
    })
  })

  describe('login', () => {
    it('given wrong password, then throws unauthorized', async () => {
      const { service, prisma, hasher } = buildService()
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'dev@example.com', passwordHash: 'hash:x', isActive: true })
      hasher.verify.mockResolvedValue(false)

      await expect(service.login('dev@example.com', 'wrong')).rejects.toBeInstanceOf(
        UnauthorizedException,
      )
    })

    it('given valid credentials, then issues access and refresh tokens', async () => {
      const { service, prisma, hasher } = buildService()
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'dev@example.com', passwordHash: 'hash:ok', isActive: true })
      hasher.verify.mockResolvedValue(true)

      const result = await service.login('dev@example.com', 'S3gura!123456')

      expect(result.accessToken).toBe('access-token')
      expect(result.refreshToken).toHaveLength(36)
      expect(prisma.refreshToken.create).toHaveBeenCalledTimes(1)
      expect(result.user.email).toBe('dev@example.com')
    })

    it('given a user with passwordHash not found, then throws unauthorized', async () => {
      const { service, prisma } = buildService()
      prisma.user.findUnique.mockResolvedValue(null)

      await expect(service.login('nobody@example.com', 'S3gura!123456')).rejects.toBeInstanceOf(
        UnauthorizedException,
      )
    })
  })

  describe('refresh', () => {
    it('given a valid non-revoked token, then rotates it and issues new tokens', async () => {
      const { service, prisma } = buildService()
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt1',
        userId: 'u1',
        revoked: false,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
        user: { id: 'u1', email: 'dev@example.com' },
      })

      const result = await service.refresh('11111111-1111-1111-1111-111111111111')

      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'rt1' },
        data: { revoked: true },
      })
      expect(result.accessToken).toBe('access-token')
      expect(result.refreshToken).toHaveLength(36)
    })

    it('given a revoked token, then revokes the whole family and throws', async () => {
      const { service, prisma } = buildService()
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt1',
        userId: 'u1',
        revoked: true,
        expiresAt: new Date(),
        user: { id: 'u1', email: 'dev@example.com' },
      })

      await expect(service.refresh('11111111-1111-1111-1111-111111111111')).rejects.toBeInstanceOf(
        UnauthorizedException,
      )
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'u1', revoked: false },
        data: { revoked: true },
      })
    })

    it('given an expired token, then throws unauthorized', async () => {
      const { service, prisma } = buildService()
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt1',
        userId: 'u1',
        revoked: false,
        expiresAt: new Date(Date.now() - 1000),
        user: { id: 'u1', email: 'dev@example.com' },
      })

      await expect(service.refresh('11111111-1111-1111-1111-111111111111')).rejects.toBeInstanceOf(
        UnauthorizedException,
      )
    })
  })

  describe('logout', () => {
    it('given the owner, then revokes the refresh token', async () => {
      const { service, prisma } = buildService()
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 })

      await service.logout('11111111-1111-1111-1111-111111111111', 'u1')

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { tokenHash: expect.any(String), userId: 'u1' },
        data: { revoked: true },
      })
    })
  })

  describe('token durability', () => {
    it('refresh tokens last REFRESH_TOKEN_TTL_DAYS days', () => {
      expect(REFRESH_TOKEN_TTL_DAYS).toBe(7)
    })
  })
})