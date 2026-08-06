import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const DEMO_EMAIL = 'demo@codexa.dev'

async function main(): Promise<void> {
  const existing = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } })
  if (existing) {
    console.log(`Seed omitido: ${DEMO_EMAIL} ya existe.`)
    return
  }

  await prisma.user.create({
    data: {
      email: DEMO_EMAIL,
      passwordHash: 'demo',
      displayName: 'Demo',
    },
  })
  console.log(`Seed completado: ${DEMO_EMAIL}`)
}

main()
  .catch((error: unknown) => {
    console.error('Seed falló:', error)
    process.exitCode = 1
  })
  .finally(() => {
    void prisma.$disconnect()
  })
