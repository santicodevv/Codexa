# 23 · Changelog — Codexa

> **Estado:** Borrador v0.1 · **Última actualización:** 2026-08-05
> **Documentos relacionados:** [22-Contributing](22-Contributing.md) · [01-Roadmap](01-Roadmap.md) · [17-Deployment](17-Deployment.md)

---

## 1. Propósito

Mantener un registro cronológico de cambios en **lenguaje para personas** (no solo commits).
Sigue [Keep a Changelog](https://keepachangelog.com/) + [SemVer](https://semver.org/).

Secciones por versión: `Added` / `Changed` / `Fixed` / `Security` / `Removed`.

---

## 2. [Unreleased]

### Added
- **GitHub Action `codexa/audit`** (Fase 3, slice 1 — F3-02/03/04/06): nuevo workspace
  `apps/github-action`, bundled con `@vercel/ncc`. Dispara auditorías vía la API de Codexa
  (`POST /api/ci/audits`, autenticado por API key de repositorio en vez de JWT de usuario),
  hace *polling* hasta que terminan, y publica un comentario resumen (Health Score, contadores,
  sugerencias destacadas) más comentarios inline en el PR — estos últimos limitados a hallazgos
  `critical` que caen en líneas efectivamente agregadas por el diff (parseado del `patch` de
  `GET /pulls/{pr}/files`, sin librerías externas). Crea además un check run (`Codexa Audit`) con
  conclusión `success`/`failure` según `fail-on-critical`. No depende de la GitHub App (§2 de
  `docs/13-GitHub-Integration.md`, todavía sin implementar) — usa el `GITHUB_TOKEN` del propio
  workflow consumidor.
- Endpoints de CI en la API: `POST /api/repositories/:id/ci-key` (genera/rota la API key,
  hash SHA-256 igual que los refresh tokens, valor en texto plano solo en esa respuesta),
  `POST /api/ci/audits` y `GET /api/ci/audits/:id` (nuevo módulo `modules/github`, guard
  `CiApiKeyGuard`). `AuditsService.enqueue`/`processAudit` aceptan ahora un `ref` opcional para
  clonar una rama específica (antes siempre clonaba la rama por defecto, lo cual habría hecho que
  la Action auditara `main` en vez del head del PR).
- Esqueleto del monorepo npm workspaces (`apps/api`, `apps/cli`, `apps/frontend`, `packages/*`).
- API NestJS con CQRS (`@nestjs/cqrs`) y Prisma (PostgreSQL 16).
- Pipeline `AnalyzeAndSuggest` en `packages/ai` con provider Anthropic y validación `zod`.
- Analizadores base en `packages/analysis`: typecheck TS (`ts-morph`), ESLint, `npm audit`.
- Autenticación JWT (access + refresh rotativo) con Passport.
- Worker BullMQ para auditorías asíncronas.
- Documentación técnica completa (docs 00-24).

---

## 3. [0.3.0] — 2026-08-13 (Fase 2: cierre P1/P2)

> Cierra los ítems P1/P2 pendientes de la Fase 2: cola de auditorías async, export PDF y
> tendencias de Health Score.

### Added
- Cola de auditorías con **BullMQ** sobre Redis: `POST /repositories/:id/audits` ahora encola el
  trabajo y responde de inmediato con `status: pending`; un proceso worker separado
  (`npm run start:worker`, `apps/api/src/worker.ts`) consume la cola y ejecuta el análisis +
  sugerencias de IA. `AuditsService.run()` se dividió en `enqueue()` (crea la fila `Audit` y
  encola el job) y `processAudit()` (la ejecución real, invocada por el worker).
- Exportación de reportes a **PDF** (`pdfkit`): `GET /repositories/:id/audits/:auditId/export.pdf`
  genera un PDF con Health Score, severidades, deuda técnica, resumen por módulo, sugerencias de
  IA y hallazgos. Botón "Descargar PDF" en el dashboard.
- **Tendencias de Health Score**: `GET /repositories/:id/audits/trend` devuelve los últimos N
  audits completados; nuevo componente `HealthScoreTrendChart` (SVG propio, sin librería nueva)
  en el detalle de repositorio.
- El dashboard ahora hace *polling* del estado de la auditoría (`pending`/`running` →
  `completed`/`failed`) en vez de esperar una respuesta síncrona, con timeout de 5 minutos que
  avisa si el worker no está corriendo.

### Changed
- `POST /repositories/:id/audits` pasó de responder el resultado final (síncrono) a responder
  `202`-like `{ status: 'pending' }` de inmediato. Un repositorio con `url`/`localPath` inválido
  ya no falla con 400 en el POST: crea una fila `Audit` que pasa a `failed` una vez que el worker
  la procesa (trade-off inherente a ir async).

---

## 4. [0.2.0] — 2026-08-12 (Fase 2: plataforma web)

> Fase 2: API + dashboard + persistencia con PostgreSQL/Redis.

### Added
- Módulo `auth`: registro con política de contraseñas, login, refresh rotativo con revocación de familia y logout (bcrypt cost 12).
- Módulo `repositories` (CQRS): crear, listar, detalle y eliminar con propiedad del usuario (evita IDOR).
- Módulo `audits` (CQRS): ejecución síncrona persistida (audits + findings + ai_suggestions + module_summaries + llm_usages) con transacción única, historial paginado y rate limiting vía Redis.
- Soporte de fuente por `localPath` o clonado `git clone --depth 1` desde URL remota.
- Módulo Redis común (`RedisService`) para caché y rate limiting.
- `JwtAuthGuard` global con decorador `@Public()` y `@CurrentUser` desde el token.
- Dashboard React (React Router + axios): login/registro, lista de repositorios con última auditoría, detalle con Health Score, sugerencias de IA, resumen por módulo, hallazgos e historial.
- Interceptor axios con renovación automática del refresh token ante 401.

### Changed
- `AppModule` de la API registra auth, repositories y audits con CQRS.

### Added
- Caché en Redis de sugerencias de IA por `repositorio + commit + proveedor + modelo` (`LLM_CACHE_TTL_SECONDS`, default 24h). Evita repetir la llamada al LLM cuando se re-audita el mismo commit; solo aplica cuando el directorio tiene un commit de git resuelto.

### Fixed
- Rate limiting vía Redis en `POST /auth/register` y `POST /auth/login` (10 intentos / 15 min por IP); antes solo cubría el endpoint de auditorías pese a lo indicado en este changelog.
- Error de tipos en `audits.service.spec.ts` (mock de `ConfigService` mal tipado).
- `App.test.tsx` desactualizado: ahora verifica el contenido real de la página de login en vez del heading "Codexa" que ya no existe.

### Removed
- Fixture `tools/fixtures/demo-app` y su golden de evaluación (se mantienen `ts-basic`, `js-esm`, `npm-lock`).

---

## 5. [0.1.0] — 2026-08-05 (lanzamiento de la fase MVP)

> Fase 1: auditoría local + reporte con sugerencias de IA.

### Added
- CLI `codexa audit --path <repo>` con salida en terminal y exportación Markdown.
- Auditoría síncrona de repos pequeños vía API.
- Dashboard web: registro, login, repositorios, ejecución y lectura de reportes.
- Rate limiting con Redis en auth y auditorías.

### Security
- Sanitización de secretos antes de prompts de IA.
- Sandbox de análisis aislado sin red (ver [20-Repository-Safety]).

---

## 5. Formato de una entrada

```markdown
## [X.Y.Z] — AAAA-MM-DD

### Added
- Descripción corta y accionable (PR #123).

### Fixed
- Descripción del bug resuelto (issue #89).
```

Reglas:
- Una línea por cambio significativo, referencia a PR/issue.
- `### Security` para parches de seguridad.
- Enlaces a issues/PRs usados si aplica.

---

## 6. Historial del documento

| Versión | Fecha      | Cambios                              |
| ------- | ---------- | ------------------------------------ |
| v0.1    | 2026-08-05 | Primera versión completa (Entrega 4). |

---

[01-Roadmap]: 01-Roadmap.md
