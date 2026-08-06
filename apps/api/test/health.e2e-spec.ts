import { Test } from '@nestjs/testing'
import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { HealthModule } from '../src/modules/health/health.module'

describe('Health (e2e)', () => {
  let app: INestApplication

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [HealthModule],
    }).compile()

    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('api')
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  it('GET /api/health returns ok with service metadata', async () => {
    const response = await request(app.getHttpServer()).get('/api/health').expect(200)

    expect(response.body.status).toBe('ok')
    expect(response.body.service).toBe('codexa-api')
    expect(response.body.version).toBe('0.1.0')
  })
})
