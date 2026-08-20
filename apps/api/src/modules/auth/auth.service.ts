import { createHash, randomUUID } from 'node:crypto'
import { Injectable, UnauthorizedException } from '@nestjs/common'
import type { JwtService } from '@nestjs/jwt'
import { ServiceException } from '@codexa/contracts'
import type { PrismaService } from '../../common/prisma/prisma.service'
import type { PasswordHasher } from './password-hasher'

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60
export const REFRESH_TOKEN_TTL_DAYS = 7

export interface AuthTokens {
  accessToken: string
  expiresIn: number
  refreshToken: string
}

function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hasher: PasswordHasher,
    private readonly jwt: JwtService,
  ) {}

  async register(
    email: string,
    password: string,
    displayName?: string,
  ): Promise<{ id: string }> {
    const normalizedEmail = email.toLowerCase().trim()
    const existing = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    })
    if (existing !== null) {
      throw new ServiceException('El email ya está registrado', 'email.in_use', 409)
    }

    const passwordHash = await this.hasher.hash(password)
    const user = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        displayName: displayName?.trim() || null,
      },
      select: { id: true },
    })
    return { id: user.id }
  }

  async login(email: string, password: string): Promise<AuthTokens & { user: UserDto }> {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } })
    if (user === null || !user.isActive) {
      throw new UnauthorizedException('Credenciales inválidas')
    }

    const passwordValid = await this.hasher.verify(password, user.passwordHash)
    if (!passwordValid) {
      throw new UnauthorizedException('Credenciales inválidas')
    }

    const tokens = await this.issueTokens(user.id, user.email)
    return {
      ...tokens,
      user: { id: user.id, email: user.email, displayName: user.displayName },
    }
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const tokenHash = hashRefreshToken(refreshToken)
    const record = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: { select: { id: true, email: true } } },
    })

    if (record === null) {
      throw new UnauthorizedException('Refresh token inválido')
    }

    if (record.revoked) {
      await this.revokeFamily(record.userId)
      throw new UnauthorizedException('Refresh token reutilizado; familia revocada')
    }

    if (record.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Refresh token expirado')
    }

    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: { revoked: true },
    })

    return this.issueTokens(record.user.id, record.user.email)
  }

  async logout(refreshToken: string, ownerId: string): Promise<void> {
    const tokenHash = hashRefreshToken(refreshToken)
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, userId: ownerId },
      data: { revoked: true },
    })
  }

  async me(userId: string): Promise<UserDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, displayName: true },
    })
    if (user === null) {
      throw new UnauthorizedException('Usuario no encontrado')
    }
    return user
  }

  private async issueTokens(userId: string, email: string): Promise<AuthTokens> {
    const accessToken = await this.jwt.signAsync(
      { sub: userId, email },
      { jwtid: randomUUID(), expiresIn: ACCESS_TOKEN_TTL_SECONDS },
    )

    const refreshToken = randomUUID()
    const tokenHash = hashRefreshToken(refreshToken)
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000)

    await this.prisma.refreshToken.create({
      data: { userId, tokenHash, expiresAt },
    })

    return { accessToken, expiresIn: ACCESS_TOKEN_TTL_SECONDS, refreshToken }
  }

  private async revokeFamily(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revoked: false },
      data: { revoked: true },
    })
  }
}

export interface UserDto {
  id: string
  email: string
  displayName: string | null
}