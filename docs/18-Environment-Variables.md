# 18 · Environment Variables — Codexa

> **Estado:** Borrador v0.1 · **Última actualización:** 2026-08-05
> **Documentos relacionados:** [17-Deployment](17-Deployment.md) · [19-Security](19-Security.md) · [12-Authentication-and-Authorization](12-Authentication-and-Authorization.md) · [10-AI-Engine](10-AI-Engine.md)

---

## 1. Visión general

Toda la configuración de Codexa se expone vía variables de entorno, leídas con `ConfigService`
(NestJS) en la API/worker y con `process.env` en el CLI. **Ningún secreto va al repositorio**.

Reglas:
- `.env.example` versionado con valores de ejemplo; `.env` ignorado por git.
- Prefijo de contexto: `DATABASE_`, `REDIS_`, `JWT_`, `LLM_`, `GITHUB_`, `SMTP_`, `CORS_`.
- `ConfigService.getOrThrow()` para las obligatorias en runtime (fail-fast).

---

## 2. Variables de la API / worker

| Variable            | Requerida | Default           | Descripción                              |
| ------------------- | --------- | ----------------- | ---------------------------------------- |
| `PORT`              | No        | `3001`            | Puerto HTTP de la API.                   |
| `NODE_ENV`          | No        | `development`     | Entorno (`development`/`test`/`production`). |
| `DATABASE_URL`      | **Sí**    | —                 | DSN de PostgreSQL (`postgresql://...`).  |
| `REDIS_URL`         | **Sí**    | —                 | DSN de Redis (`redis://...`).            |
| `JWT_SECRET`        | **Sí**    | —                 | Secreto HMAC ≥ 32 bytes (ver §4).        |
| `JWT_ISSUER`        | No        | `https://api.codexa.dev` | Issuer del token.                 |
| `JWT_AUDIENCE`      | No        | `codexa-web`      | Audience del token.                      |
| `LLM_PROVIDER`      | No        | `anthropic`       | `anthropic`/`openai`/`gemini`/`deepseek`/`kimi`/`nvidia`/`openai-compatible`. |
| `LLM_API_KEY`       | Condicional | —                | Clave del proveedor activo (compatible y OpenAI). |
| `ANTHROPIC_API_KEY` | Condicional | —                | Clave Anthropic (si el provider es `anthropic`). |
| `LLM_BASE_URL`      | Condicional | —                | Endpoint para `openai-compatible` (DeepSeek/Kimi/NVIDIA o custom). |
| `LLM_MODEL_MINI`    | No        | según proveedor   | Modelo barato (clasificación).           |
| `LLM_MODEL_PRO`     | No        | según proveedor   | Modelo de sugerencias.                |
| `LLM_CACHE_TTL_SECONDS` | No    | `86400`           | TTL de la caché en Redis de sugerencias de IA por repo+commit+modelo. |
| `AUDIT_RATE_LIMIT`  | No        | `20`              | Auditorías por hora por usuario (Redis). |
| `AUTH_RATE_LIMIT`   | No        | `10`              | Intentos de login/registro por 15 min por IP (Redis). |
| `CI_AUDIT_RATE_LIMIT` | No      | `30`              | Auditorías por hora por repositorio vía `POST /api/ci/audits` (Redis). |
| `GITHUB_APP_ID`     | Condicional | —                | GitHub App (solo integración GitHub).    |
| `GITHUB_PRIVATE_KEY`| Condicional | —                | Clave privada `.pem` de la App.          |
| `GITHUB_WEBHOOK_SECRET` | Condicional | —            | Verificación de webhooks.                |
| `CORS_ORIGINS`      | No        | `http://localhost:5173` | Orígenes permitidos (csv).     |
| `SWAGGER_ENABLED`   | No        | `false`           | Habilita `/docs` en Development.         |

---

## 3. Variables del CLI

| Variable          | Requerida | Descripción                              |
| ----------------- | --------- | ---------------------------------------- |
| `CODEXA_API_URL`  | No        | URL de la API (si se sube el reporte).   |
| `CODEXA_API_KEY`  | No        | API key del usuario para subir reportes. |

---

## 4. Gestión de secretos

| Secreto            | Dónde se guarda              | Rotación        |
| ------------------ | ---------------------------- | --------------- |
| `JWT_SECRET`       | Secret store del servidor / GH Actions secret | Trimestral + on-leak. |
| `ANTHROPIC_API_KEY`| Secret store (cifrado en repo) | On-leak.        |
| `LLM_API_KEY`      | Secret store (cifrado en repo) | On-leak.        |
| `GITHUB_PRIVATE_KEY`| Secret store                 | On-leak / reinstalación de App. |
| Passwords DB/Redis | `docker-compose` secrets o env | Trimestral.     |

Nunca: commits con `.env`, logs, variables expuestas al frontend (React solo recibe `PUBLIC_`).

---

## 5. Frontend (build-time)

| Variable         | Requerida | Descripción                              |
| ---------------- | --------- | ---------------------------------------- |
| `VITE_API_URL`   | **Sí**    | Base URL de la API (proxy en dev).       |
| `VITE_ENV`       | No        | Etiqueta de ambiente en la UI.           |

---

## 6. `.env.example`

```bash
# API
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://codexa:codexa@localhost:5432/codexa
REDIS_URL=redis://localhost:6379

# Auth
JWT_SECRET=change-me-32-chars-min
JWT_ISSUER=http://localhost:3001
JWT_AUDIENCE=codexa-web

# LLM (ejemplos por proveedor)
# Anthropic
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=
# LLM_MODEL_MINI=claude-haiku-4-5
# LLM_MODEL_PRO=claude-sonnet-4-5

# OpenAI-compatible: DeepSeek (free/low-cost)
# LLM_PROVIDER=deepseek
# LLM_API_KEY=
# LLM_MODEL_MINI=deepseek-chat
# LLM_MODEL_PRO=deepseek-reasoner

# OpenAI-compatible: Kimi (Moonshot AI)
# LLM_PROVIDER=kimi
# LLM_API_KEY=
# LLM_MODEL_MINI=kimi-k2
# LLM_MODEL_PRO=kimi-k2

# OpenAI-compatible: NVIDIA NIM (modelos free con rate limits)
# LLM_PROVIDER=nvidia
# LLM_API_KEY=
# LLM_MODEL_MINI=meta/llama-3.1-8b-instruct
# LLM_MODEL_PRO=deepseek-ai/deepseek-r1

# OpenAI-compatible: endpoint custom
# LLM_PROVIDER=openai-compatible
# LLM_API_KEY=
# LLM_BASE_URL=https://mi-gateway.local/v1
# LLM_MODEL_MINI=
# LLM_MODEL_PRO=

# GitHub (opcional)
GITHUB_APP_ID=
GITHUB_PRIVATE_KEY=
GITHUB_WEBHOOK_SECRET=

# Web
CORS_ORIGINS=http://localhost:5173
SWAGGER_ENABLED=true

# Frontend
VITE_API_URL=http://localhost:3001
```

---

## 7. Validación en runtime

```typescript
// common/config/validation.ts
import { z } from 'zod';

export const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

export function validateEnv(env: NodeJS.ProcessEnv) {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    throw new Error(`Configuración inválida: ${JSON.stringify(parsed.error.flatten())}`);
  }
  return parsed.data;
}
```

Fail-fast: el proceso aborta al arrancar si falta una variable requerida.

---

## 8. Checklist de implementación

- [ ] `.env.example` completo y versionado (incluye presets DeepSeek/Kimi/NVIDIA).
- [ ] `validateEnv` con zod en `main.ts` (fail-fast).
- [ ] Secretos en secret store, nunca en git.
- [ ] Documentación de cada variable en la tabla §2.
- [ ] Frontend solo expone `VITE_`.
- [ ] `LLM_BASE_URL` y modelos por proveedor verificados contra la doc oficial.

---

## 9. Historial del documento

| Versión | Fecha      | Cambios                              |
| ------- | ---------- | ------------------------------------ |
| v0.1    | 2026-08-05 | Primera versión completa (Entrega 4). |
