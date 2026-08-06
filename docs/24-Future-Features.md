# 24 · Future Features — Codexa

> **Estado:** Borrador v0.1 · **Última actualización:** 2026-08-05
> **Documentos relacionados:** [01-Roadmap](01-Roadmap.md) · [02-Product-Requirements](02-Product-Requirements.md) · [14-API-Documentation](14-API-Documentation.md) · [17-Deployment](17-Deployment.md)

---

## 1. Visión general

Capacidades fuera del MVP, ordenadas por valor para el producto. Cada feature incluye la fase
objetivo (ver [01-Roadmap]) y las dependencias técnicas. Nada de esto está comprometido para el
MVP.

---

## 2. Fase 2 — Feedback loop (alta prioridad)

### 2.1 Análisis diff-aware en PRs
- Auditar solo el diff del PR (reducción de coste y ruido).
- Dependencia: [13-GitHub-Integration] y worker BullMQ.
- Relacionado: NFR-15 y [21-Performance-Optimization].

### 2.2 Equipos y roles
- Organizaciones/equipos con roles (`owner`, `admin`, `member`).
- Dependencia: modelo de datos ampliado + autorización por equipo.

### 2.3 Programación de auditorías
- Cron de auditorías (diarias/semanales) con notificación por email.
- Dependencia: BullMQ repeat jobs + servicio SMTP.

---

## 3. Fase 3 — Más lenguajes y profundo

| Lenguaje | Motor propuesto                          | Prioridad |
| -------- | ---------------------------------------- | --------- |
| Python   | `ruff` + `mypy` (shell-out)              | Alta      |
| Go       | `go vet` + `staticcheck` (shell-out)     | Media     |
| Rust     | `cargo clippy` (shell-out)               | Baja      |

Modelo común: los lenguajes adicionales se integran vía **adapters de shell-out** (mismo patrón
que `DotnetBridge` en [11-Code-Analyzer] §6), sin tocar el core.

---

## 4. Fase 4 — Auto-fix y aplicaciones de IA

### 4.1 Diff aplicable (auto-fix)
- La IA genera un diff aplicable opcionalmente; el usuario lo aprueba en UI o `codexa fix`.
- Dependencias: ejecución segura del diff (contenedor), branch por defecto, tests post-fix.

### 4.2 Explicaciones de deuda en lenguaje natural
- Resumen ejecutivo por módulo (ya esbozado en `AiSuggestion.type === 'summary'`).

### 4.3 Entrenamiento de reglas custom
- Reglas de organización definidas por el usuario (patrones propios) que el analizador respeta.

---

## 5. Fase 5 — Escala y producto

| Feature                        | Notas                                        |
| ------------------------------ | -------------------------------------------- |
| Multitenancy por organización  | Aislamiento de datos por workspace.          |
| Planes y facturación           | Stripe; requiere datos de pago → revisar GDPR/CCPA (ver [19-Security]). |
| Múltiples proveedores LLM con fallback automático | Gateway ya abstraído ([10-AI-Engine] §4). |
| On-prem / self-hosted          | Docker Compose existente listo para ello.    |
| Analizador de IaC (Terraform, Dockerfile) | Shell-out a `tflint`/`hadolint`.      |

---

## 6. Fuera de alcance (no planificado)

- IDE plugin (prioridad baja; el CLI cubre el caso).
- Interfaz de código generado automáticamente en el editor.
- Auditar monorepos multi-lenguaje en una sola corrida (se audita por submódulo).

---

## 7. Criterios de priorización

1. **Valor para el usuario** (reducción de deuda medida).
2. **Coste operativo** (llamadas LLM, infraestructura).
3. **Complejidad técnica** (riesgo de romper el determinismo del análisis).
4. Alineación con el roadmap ([01-Roadmap]) y el feedback de los early adopters.

---

## 8. Historial del documento

| Versión | Fecha      | Cambios                              |
| ------- | ---------- | ------------------------------------ |
| v0.1    | 2026-08-05 | Primera versión completa (Entrega 4). |

---

[01-Roadmap]: 01-Roadmap.md
[10-AI-Engine]: 10-AI-Engine.md
[11-Code-Analyzer]: 11-Code-Analyzer.md
[13-GitHub-Integration]: 13-GitHub-Integration.md
[19-Security]: 19-Security.md
[21-Performance-Optimization]: 21-Performance-Optimization.md
