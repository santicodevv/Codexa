import { Logger } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { WorkerModule } from './worker.module'

const logger = new Logger('Worker')

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(WorkerModule)
  app.enableShutdownHooks()
  logger.log('Worker BullMQ iniciado, escuchando la cola de auditorías')
}

void main()
