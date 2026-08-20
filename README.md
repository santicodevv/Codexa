<div align="center">

# Codexa

**Auditoría de código impulsada por IA.**

Codexa analiza repositorios completos para detectar código muerto, dependencias vulnerables,
funciones sin tests y deuda técnica, y genera un reporte priorizado con sugerencias de refactor
listas para actuar.

</div>

---

## Contenido

- [¿Qué es Codexa?](#qué-es-codexa)
- [Características](#características)
- [Arquitectura en una mirada](#arquitectura-en-una-mirada)
- [Stack tecnológico](#stack-tecnológico)
- [Primeros pasos](#primeros-pasos)
- [Documentación](#documentación)
- [Roadmap](#roadmap)
- [Contribuir](#contribuir)
- [Licencia](#licencia)

---

## ¿Qué es Codexa?

Codexa es una plataforma de auditoría de código que combina análisis estático determinístico
(árbol sintáctico AST de TypeScript, ESLint, `npm audit`) con análisis semántico de un LLM
configurable (**OpenAI, Anthropic, Google Gemini, DeepSeek, Kimi, NVIDIA NIM** u otro endpoint
OpenAI-compatible). El resultado es un **reporte de salud del
repositorio** priorizado por impacto:

| Métrica           | Descripción                                  |
| ----------------- | -------------------------------------------- |
| `Health Score`    | Puntuación global de 0 a 100 del repositorio |
| `Critical Issues` | Problemas críticos detectados                |
| `Technical Debt`  | Estimación de horas de deuda técnica         |
| `Dead Code`       | Archivos/símbolos sin uso                    |
| `Missing Tests`   | Métodos y funciones sin cobertura            |
| `Suggestions`     | Sugerencias de refactor generadas con IA     |

Los reportes se pueden exportar en **PDF**, **Markdown** y **HTML**, y consumir desde un
**dashboard web** o desde **GitHub Actions**.

## Características

- **Auditoría de repositorios** con un solo comando o clic.
- **Análisis determinístico sobre AST**: código muerto, complejidad ciclomática, reglas de estilo.
- **Análisis semántico con IA**: sugerencias de refactor y resumen ejecutivo del estado del código.
- **Seguridad**: dependencias vulnerables vía `npm audit`.
- **Cobertura de tests**: funciones sin pruebas detectadas por símbolo.
- **Reportes priorizados** exportables a PDF, Markdown y HTML.
- **Dashboard web** con historial de auditorías por repositorio.
- **GitHub App + GitHub Actions**: auditorías automáticas en CI y revisión de Pull Requests.
- **Comparación entre commits**: evolución del health score en el tiempo.
- **LLM intercambiable**: OpenAI, Claude, Gemini, DeepSeek, Kimi o NVIDIA NIM a través de un
  gateway unificado (incluye cualquier endpoint OpenAI-compatible).
- **Soporte .NET**: repositorios .NET se auditan invocando herramientas `dotnet` como procesos
  externos (opcional, requiere .NET SDK en el host).

## Arquitectura en una mirada

```
┌──────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│  React + TS  │────▶│   NestJS (API)   │────▶│   Analyzer Engine   │
│  (dashboard) │     │  CQRS · Prisma   │     │ TS AST · ESLint     │
└──────────────┘     └──────────────────┘     │ · npm audit · dotnet│
      │                      │                └──────────┬──────────┘
      │                      │                           │
      │              ┌───────▼────────┐        ┌──────────▼─────────┐
      │              │  PostgreSQL    │        │   LLM Gateway      │
      │              │  + Redis       │        │ OpenAI·Claude·Gem   │
      │              └────────────────┘        │ DeepSeek·Kimi·NIM   │
      │                                        └────────────────────┘
```

La arquitectura completa está descrita en
[`docs/03-System-Architecture.md`](docs/03-System-Architecture.md).

## Stack tecnológico

| Capa            | Tecnología                                                        |
| --------------- | ----------------------------------------------------------------- |
| Frontend        | React 18 · TypeScript · Vite · Tailwind CSS                       |
| Backend         | NestJS 10 · Node.js 20 · TypeScript · CQRS                        |
| Base de datos   | PostgreSQL 16 · Redis 7 · Prisma ORM                              |
| Analizadores    | TypeScript AST · ESLint · npm audit · dotnet CLI                  |
| Inteligencia    | OpenAI · Anthropic · Google Gemini · DeepSeek · Kimi · NVIDIA NIM |
| Infraestructura | Docker · Docker Compose · GitHub Actions                          |

Detalle y justificación de cada elección en
[`docs/04-Technology-Stack.md`](docs/04-Technology-Stack.md).

## Primeros pasos

### Requisitos previos

- Node.js 20+ (el proyecto incluye `.nvmrc`)
- npm 10+
- Docker Desktop (para PostgreSQL y Redis locales)
- Clave de API de un proveedor de LLM (OpenAI, Anthropic, Gemini, DeepSeek, Kimi o NVIDIA NIM)
- .NET SDK 8 (solo para auditar repositorios .NET)

### Levantar el entorno de desarrollo

```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-usuario/codexa.git
cd codexa

# 2. Instalar dependencias (workspaces: apps/* y packages/*)
npm install

# 3. Copiar y completar las variables de entorno
cp .env.example .env

# 4. Levantar la infraestructura (PostgreSQL + Redis). Si los puertos
#    por defecto están ocupados: POSTGRES_PORT=5433 REDIS_PORT=6380 docker compose up -d
docker compose up -d

# 5. Aplicar migraciones de Prisma y sembrar datos de ejemplo
npx prisma migrate dev
npm run db:seed

# 6. Iniciar la API (puerto 3001) y el frontend (puerto 5173, proxy a /api)
npm run dev:api
npm run dev:web

# 7. Worker de auditorías (procesa la cola BullMQ) — terminal aparte,
#    mismas variables de entorno que la API (REDIS_URL, DATABASE_URL, LLM_*).
#    Sin esto, las auditorías se quedan en estado "pending" indefinidamente.
npm run --workspace=apps/api build
npm run --workspace=apps/api start:worker
```

El proyecto es un monorepo npm workspaces:

| Ruta                 | Descripción                               |
| -------------------- | ----------------------------------------- |
| `apps/api`           | Backend NestJS (CQRS · Prisma · API REST) |
| `apps/cli`           | CLI `codexa` (auditorías desde terminal)  |
| `apps/frontend`      | Dashboard React 18 + Vite + Tailwind      |
| `packages/contracts` | DTOs, enums y tipos compartidos           |
| `packages/analysis`  | Analizadores y cálculo del health score   |
| `packages/ai`        | Gateway LLM multi-proveedor               |
| `packages/cli-core`  | Utilidades compartidas del CLI            |

Verificación rápida de calidad en todo el monorepo:

```bash
npm run lint
npm run typecheck
npm test          # jest: packages + apps/api
npm run test:e2e  # supertest contra la app NestJS
npm run build     # compila packages, api, cli y frontend
```

### Ejecutar una auditoría por CLI

```bash
# Localmente, una vez compilado el CLI
node apps/cli/dist/main.js audit --path /ruta/al/repositorio --provider deepseek
# también: openai, anthropic, gemini, kimi, nvidia

# Listar proveedores LLM disponibles
node apps/cli/dist/main.js providers
```

Esto genera un reporte Markdown en `./reports/`. Ver proveedores disponibles y configuración en
[`docs/10-AI-Engine.md`](docs/10-AI-Engine.md) y
[`docs/18-Environment-Variables.md`](docs/18-Environment-Variables.md).

## Documentación

La documentación completa está en [`docs/`](docs/) y sigue el índice de
[`docs/00-Project-Overview.md`](docs/00-Project-Overview.md).

| Documento                                                  | Contenido                        |
| ---------------------------------------------------------- | -------------------------------- |
| [00-Project-Overview](docs/00-Project-Overview.md)         | Visión general del producto      |
| [01-Roadmap](docs/01-Roadmap.md)                           | Fases, hitos y backlog           |
| [02-Product-Requirements](docs/02-Product-Requirements.md) | Requerimientos funcionales y no  |
| [03-System-Architecture](docs/03-System-Architecture.md)   | Arquitectura y decisiones (ADRs) |
| [04-Technology-Stack](docs/04-Technology-Stack.md)         | Stack y justificación            |
| [05-Coding-Standards](docs/05-Coding-Standards.md)         | Estándares de desarrollo         |

## Roadmap

Resumen de fases (detalle en [`docs/01-Roadmap.md`](docs/01-Roadmap.md)):

1. **Fase 0 — Fundación**: repositorio, estándares y CI básica.
2. **Fase 1 — MVP (CLI)**: analyzer engine con TS AST/ESLint/npm audit + reporte LLM.
3. **Fase 2 — Plataforma web**: API NestJS + dashboard + persistencia.
4. **Fase 3 — Integración GitHub**: GitHub App, Actions y PR Review.
5. **Fase 4 — Escalado**: multi-repo, comparación entre commits y métricas avanzadas.

## Contribuir

Revisa la guía de contribución ([`docs/22-Contributing.md`](docs/22-Contributing.md) — próxima
entrega) y los [estándares de código](docs/05-Coding-Standards.md). Toda contribución debe pasar
por un PR con código revisado y tests.

## Licencia

MIT
