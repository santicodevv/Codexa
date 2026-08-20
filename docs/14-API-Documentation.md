# 14 · API Documentation — Codexa

> **Estado:** Borrador v0.1 · **Última actualización:** 2026-08-05
> **Documentos relacionados:** [08-Backend-Architecture](08-Backend-Architecture.md) · [09-Frontend-Architecture](09-Frontend-Architecture.md) · [12-Authentication-and-Authorization](12-Authentication-and-Authorization.md) · [13-GitHub-Integration](13-GitHub-Integration.md)

---

## 1. Convenciones

### 1.1 Formato general

- **Base URL:** `http://localhost:3001` (dev) · `https://api.codexa.dev` (prod).
- **Prefijo global:** todos los endpoints van bajo `/api` (p. ej. `/api/health`, `/api/auth/login`).
- **Formato:** JSON (`application/json`). Errores con formato `ProblemDetails`.
- **Autenticación:** `Authorization: Bearer <accessToken>` salvo endpoints públicos de auth.
- **Ids:** UUID en formato estándar.
- **Fechas:** ISO-8601 UTC (`2026-08-05T14:30:00Z`).

### 1.2 Paginación

Respuestas paginadas con el formato:

```json
{
  "items": [ ... ],
  "page": 1,
  "pageSize": 20,
  "totalCount": 57,
  "totalPages": 3,
  "hasNext": true
}
```

Parámetros: `page` (1-based), `pageSize` (máx. 100, default 20).

### 1.3 Códigos de estado usados

| Código | Uso                                                        |
| ------ | ---------------------------------------------------------- |
| 200    | Operación exitosa.                                         |
| 201    | Recurso creado (auth/register, repositorios).              |
| 202    | Aceptado para procesamiento async (auditorías).            |
| 400    | Petición inválida (validación de campos).                  |
| 401    | Token ausente/expirado.                                    |
| 403    | Token válido pero sin permiso (no es el dueño).            |
| 404    | Recurso no encontrado.                                     |
| 409    | Conflicto (email duplicado, repo ya registrado).           |
| 429    | Rate limit superado.                                       |
| 500    | Error interno (detalle genérico).                          |

### 1.4 Formato de error (ProblemDetails)

```json
{
  "type": "https://api.codexa.dev/errors/validation",
  "title": "Validation Failed",
  "status": 400,
  "code": "repositories.name.required",
  "detail": "El nombre del repositorio es obligatorio.",
  "traceId": "00-abc...",
  "errors": { "name": ["El nombre es obligatorio."] }
}
```

---

## 2. Autenticación

| Método | Ruta                    | Descripción                    | Auth |
| ------ | ----------------------- | ------------------------------ | ---- |
| POST   | `/api/auth/register`    | Crear cuenta                   | No   |
| POST   | `/api/auth/login`       | Obtener tokens                 | No   |
| POST   | `/api/auth/refresh`     | Rotar refresh                  | No   |
| POST   | `/api/auth/logout`      | Revocar refresh                | Sí   |
| GET    | `/api/auth/me`          | Usuario actual                 | Sí   |

Ejemplos y detalles en [12-Authentication-and-Authorization](12-Authentication-and-Authorization.md).

---

## 3. Repositorios

### 3.1 Listar repositorios del usuario

```
GET /api/repositories
Authorization: Bearer <token>

200
{
  "items": [
    {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "name": "codexa",
      "provider": "github",
      "url": "https://github.com/me/codexa",
      "lastAudit": { "id": "...", "healthScore": 87, "completedAt": "2026-08-05T14:30:00Z" },
      "createdAt": "2026-07-01T10:00:00Z"
    }
  ],
  "page": 1, "pageSize": 20, "totalCount": 1, "totalPages": 1, "hasNext": false
}
```

### 3.2 Registrar repositorio

```
POST /api/repositories
Authorization: Bearer <token>
{
  "name": "codexa",
  "provider": "github",
  "url": "https://github.com/me/codexa"
}

201
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "name": "codexa",
  "provider": "github",
  "url": "https://github.com/me/codexa",
  "createdAt": "2026-08-05T15:00:00Z"
}
```

### 3.3 Eliminar repositorio (y sus auditorías)

```
DELETE /api/repositories/{id}
Authorization: Bearer <token>

204 No Content
```

### 3.4 Generar (o rotar) la API key de CI

```
POST /api/repositories/{id}/ci-key
Authorization: Bearer <token>

200
{ "apiKey": "cxa_3f9a1c..." }
```

> El valor en texto plano solo se devuelve en esta respuesta — solo el hash (SHA-256) queda
> persistido. Usar este valor como `api-key` de la GitHub Action `codexa/audit` (§5). Generar de
> nuevo invalida la key anterior.

---

## 4. Auditorías

### 4.1 Ejecutar auditoría

```
POST /api/repositories/{repositoryId}/audits
Authorization: Bearer <token>
{
  "provider": "openai",      // opcional; default de configuración
  "model": "gpt-4o"          // opcional
}

201 Created
{ "id": "7a1b2c3d-...", "status": "pending" }
```

> Ejecución asíncrona vía cola BullMQ sobre Redis: la respuesta es inmediata (`status: pending`);
> un proceso worker separado (`npm run start:worker`) consume la cola y transiciona el estado
> `pending → running → completed|failed`. El cliente hace *polling* con
> `GET .../audits/{auditId}` (el dashboard reintenta cada 2s con timeout de 5 min).

### 4.2 Detalle de una auditoría

```
GET /api/repositories/{repositoryId}/audits/{auditId}
Authorization: Bearer <token>

200
{
  "id": "7a1b2c3d-...",
  "repository": { "name": "...", "url": "..." },
  "status": "completed",
  "commitSha": "a1b2c3d",
  "provider": "openai",
  "model": "gpt-4o",
  "healthScore": 87,
  "severityCounts": { "critical": 2, "medium": 13, "low": 9 },
  "totalFindings": 24,
  "estimatedDebtHours": "8.5",
  "durationMs": 38200,
  "startedAt": "2026-08-05T16:00:00Z",
  "completedAt": "2026-08-05T16:00:38Z",
  "errorMessage": null,
  "findings": [
    {
      "id": "...",
      "ruleId": "CD-001",
      "severity": "critical",
      "message": "Símbolo privado '_cache' sin uso.",
      "filePath": "src/modules/payments/payment.service.ts",
      "lineNumber": 210,
      "columnNumber": 1,
      "likelihood": 0.9,
      "metadata": { "symbol": "PaymentService._cache" }
    }
  ],
  "suggestions": [
    {
      "id": "...",
      "type": "refactor",
      "title": "Divide PaymentService",
      "description": "Extrae la validación de pagos a un servicio dedicado.",
      "targetFile": "src/modules/payments/payment.service.ts",
      "targetLine": 77
    }
  ],
  "moduleSummaries": [
    { "id": "...", "moduleName": "Services", "moduleScore": 62, "findingCount": 11 }
  ]
}
```

> Un único endpoint devuelve la auditoría con hallazgos, sugerencias de IA y resumen por módulo
> incluidos — no hay un endpoint `/report` separado.

### 4.3 Exportar a PDF

```
GET /api/repositories/{repositoryId}/audits/{auditId}/export.pdf
Authorization: Bearer <token>

200
Content-Type: application/pdf
Content-Disposition: attachment; filename="codexa-audit-{auditId}.pdf"
```

### 4.4 Historial del repositorio

```
GET /api/repositories/{repositoryId}/audits?page=1&pageSize=20
Authorization: Bearer <token>

200
{ "items": [ { ... auditoría ... } ], "page": 1, "pageSize": 20, "totalCount": 3, ... }
```

### 4.5 Tendencia del Health Score

```
GET /api/repositories/{repositoryId}/audits/trend?limit=20
Authorization: Bearer <token>

200
{
  "items": [
    {
      "id": "...",
      "healthScore": 87,
      "criticalCount": 2,
      "mediumCount": 13,
      "lowCount": 9,
      "totalFindings": 24,
      "startedAt": "2026-08-05T16:00:00Z"
    }
  ]
}
```

> Solo incluye auditorías con `status: completed`, ordenadas cronológicamente (más antigua
> primero). `limit` por defecto 20.

---

## 5. Endpoints para CI / GitHub Action

Autenticación por API key de repositorio (no JWT de usuario): header `X-Codexa-Api-Key` con el
valor devuelto por `POST /api/repositories/{id}/ci-key` (§3.4). El repositorio auditado se resuelve
a partir de esa key — el body nunca indica `repositoryId`.

| Método | Ruta                     | Descripción                                                  | Auth            |
| ------ | ------------------------ | ------------------------------------------------------------- | --------------- |
| POST   | `/api/ci/audits`         | Encola una auditoría del repositorio (opcionalmente de un `ref` específico, ej. la head branch de un PR). Mismo patrón async que §4.1. | API key (CI) |
| GET    | `/api/ci/audits/{id}`    | Detalle/estado de una auditoría de CI, para *polling*.        | API key (CI)    |

```
POST /api/ci/audits
X-Codexa-Api-Key: cxa_3f9a1c...
{
  "ref": "feature/mi-rama",   // opcional; sin esto audita la rama por defecto
  "provider": "anthropic",    // opcional
  "model": "claude-sonnet-4-5" // opcional
}

201
{ "id": "7a1b2c3d-...", "status": "pending" }
```

```
GET /api/ci/audits/{id}
X-Codexa-Api-Key: cxa_3f9a1c...

200
{
  "id": "7a1b2c3d-...",
  "status": "completed",
  "commitSha": "a1b2c3d",
  "healthScore": 87,
  "severityCounts": { "critical": 2, "medium": 13, "low": 9 },
  "totalFindings": 24,
  "estimatedDebtHours": "8.5",
  "errorMessage": null,
  "findings": [ { "ruleId": "CD-001", "severity": "critical", "filePath": "...", "lineNumber": 210 } ],
  "suggestions": [ { "type": "refactor", "title": "Divide PaymentService", "targetFile": "...", "targetLine": 77 } ]
}
```

> La GitHub Action `codexa/audit` (`apps/github-action`, ver [13-GitHub-Integration]) usa estos dos
> endpoints: dispara la auditoría, hace *polling* hasta `completed`/`failed`, y con el resultado
> publica un comentario resumen + comentarios inline (solo hallazgos críticos en líneas del diff)
> en el Pull Request. El webhook de la GitHub App (`POST /api/github/webhook`) no está implementado
> todavía — queda para el siguiente slice de la Fase 3.

---

## 6. Métodos soportados y no soportados

| Método        | Soportado            |
| ------------- | -------------------- |
| GET / POST / DELETE | Sí              |
| PUT / PATCH   | No en el MVP         |

Versionado: `Accept: application/vnd.codexa.v1+json` (opcional). No se versionará por URL en el
MVP; se documentará en [24-Future-Features].

---

## 7. Códigos de error por dominio

| `code`                        | HTTP | Significado                          |
| ----------------------------- | ---- | ------------------------------------ |
| `auth.invalid_credentials`    | 401  | Email o contraseña incorrectos.      |
| `auth.invalid_refresh_token`  | 401  | Refresh expirado o revocado.         |
| `auth.email_exists`           | 409  | Email ya registrado.                 |
| `repositories.name.required`  | 400  | Falta el nombre.                     |
| `repositories.url.invalid`    | 400  | URL no válida o no soportada.        |
| `repositories.not_found`      | 404  | No existe o no es tuyo (se oculta).  |
| `audits.not_found`            | 404  | Auditoría inexistente.               |
| `audits.forbidden`            | 403  | Auditoría de otro usuario.           |
| `audits.provider_unavailable` | 503  | Proveedor LLM caído (modo sin IA).   |
| `rate.limit_exceeded`         | 429  | Demasiadas peticiones.               |

---

## 8. OpenAPI / Swagger

- Generado con `@nestjs/swagger` en dev: `/docs` (solo en Development).
- El contrato OpenAPI (`openapi.json`) sirve para generar el cliente TS si se decide (ver
  [09-Frontend-Architecture](09-Frontend-Architecture.md) §7).

---

## 9. Checklist de implementación

- [x] Middleware de errores → ProblemDetails consistente (`ProblemDetailsFilter`).
- [ ] Paginación uniforme en todos los listados (falta en `GET /repositories`).
- [x] Detalle de auditoría con los tres bloques (findings, suggestions, modules) — vive en
      `GET .../audits/{id}`, no en un endpoint `/report` separado (diseño final, ver §4.2).
- [x] Export a PDF (`GET .../audits/{id}/export.pdf`). Md/html no implementados.
- [x] `/api/ci/audits` con API key de workflow (repositorio, no usuario).
- [x] Swagger público en dev (`/api/docs`, gateado por `SWAGGER_ENABLED`).
- [ ] Tests de contrato: ejemplos de este documento como fixtures de integración.

---

## 10. Historial del documento

| Versión | Fecha      | Cambios                              |
| ------- | ---------- | ------------------------------------ |
| v0.1    | 2026-08-05 | Primera versión completa (Entrega 3) |
| v0.2    | 2026-08-20 | §3.4 y §5 actualizadas al endpoint real de CI (API key de repositorio, no de workflow genérico; sin `/api/github/webhook` todavía). |

---

[24-Future-Features]: 24-Future-Features.md
[13-GitHub-Integration]: 13-GitHub-Integration.md
