import { Controller, Get } from '@nestjs/common'
import type { HealthCheckDto } from '@codexa/contracts'
import { Public } from '../../common/auth/public.decorator'

const SERVICE_NAME = 'codexa-api'
const VERSION = '0.1.0'

@Public()
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
