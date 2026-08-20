import type { ExecutionContext } from '@nestjs/common';
import { createParamDecorator } from '@nestjs/common'

export interface AuthenticatedUser {
  id: string
  email: string
}

/**
 * Inyecta el usuario autenticado desde el token JWT. El `ownerId` de cualquier
 * recurso SIEMPRE viene de aquí, nunca del cuerpo de la petición (evita IDOR).
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const request = context.switchToHttp().getRequest()
    return request.user as AuthenticatedUser
  },
)