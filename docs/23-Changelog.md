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
- Esqueleto del monorepo npm workspaces (`apps/api`, `apps/cli`, `apps/frontend`, `packages/*`).
- API NestJS con CQRS (`@nestjs/cqrs`) y Prisma (PostgreSQL 16).
- Pipeline `AnalyzeAndSuggest` en `packages/ai` con provider Anthropic y validación `zod`.
- Analizadores base en `packages/analysis`: typecheck TS (`ts-morph`), ESLint, `npm audit`.
- Autenticación JWT (access + refresh rotativo) con Passport.
- Worker BullMQ para auditorías asíncronas.
- Documentación técnica completa (docs 00-24).

---

## 3. [0.1.0] — 2026-08-05 (lanzamiento de la fase MVP)

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

## 4. Formato de una entrada

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

## 5. Historial del documento

| Versión | Fecha      | Cambios                              |
| ------- | ---------- | ------------------------------------ |
| v0.1    | 2026-08-05 | Primera versión completa (Entrega 4). |

---

[01-Roadmap]: 01-Roadmap.md
