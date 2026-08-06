import { ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { AppModule } from './app.module'
import { ProblemDetailsFilter } from './common/filters/problem-details.filter'

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule)
  const config = app.get(ConfigService)

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  )
  app.useGlobalFilters(new ProblemDetailsFilter())
  app.setGlobalPrefix('api')

  const corsOrigins = config.get<string>('CORS_ORIGINS') ?? 'http://localhost:5173'
  app.enableCors({ origin: parseOrigins(corsOrigins), credentials: true })

  if (config.get<string>('SWAGGER_ENABLED') === 'true') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Codexa API')
      .setDescription('API de auditoría de código con IA')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build()
    const document = SwaggerModule.createDocument(app, swaggerConfig)
    SwaggerModule.setup('api/docs', app, document)
  }

  const port = config.get<number>('PORT') ?? 3001
  await app.listen(port)
}

function parseOrigins(value: string): string[] {
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0)
}

void bootstrap()
