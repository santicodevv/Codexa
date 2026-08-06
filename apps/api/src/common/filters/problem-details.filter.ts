import { Catch, HttpException, HttpStatus, Logger } from '@nestjs/common'
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common'
import type { Response } from 'express'
import { ServiceException } from '@codexa/contracts'

interface ProblemDetails {
  type: string
  title: string
  status: number
  code: string
  detail: string
  traceId?: string
  errors?: Record<string, string[]>
}

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemDetailsFilter.name)

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const problem = this.toProblemDetails(exception)

    response.status(problem.status).json(problem)
  }

  private toProblemDetails(exception: unknown): ProblemDetails {
    if (exception instanceof ServiceException) {
      return {
        type: `https://api.codexa.dev/errors/${exception.code}`,
        title: exception.message,
        status: exception.status,
        code: exception.code,
        detail: exception.message,
      }
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus()
      const payload = exception.getResponse()
      const title = typeof payload === 'string' ? payload : exception.message

      if (Array.isArray(payload) === false && typeof payload === 'object' && payload !== null) {
        const body = payload as Record<string, unknown>
        const message = body['message']
        if (Array.isArray(message) && message.every((item) => typeof item === 'string')) {
          return {
            type: `https://api.codexa.dev/errors/validation`,
            title: 'Validation Failed',
            status,
            code: 'validation.failed',
            detail: title,
            errors: { fields: message },
          }
        }
      }

      return {
        type: `https://api.codexa.dev/errors/${statusToCode(status)}`,
        title,
        status,
        code: statusToCode(status),
        detail: title,
      }
    }

    this.logger.error(
      'Excepción no controlada',
      exception instanceof Error ? exception.stack : String(exception),
    )
    return {
      type: 'https://api.codexa.dev/errors/internal.error',
      title: 'Internal Server Error',
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'internal.error',
      detail: 'Ocurrió un error inesperado',
    }
  }
}

function statusToCode(status: number): string {
  switch (status) {
    case HttpStatus.BAD_REQUEST:
      return 'validation.failed'
    case HttpStatus.UNAUTHORIZED:
      return 'unauthorized'
    case HttpStatus.FORBIDDEN:
      return 'forbidden'
    case HttpStatus.NOT_FOUND:
      return 'not_found'
    case HttpStatus.CONFLICT:
      return 'conflict'
    case HttpStatus.TOO_MANY_REQUESTS:
      return 'rate_limit'
    default:
      return 'http.error'
  }
}
