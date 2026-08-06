import { Logger } from '@nestjs/common'

const logger = new Logger('Worker')

function main(): void {
  logger.log('Worker BullMQ no implementado todavía; se añadirá en la fase 2.')
  setInterval(() => undefined, 1 << 30)
}

main()
