import type { ExecutionContext } from '@nestjs/common'
import { createParamDecorator } from '@nestjs/common'

export interface CiAuthenticatedRepository {
  id: string
  ownerId: string
}

/**
 * Inyecta el repositorio resuelto por CiApiKeyGuard (request.repository). Análogo a
 * @CurrentUser() pero para rutas autenticadas por API key de CI en vez de JWT de usuario.
 */
export const CurrentRepository = createParamDecorator(
  (_data: unknown, context: ExecutionContext): CiAuthenticatedRepository => {
    const request = context.switchToHttp().getRequest()
    return request.repository as CiAuthenticatedRepository
  },
)
