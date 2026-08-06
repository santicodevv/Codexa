import { z } from 'zod'

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres'),
  JWT_ISSUER: z.string().default('http://localhost:3001'),
  JWT_AUDIENCE: z.string().default('codexa-web'),
  LLM_PROVIDER: z
    .enum(['anthropic', 'openai', 'gemini', 'deepseek', 'kimi', 'nvidia', 'openai-compatible'])
    .default('anthropic'),
  LLM_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  LLM_BASE_URL: z.union([z.string().url(), z.literal('')]).optional(),
  LLM_MODEL_MINI: z.string().optional(),
  LLM_MODEL_PRO: z.string().optional(),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  SWAGGER_ENABLED: z.string().default('false'),
  GITHUB_APP_ID: z.string().optional(),
  GITHUB_PRIVATE_KEY: z.string().optional(),
  GITHUB_WEBHOOK_SECRET: z.string().optional(),
})

export type Env = z.infer<typeof envSchema>

export function validateEnv(env: NodeJS.ProcessEnv): Env {
  const parsed = envSchema.safeParse(env)
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors
    throw new Error(`Configuración inválida: ${JSON.stringify(fieldErrors)}`)
  }
  return parsed.data
}
