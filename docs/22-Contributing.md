# 22 · Contributing — Codexa

> **Estado:** Borrador v0.1 · **Última actualización:** 2026-08-05
> **Documentos relacionados:** [05-Coding-Standards](05-Coding-Standards.md) · [16-Testing-Strategy](16-Testing-Strategy.md) · [23-Changelog](23-Changelog.md)

---

## 1. Bienvenida

Gracias por contribuir a Codexa. Este documento define cómo colaborar: qué se espera en
issues/PRs, cómo levantar el entorno y cómo se revisa el código. El proyecto sigue un flujo
**trunk-based con PRs cortos** y un único branch protegido `main`.

---

## 2. Código de conducta

- Trato respetuoso; foco en el problema, no en la persona.
- Las discusiones técnicas se resuelven con datos (tests, benchmarks, ADRs).
- No se aceptan PRs sin tests cuando el cambio es lógico (ver [16-Testing-Strategy]).

---

## 3. Setup del entorno

Requisitos: Node.js 20, npm ≥ 10, Docker Compose, Git.

```bash
# 1. Clonar
git clone git@github.com:codexa/codexa.git && cd codexa

# 2. Instalar dependencias (monorepo npm workspaces)
npm ci

# 3. Levantar infraestructura local
docker compose up -d postgres redis

# 4. Configurar variables de entorno
cp .env.example .env   # rellenar JWT_SECRET, DATABASE_URL, etc.

# 5. Base de datos
npx prisma migrate dev
npx prisma db seed

# 6. Arrancar API + frontend
npm run dev --workspace apps/api
npm run dev --workspace apps/frontend
```

Verificación rápida: `npm run lint && npm run typecheck && npm test`.

---

## 4. Convenciones de ramas y PRs

| Tipo      | Prefijo      | Ejemplo                     |
| --------- | ------------ | --------------------------- |
| Feature   | `feat/`      | `feat/audit-queue`          |
| Fix       | `fix/`       | `fix/rate-limit-key`        |
| Refactor  | `refactor/`  | `refactor/analyzer-ports`   |
| Chore     | `chore/`     | `chore/upgrade-prisma`      |
| Docs      | `docs/`      | `docs/troubleshooting`      |

Checklist del PR:

- [ ] Tests nuevos/actualizados (unit o integración según [16-Testing-Strategy]).
- [ ] `npm run lint` y `npm run typecheck` sin errores.
- [ ] `CHANGELOG` actualizado (ver [23-Changelog]).
- [ ] Código según [05-Coding-Standards](05-Coding-Standards.md).
- [ ] Descripción con contexto y screenshot si es UI.

---

## 5. Flujo de revisión

1. CI debe pasar en el PR (lint + typecheck + tests + build).
2. Al menos **1 aprobación** de un maintainer.
3. Sin merge con tests rojos; `main` siempre desplegable.
4. ADRs que cambien la arquitectura se discuten en el PR antes de merge.

---

## 6. Issues

| Etiqueta     | Uso                                        |
| ------------ | ------------------------------------------ |
| `bug`        | Comportamiento incorrecto.                 |
| `feature`    | Nueva capacidad.                           |
| `good-first-issue` | Tareas acotadas para nuevos contribuyentes. |
| `security`   | Problemas de seguridad (privado, ver [19-Security]). |

Buen issue: título claro, pasos para reproducir, salida esperada vs. real, versión, capturas.

---

## 7. Estructura del monorepo

```
apps/api        # API NestJS + worker
apps/cli        # CLI (Commander)
apps/frontend   # SPA React
packages/       # contracts, analysis, ai, cli-core
prisma/         # schema y migraciones
docs/           # documentación (índice: README)
```

Detalle completo en [06-Folder-Structure](06-Folder-Structure.md).

---

## 8. Releases

- Semver (`MAJOR.MINOR.PATCH`); changelog mantenido manualmente por PR (ver [23-Changelog]).
- Tag + release notes desde el changelog; el pipeline despliega `main` automáticamente
  (ver [17-Deployment](17-Deployment.md)).

---

## 9. Historial del documento

| Versión | Fecha      | Cambios                              |
| ------- | ---------- | ------------------------------------ |
| v0.1    | 2026-08-05 | Primera versión completa (Entrega 4). |
