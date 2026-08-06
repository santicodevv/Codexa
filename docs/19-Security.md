# 19 · Security — Codexa

> **Estado:** Borrador v0.1 · **Última actualización:** 2026-08-05
> **Documentos relacionados:** [12-Authentication-and-Authorization](12-Authentication-and-Authorization.md) · [18-Environment-Variables](18-Environment-Variables.md) · [20-Repository-Safety](20-Repository-Safety.md) · [13-GitHub-Integration](13-GitHub-Integration.md)

---

## 1. Visión general

Codexa procesa **código de terceros** y llama a **LLMs externos**: dos vectores de riesgo serios.
La estrategia de seguridad cubre: autenticación/autenticación, protección de datos, sanitización
de secretos, seguridad del sandbox de análisis y postura del repositorio.

Principios:
- **Defensa en profundidad** en el sandbox (aislar, no solo confiar en validación).
- **Cero secretos** en código, logs o prompts.
- **Least privilege**: tokens de GitHub con permisos mínimos, claves LLM solo en servidor.
- **Fail closed** en autorización (denegar por defecto).

---

## 2. Modelo de amenazas (resumen)

| Amenaza                          | Superficie                         | Mitigación                                    |
| -------------------------------- | ---------------------------------- | --------------------------------------------- |
| Repo malicioso (código)           | Analizadores, sandbox              | Aislamiento, sin red, timeouts, límites (ver [20-Repository-Safety]). |
| Prompt injection vía código       | Pipeline IA                        | Instrucciones del sistema, salida solo JSON, validación zod. |
| Robo de tokens (GitHub)           | Instalación de la App              | Tokens cortos, permisos mínimos, revocación.  |
| IDOR / acceso a datos ajenos      | API                                | `@CurrentUser` + checks de propiedad.         |
| Exfiltración de secretos          | Logs, reportes, prompts            | Sanitizador, redacción en logs.               |
| DoS por auditorías abusivas       | API, colas                         | Rate limiting + límites de tamaño de repo.    |
| Supply chain                      | Dependencias                       | Dependabot + `npm audit` en CI.               |

---

## 3. Autenticación y autorización

- JWT access (15 min) + refresh rotativo; detalle completo en
  [12-Authentication-and-Authorization](12-Authentication-and-Authorization.md).
- Endpoints protegidos con `JwtAuthGuard`; rutas públicas marcadas con `@Public()`.
- Checks de propiedad (IDOR) en cada query/handler: el `ownerId` siempre viene del token.
- Rate limiting con Redis en auth y auditorías.

---

## 4. Manejo de secretos

| Secreto          | Reglas                                                        |
| ---------------- | ------------------------------------------------------------- |
| `JWT_SECRET`     | ≥ 32 bytes aleatorios; rotación documentada.                  |
| LLM API keys     | Solo en el servidor; nunca en el cliente ni en reportes.      |
| GitHub key `.pem`| Cifrada en el secret store; instalación con permisos mínimos. |
| `.env*`          | Ignorados por git; `.env.example` sin valores reales.         |

Sanitizador antes de armar prompts (ver [10-AI-Engine](10-AI-Engine.md) §7) y de escribir logs:
regex + patrones de credenciales.

---

## 5. Sanitización de código y reportes

- El **reporte público** nunca contiene el código fuente completo; solo `filePath` + `lineNumber` +
  extractos acotados (diff/hunk).
- Los prompts de IA reciben solo el hunk relevante, sanitizado de tokens/secretos.
- Los logs redactan URLs de webhook y claves (`[REDACTED]`).

---

## 6. Seguridad del sandbox de análisis

El código auditado se clona en un sandbox aislado. Detalles y límites en
[20-Repository-Safety](20-Repository-Safety.md). Resumen de garantías:

- Sin salida de red desde el worker de análisis (deny all, allowlist a API de Codexa).
- Timeout y límite de memoria/CPU por auditoría.
- Ejecución con usuario sin privilegios; borrado post-auditoría.

---

## 7. Seguridad en el repositorio / CI

- Branch protection en `main` (reviews requeridos, checks obligatorios).
- Dependabot para dependencias + `npm audit` en CI (fail on critical).
- `codeql` (GitHub) para análisis estático del propio código de Codexa.
- Imágenes base con escaneo de CVEs (Trivy o similar) en el pipeline.

---

## 8. Respuesta a incidentes

| Fase     | Acciones                                                  |
| -------- | -------------------------------------------------------- |
| Detección| Alertas de uptime, error rates, rate limit elevado.      |
| Contención | Rotar secretos afectados, revocar tokens, aislar worker. |
| Remediación | Parchear, desplegar fix, actualizar dependencias.      |
| Post-mortem | Revisión de causa raíz en [23-Changelog].               |

Playbook resumido:
1. Identificar alcance (qué datos/tokens se expusieron).
2. Rotar todos los secretos posiblemente comprometidos.
3. Revocar instalaciones de la GitHub App afectadas.
4. Comunicar a usuarios afectados (si hubo datos personales).

---

## 9. Cumplimiento (nota)

MVP: no almacena PII relevante más allá de email/contraseña (bcrypt) y nombre. Cuando haya
facturación/equipos, revisar GDPR/CCPA (se anota en [24-Future-Features]).

---

## 10. Checklist de implementación

- [ ] `JwtAuthGuard` en rutas protegidas + `@CurrentUser`.
- [ ] Tests de seguridad: IDOR, token expirado, refresh robado, rate limit.
- [ ] Sanitizador de prompts y logs.
- [ ] Sandbox aislado sin red + límites (ver [20-Repository-Safety]).
- [ ] Dependabot + `npm audit` + codeql en CI.
- [ ] Script de rotación de `JWT_SECRET`.
- [ ] Playbook de incidentes documentado (§8).

---

## 11. Historial del documento

| Versión | Fecha      | Cambios                              |
| ------- | ---------- | ------------------------------------ |
| v0.1    | 2026-08-05 | Primera versión completa (Entrega 4). |

---

[20-Repository-Safety]: 20-Repository-Safety.md
[23-Changelog]: 23-Changelog.md
[24-Future-Features]: 24-Future-Features.md
