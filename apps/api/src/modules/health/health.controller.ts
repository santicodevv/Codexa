import { Controller, Get } from '@nestjs/common'
import type { HealthCheckDto } from '@codexa/contracts'

const SERVICE_NAME = 'codexa-api'
const VERSION = '0.1.0'

@Controller('health')
export class HealthController {
  @Get()
  check(): HealthCheckDto {
    return {
      status: 'ok',
      service: SERVICE_NAME,
      version: VERSION,
      timestamp: new Date().toISOString(),
    }
  }
}
