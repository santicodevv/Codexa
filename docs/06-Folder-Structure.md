# 06 · Folder Structure — Codexa

> **Estado:** Borrador v0.1 · **Última actualización:** 2026-08-05
> **Documentos relacionados:** [00-Project-Overview](00-Project-Overview.md) · [04-Technology-Stack](04-Technology-Stack.md) · [05-Coding-Standards](05-Coding-Standards.md) · [08-Backend-Architecture](08-Backend-Architecture.md) · [09-Frontend-Architecture](09-Frontend-Architecture.md)

---

## 1. Principios de organización

1. **Monorepo con npm workspaces.** Apps (`api`, `cli`, `frontend`) y paquetes compartidos
   (`contracts`, `analysis`, `ai`) en un solo repositorio.
2. **Límites por módulo y por feature.** El backend se organiza en módulos NestJS por feature;
   el frontend por *features*.
3. **Nombres alineados con los símbolos.** El archivo donde vive un símbolo coincide con su
   nombre (`AuditService` → `audit.service.ts`).
4. **Tests junto al código que prueban.** En el backend, `*.spec.ts` junto al archivo; en el
   frontend, `*.test.tsx` en la misma carpeta del componente.
5. **Nada de "capas genéricas de utilidades" gigantes.** Un helper va junto a su consumidor, o en
   un paquete `shared` solo si lo usan 2+ módulos distintos.

---

## 2. Estructura raíz

```
codexa/
├── .github/                  # Workflows CI, plantillas de issues/PR
│   ├── workflows/
│   │   ├── ci-backend.yml
│   │   ├── ci-frontend.yml
│   │   ├── ci-security.yml
│   │   ├── release.yml
│   │   └── deploy.yml
│   ├── dependabot.yml
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   ├── feature_request.md
│   │   └── config.yml
│   └── PULL_REQUEST_TEMPLATE.md
├── docs/                     # Documentación del proyecto (índice en docs/00-*)
├── apps/                     # Aplicaciones desplegables
│   ├── api/                  # API NestJS
│   ├── cli/                  # CLI de consola
│   └── frontend/             # Dashboard React
├── packages/                 # Paquetes compartidos (npm workspaces)
│   ├── contracts/            # DTOs y tipos compartidos
│   ├── analysis/             # Analyzer Engine
│   ├── ai/                   # LLM Gateway
│   └── cli-core/             # Helpers de reportes (MD/HTML/PDF)
├── prisma/                   # Esquema de Prisma + migraciones
├── scripts/                  # Scripts de devops (formato, seed, helpers)
├── tools/                    # Fixtures y repositorios de prueba
│   └── fixtures/
│       ├── ts-deadcode/
│       ├── ts-eslint-issues/
│       └── vuln-deps/
├── .env.example
├── .gitignore
├── .prettierrc
├── .prettierignore
├── eslint.config.mjs         # Config de ESLint (flat config)
├── package.json              # Workspaces root
├── tsconfig.base.json        # Base de tipos compartida
├── compose.yml               # Pila local: postgres + redis + api + web
└── README.md
```

---

## 3. Backend — `apps/api/`

```
apps/api/
├── src/
│   ├── main.ts                          # Bootstrap NestJS + ValidationPipe + Swagger
│   ├── app.module.ts                    # Módulo raíz
│   ├── common/                          # Cross-cutting
│   │   ├── decorators/                  # @CurrentUser(), @Public()
│   │   ├── filters/                     # ExceptionFilter → ProblemDetails
│   │   ├── guards/                      # JwtAuthGuard, RateLimitGuard
│   │   ├── interceptors/
│   │   ├── pipes/                       # Validación global
│   │   └── services/                    # ICurrentUserService, Logger
│   ├── config/                          # ConfigModule (env validation con zod)
│   └── modules/                         # Módulos por feature
│       ├── auth/                        # Login, register, refresh, JWT
│       │   ├── auth.controller.ts
│       │   ├── auth.service.ts
│       │   ├── auth.module.ts
│       │   ├── strategies/              # JwtStrategy, LocalStrategy
│       │   ├── dto/
│       │   ├── commands/                # RegisterCommand, LoginCommand
│       │   └── __tests__/
│       ├── users/
│       ├── repositories/
│       │   ├── repositories.controller.ts
│       │   ├── repositories.service.ts
│       │   ├── repositories.module.ts
│       │   ├── commands/
│       │   ├── queries/
│       │   └── dto/
│       ├── audits/
│       │   ├── audits.controller.ts
│       │   ├── audits.service.ts
│       │   ├── audits.module.ts
│       │   ├── commands/                # RunAuditCommand
│       │   ├── queries/                 # GetAuditQuery, GetAuditHistoryQuery
│       │   ├── dto/                     # AuditReportDto, FindingDto
│       │   └── __tests__/
│       ├── analysis/                    # Wrapper del paquete @codexa/analysis
│       └── ci/                          # Endpoints para GitHub Action
├── test/                                # Tests e2e (supertest)
│   ├── app.e2e-spec.ts
│   ├── audit-flow.e2e-spec.ts
│   └── jest-e2e.json
├── Dockerfile
└── tsconfig.json
```

### 3.1 Reglas de carpetas backend

| Regla                                                          |
| -------------------------------------------------------------- |
| Un módulo NestJS no importa internals de otro módulo (solo exports públicos). |
| Todo DTO de entrada valida con class-validator/zod.            |
| Los handlers CQRS viven en `commands/` y `queries/` dentro de cada módulo. |
| `__tests__` junto al archivo que prueba (`*.spec.ts`).         |

---

## 4. Paquetes compartidos — `packages/`

### 4.1 `packages/contracts/`

DTOs y tipos usados por API, CLI y frontend.

```
packages/contracts/src/
├── index.ts
├── audit.dto.ts          # AuditReportDto, FindingDto, AiSuggestionDto
├── repository.dto.ts
├── auth.dto.ts
├── result.ts             # Result<T> y errores tipados
└── enums.ts              # FindingSeverity, AuditStatus, LanguageId
```

### 4.2 `packages/analysis/` — Analyzer Engine

```
packages/analysis/src/
├── index.ts
├── interfaces/
│   ├── analyzer.interface.ts       # IAnalyzer, AnalysisContext
│   └── result.types.ts             # Finding, AnalyzerResult, AuditReport
├── orchestrator/
│   └── audit-orchestrator.ts
├── collectors/
│   ├── repository-collector.ts
│   └── language-detector.ts
├── analyzers/
│   ├── ts-ast/
│   │   ├── ts-ast-analyzer.ts
│   │   ├── dead-code-visitor.ts
│   │   └── complexity.ts
│   ├── eslint/
│   │   └── eslint-analyzer.ts
│   ├── npm-audit/
│   │   └── npm-audit-analyzer.ts
│   ├── tests/
│   │   └── test-coverage-analyzer.ts
│   └── dotnet-cli/                  # shell-out a dotnet (opcional)
│       └── dotnet-cli-analyzer.ts
├── normalization/
│   ├── normalizer.ts
│   └── deduplicator.ts
├── scoring/
│   └── health-score-calculator.ts
├── prioritization/
│   └── prioritizer.ts
└── __tests__/
```

### 4.3 `packages/ai/` — LLM Gateway

```
packages/ai/src/
├── index.ts
├── interfaces/
│   ├── language-model.interface.ts  # ILanguageModel, ChatMessage
│   └── result.types.ts
├── providers/
│   ├── openai/
│   ├── anthropic/
│   ├── gemini/
│   ├── openai-compatible/            # adapter genérico (DeepSeek, Kimi, NVIDIA NIM, custom)
│   │   ├── openai-compatible.provider.ts
│   │   └── presets.ts                # deepseek, kimi, nvidia, openai-compatible
│   └── provider.factory.ts           # resuelve LLM_PROVIDER → adapter
├── pipeline/
│   └── ai-pipeline.ts
├── prompts/                         # Plantillas de prompts (.ts/.txt)
│   ├── suggestions.prompt.ts
│   ├── summary.prompt.ts
│   └── prioritization.prompt.ts
├── validation/
│   └── schema-validator.ts          # zod
├── usage/
│   └── usage-tracker.ts
└── __tests__/
```

---

## 5. CLI — `apps/cli/`

```
apps/cli/
├── src/
│   ├── main.ts                       # Commander bootstrap
│   ├── commands/
│   │   ├── audit.command.ts          # codexa audit --path ...
│   │   └── providers.command.ts
│   ├── output/
│   │   ├── markdown-report-writer.ts
│   │   └── html-report-writer.ts
│   └── index.ts
├── package.json
└── tsconfig.json
```

---

## 6. Frontend — `apps/frontend/`

```
apps/frontend/
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── routes.tsx                  # Definición de rutas (React Router)
    ├── api/                        # Capa HTTP única
    │   ├── client.ts               # fetch wrapper con auth/errores
    │   ├── audits.ts
    │   ├── repositories.ts
    │   └── auth.ts
    ├── types/                      # Tipos importados de @codexa/contracts
    │   └── index.ts
    ├── hooks/                      # Hooks propios reutilizables
    │   ├── useAudits.ts
    │   └── useRepositories.ts
    ├── store/                      # Zustand
    │   ├── authStore.ts
    │   └── uiStore.ts
    ├── components/                 # UI genérica (design system)
    │   ├── ui/                     # Button, Badge, Card, Table, ...
    │   ├── score/                  # HealthScoreRing, SeverityBadge
    │   └── layout/                 # Sidebar, Header, PageContainer
    ├── features/                   # Módulos de producto (feature-first)
    │   ├── audit/
    │   │   ├── AuditRunPage.tsx
    │   │   ├── AuditReportView.tsx
    │   │   ├── AuditReportView.test.tsx
    │   │   └── components/         # FindingList, SuggestionCard
    │   ├── repositories/
    │   │   ├── RepositoriesPage.tsx
    │   │   ├── RepositoryCard.tsx
    │   │   └── ...
    │   ├── dashboard/
    │   │   ├── DashboardPage.tsx
    │   │   └── ...
    │   └── auth/
    │       ├── LoginPage.tsx
    │       └── RegisterPage.tsx
    └── styles/
        └── index.css               # Directivas de Tailwind + tokens
```

### 6.1 Reglas de carpetas frontend

| Regla                                                          |
| -------------------------------------------------------------- |
| Un feature no importa desde otra feature (solo desde `components/ui`, `api`, `types`, `hooks`). |
| Tests de un componente van en la misma carpeta (`X.test.tsx`). |
| Componentes reutilizables por 2+ features viven en `components/`. |
| Toda llamada HTTP pasa por `src/api/` (nunca `fetch` suelto en componentes). |

---

## 7. Prisma — `prisma/`

```
prisma/
├── schema.prisma                 # Modelos + datasource + generator client
├── migrations/                   # Migraciones versionadas por Prisma Migrate
└── seed.ts                       # Seed de usuario demo (solo Development)
```

---

## 8. Documentación — `docs/`

```
docs/
├── 00-Project-Overview.md          # ← índice maestro
├── 01-Roadmap.md
├── 02-Product-Requirements.md
├── 03-System-Architecture.md
├── 04-Technology-Stack.md
├── 05-Coding-Standards.md
├── 06-Folder-Structure.md          # ← este documento
├── 07-Database-Design.md
├── 08-Backend-Architecture.md
├── 09-Frontend-Architecture.md
├── 10-AI-Engine.md
├── 11-Code-Analyzer.md
├── 12-Authentication-and-Authorization.md
├── 13-GitHub-Integration.md
├── 14-API-Documentation.md
├── 15-UI-UX-Design.md
├── 16-Testing-Strategy.md          # (Entrega 4)
├── 17-Deployment.md
├── 18-Environment-Variables.md
├── 19-Security.md
├── 20-Repository-Safety.md
├── 21-Performance-Optimization.md
├── 22-Contributing.md
├── 23-Changelog.md
└── 24-Future-Features.md
├── prompts/                        # (Entrega 5)
└── diagrams/                       # (Entrega 5)
```

Reglas de documentación: ver [05-Coding-Standards.md](05-Coding-Standards.md) sección 7.

---

## 9. Fixtures — `tools/fixtures/`

Fixtures = repositorios de prueba con **hallazgos conocidos y determinísticos**. Son la base de la
evaluación de precisión (ver [11-Code-Analyzer](11-Code-Analyzer.md)).

```
tools/fixtures/
├── ts-deadcode/          # Proyecto TS con dead code y complejidad alta
├── ts-clean/             # Proyecto TS sano (baseline)
├── ts-eslint-issues/     # Repo TS con problemas de lint
├── vuln-deps/            # package.json con vulnerabilidades conocidas
└── dotnet-basic/         # Repo .NET mínimo (solo para DotnetCliAnalyzer)
```

Cada fixture incluye un `expected.json` con los hallazgos esperados (fuente de verdad para tests).

```json
{
  "name": "ts-deadcode",
  "expectedFindings": [
    { "ruleId": "CD-001", "file": "src/main.ts", "line": 12, "severity": "critical" }
  ],
  "expectedScoreRange": [55, 70]
}
```

---

## 10. CI/CD — `.github/workflows/`

| Workflow            | Dispara                      | Qué hacer                                       |
| ------------------- | ---------------------------- | ----------------------------------------------- |
| `ci-backend.yml`    | push/PR en `apps/api`, `packages/**`, `prisma/**` | `npm ci` → lint → `tsc --noEmit` → unit tests → e2e (Postgres) → `prisma validate` |
| `ci-frontend.yml`   | push/PR en `apps/frontend/**` | `npm ci` → lint → `tsc --noEmit` → tests → build |
| `ci-security.yml`   | push/PR + semanal (lun 03:00) | `npm audit` (fail on critical) + CodeQL          |
| `release.yml`       | tag `v*`                     | Build imágenes Docker (GHCR) + publish CLI npm + GitHub Release |
| `deploy.yml`        | push en `main` o manual      | Deploy SSH al VPS + `prisma migrate deploy`      |

---

## 11. Checklist de adopción

- [ ] Crear estructura con esta guía (`npm create @nestjs/core` para `apps/api`, `vite` para `apps/frontend`).
- [ ] `tsconfig.base.json` con `strict` y paths de alias (`@codexa/*`).
- [ ] `eslint.config.mjs` (flat config) y `.prettierrc` configurados.
- [ ] Esquema Prisma inicial + `prisma generate`.
- [ ] Crear al menos un fixture `ts-clean` y `ts-deadcode` antes del primer analizador.
- [ ] CI verde con la estructura mínima.

---

## 12. Historial del documento

| Versión | Fecha      | Cambios                              |
| ------- | ---------- | ------------------------------------ |
| v0.1    | 2026-08-05 | Primera versión completa (Entrega 2). |
| v0.2    | 2026-08-05 | Migración a NestJS/Prisma/npm workspaces. |

---

[11-Code-Analyzer]: 11-Code-Analyzer.md
