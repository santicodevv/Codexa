# 02 · Product Requirements — Codexa

> **Estado:** Borrador v0.1 · **Última actualización:** 2026-08-05
> **Documentos relacionados:** [00-Project-Overview](00-Project-Overview.md) · [01-Roadmap](01-Roadmap.md) · [03-System-Architecture](03-System-Architecture.md) · [05-Coding-Standards](05-Coding-Standards.md)

---

## 1. Introducción

Este documento define el **qué** y el **cuánto** del producto Codexa: quién lo usa, qué
funcionalidad debe tener, con qué prioridad, y bajo qué condiciones de calidad. Es la fuente de
verdad para estimar trabajo y escribir tests de aceptación.

**Convención de prioridad (MoSCoW):**

| Código | Significado        | Descripción                                  |
| ------ | ------------------ | -------------------------------------------- |
| P0     | Must have (MVP)    | Sin esto el producto no tiene sentido.       |
| P1     | Should have        | Importante; puede publicarse en una segunda iteración. |
| P2     | Could have         | Deseable si sobra tiempo.                    |
| P3     | Won't have (ahora) | Explícitamente fuera de alcance.             |

---

## 2. Personas y casos de uso

### 2.1 Personas

| ID    | Persona            | Contexto de uso                                        |
| ----- | ------------------ | ------------------------------------------------------ |
| P-01  | Dev individual     | Quiere sanear un repo propio o heredado.               |
| P-02  | Tech Lead          | Quiere medir deuda técnica de un equipo o subir a producción con criterio. |
| P-03  | Reviewer           | Revisa PRs y quiere un segundo par de ojos.            |
| P-04  | Evaluador externo  | Ve el proyecto en GitHub/portafolio y evalúa calidad.  |

### 2.2 Casos de uso principales

| ID    | Caso de uso                          | Persona | Prioridad |
| ----- | ------------------------------------ | ------- | --------- |
| CU-01 | Auditar un repositorio local         | P-01    | P0        |
| CU-02 | Auditar un repositorio remoto (URL)  | P-01, P-02 | P0   |
| CU-03 | Ver reporte priorizado               | P-01, P-02 | P0   |
| CU-04 | Exportar reporte                     | P-01, P-02 | P0   |
| CU-05 | Ver historial y tendencias           | P-02    | P1        |
| CU-06 | Recibir auditoría automática en PR   | P-03    | P1        |

---

## 3. Requerimientos funcionales (FR)

Los FR están agrupados por módulo. Cada FR tiene un criterio de aceptación verificable (AC).

### 3.1 Módulo: Auditoría (núcleo)

| ID     | Requerimiento                                                                   | Prioridad |
| ------ | ------------------------------------------------------------------------------- | --------- |
| FR-001 | El sistema debe auditar un repositorio local dado por ruta.                     | P0        |
| FR-002 | El sistema debe auditar un repositorio remoto por URL (clonado a temporal).     | P0        |
| FR-003 | El sistema debe detectar el lenguaje principal y cargar los analizadores aplicables. | P0   |
| FR-004 | El sistema debe detectar dependencias vulnerables declaradas (package.json y, vía dotnet, NuGet). | P0 |
| FR-005 | El sistema debe detectar símbolos muertos (dead code) con `archivo:línea`.      | P0        |
| FR-006 | El sistema debe calcular complejidad ciclomática por función.                   | P1        |
| FR-007 | El sistema debe detectar funciones/métodos sin tests.                           | P0        |
| FR-008 | El sistema debe consolidar hallazgos en un único modelo normalizado.            | P0        |
| FR-009 | El sistema debe calcular un Health Score 0-100 reproducible.                    | P0        |
| FR-010 | El sistema debe priorizar hallazgos por impacto × probabilidad.                 | P0        |
| FR-011 | El sistema debe generar sugerencias de refactor con IA, citando archivo y línea. | P0       |
| FR-012 | El sistema debe permitir configurar el proveedor LLM y el modelo.               | P0        |
| FR-013 | El sistema debe respetar límites de tokens y presupuesto por auditoría.         | P1        |
| FR-014 | El sistema debe reportar errores parciales (ej. un analizador falló) sin abortar. | P1     |
| FR-015 | El sistema debe emitir el reporte en Markdown y HTML (MVP); PDF en Fase 2.      | P0        |

### 3.2 Módulo: Analizadores

| ID     | Requerimiento                                                                    | Prioridad |
| ------ | -------------------------------------------------------------------------------- | --------- |
| FR-020 | Analizador TS/JS: usar TypeScript compiler API (AST) para dead code, complejidad y símbolos sin uso. | P0 |
| FR-021 | Analizador JS/TS: ejecutar ESLint con reglas por defecto de la configuración.    | P0        |
| FR-022 | Analizador de dependencias: ejecutar `npm audit` y parsear su JSON.              | P0        |
| FR-023 | Analizador de coverage: detectar métodos sin cobertura usando datos de tests existentes (o análisis estático). | P1 |
| FR-024 | Analizador .NET (opcional): invocar herramientas `dotnet` como procesos externos (requiere SDK en el host). | P2 |
| FR-025 | Los resultados de cada analizador deben ser idempotentes (mismo repo → mismo output). | P0 |
| FR-026 | Cada analizador debe implementar la interfaz `IAnalyzer` con metadatos (nombre, versión, lenguajes). | P0 |

### 3.3 Módulo: LLM Gateway

| ID     | Requerimiento                                                                     | Prioridad |
| ------ | --------------------------------------------------------------------------------- | --------- |
| FR-030 | El gateway debe exponer un contrato único de "análisis semántico" a los consumidores. | P0   |
| FR-031 | El gateway debe soportar OpenAI como primer proveedor (Chat Completions).         | P0        |
| FR-032 | El gateway debe soportar Anthropic Claude (mensajes).                             | P1        |
| FR-033 | El gateway debe soportar Google Gemini (generative).                              | P1        |
| FR-033a | El gateway debe soportar proveedores OpenAI-compatible vía `baseURL` configurable (DeepSeek, Kimi/Moonshot, NVIDIA NIM, o endpoint custom). | P0 |
| FR-033b | El gateway debe incluir presets de fábrica para DeepSeek, Kimi y NVIDIA NIM (baseURL + modelos por defecto). | P1 |
| FR-034 | El gateway debe permitir cambiar proveedor vía configuración sin cambios de código. | P0     |
| FR-035 | El gateway debe registrar uso (tokens, coste estimado, latencia) por auditoría.   | P1        |
| FR-036 | El gateway debe fallar gracefulmente (timeout → degradación a modo sin IA).       | P1        |
| FR-037 | Las respuestas del LLM deben validarse contra un esquema JSON estricto.           | P0        |

### 3.4 Módulo: Reportes

| ID     | Requerimiento                                                                    | Prioridad |
| ------ | -------------------------------------------------------------------------------- | --------- |
| FR-040 | El reporte debe mostrar: score, resumen ejecutivo, hallazgos por severidad y sugerencias. | P0 |
| FR-041 | El reporte debe incluir metadatos (fecha, hash del commit, proveedor, duración).  | P0        |
| FR-042 | El reporte HTML debe ser responsive y exportable a imagen (para portafolio).      | P1        |
| FR-043 | El reporte debe permitir filtrar por severidad y tipo.                            | P1        |
| FR-044 | El reporte PDF debe generarse en la Fase 2 (API).                                 | P1        |

### 3.5 Módulo: Plataforma (Fase 2)

| ID     | Requerimiento                                                                    | Prioridad |
| ------ | -------------------------------------------------------------------------------- | --------- |
| FR-050 | La API debe exponer endpoints REST documentados para repositorios y auditorías.   | P0        |
| FR-051 | Un usuario autenticado puede crear repositorios y disparar auditorías.            | P0        |
| FR-052 | Las auditorías se persisten con su reporte estructurado (no solo texto).          | P0        |
| FR-053 | El dashboard lista repositorios con su último Health Score.                       | P0        |
| FR-054 | El dashboard muestra el detalle de una auditoría (hallazgos, sugerencias, score). | P1        |
| FR-055 | El dashboard muestra el historial de auditorías de un repositorio.                | P1        |
| FR-056 | El dashboard permite exportar el reporte en los formatos soportados.              | P1        |
| FR-057 | Las auditorías largas corren en background con estado consultable.                | P1        |

### 3.6 Módulo: Autenticación y autorización

| ID     | Requerimiento                                                                     | Prioridad |
| ------ | --------------------------------------------------------------------------------- | --------- |
| FR-060 | Registro de usuarios con email y contraseña (hash seguro).                        | P0        |
| FR-061 | Login con emisión de JWT (access + refresh).                                      | P0        |
| FR-062 | Un usuario solo accede a sus propios repositorios y auditorías.                   | P0        |
| FR-063 | Rate limiting por usuario/IP en endpoints de auditoría.                           | P0        |
| FR-064 | Los tokens de API para LLM se guardan cifrados (no en claro).                     | P0        |

### 3.7 Módulo: Integración GitHub (Fase 3)

| ID     | Requerimiento                                                                     | Prioridad |
| ------ | --------------------------------------------------------------------------------- | --------- |
| FR-070 | GitHub App con permisos mínimos (contents:read, pull_requests:write).             | P0        |
| FR-071 | Action reutilizable `codexa/audit` que produce comentario de resumen.             | P0        |
| FR-072 | La Action reporta los hallazgos críticos en el PR como comentario inline.         | P1        |
| FR-073 | La Action puede bloquear el merge si la severidad crítica supera un umbral.       | P2        |

---

## 4. Requerimientos no funcionales (NFR)

### 4.1 Rendimiento

| ID     | Requerimiento                                                           | Objetivo                  |
| ------ | ----------------------------------------------------------------------- | ------------------------- |
| NFR-01 | Auditoría de un repo mediano (< 5k archivos) por CLI.                   | ≤ 60 s                    |
| NFR-02 | Llamadas LLM con timeout y reintentos acotados.                         | Timeout ≤ 30 s, 2 retries |
| NFR-03 | API: respuesta de lectura (dashboard) en régimen normal.                | p95 ≤ 500 ms              |
| NFR-04 | La app web carga el dashboard inicial.                                  | LCP ≤ 2.5 s               |

### 4.2 Seguridad

| ID     | Requerimiento                                                           |
| ------ | ----------------------------------------------------------------------- |
| NFR-10 | Contraseñas hasheadas con bcrypt/Argon2.                                |
| NFR-11 | Tokens JWT firmados, expiración corta, refresh rotativo.                |
| NFR-12 | Claves de LLM cifradas en reposo (Datos de Protección en [19-Security]).|
| NFR-13 | No se persiste el código fuente completo de repos auditados.            |
| NFR-14 | Validación de entrada (ruta, URL) para evitar path traversal / SSRF.    |

### 4.3 Usabilidad

| ID     | Requerimiento                                                           |
| ------ | ----------------------------------------------------------------------- |
| NFR-20 | El CLI muestra progreso y errores claros en español e inglés.           |
| NFR-21 | El dashboard es navegable con teclado (WCAG 2.1 AA básico).             |
| NFR-22 | El reporte HTML se lee sin contexto previo (autocontenido).             |

### 4.4 Portabilidad y mantenibilidad

| ID     | Requerimiento                                                           |
| ------ | ----------------------------------------------------------------------- |
| NFR-30 | El núcleo (Analyzer Engine + Gateway) es agnóstico al host (CLI/API).   |
| NFR-31 | Se ejecuta localmente con Docker Compose en Windows/Linux/macOS.        |
| NFR-32 | Cobertura de tests del propio proyecto ≥ 70 % al cierre de la Fase 2.   |
| NFR-33 | Documentación viva: cada feature mergeada actualiza `docs/`.            |

---

## 5. Reglas de negocio

| ID     | Regla                                                                                      |
| ------ | ------------------------------------------------------------------------------------------ |
| RB-01  | El Health Score es 0-100: 100 - (penalización por severidad) - (penalización por deuda), nunca negativo. |
| RB-02  | Un hallazgo se prioriza como: `severity × likelihood`.                                      |
| RB-03  | Las sugerencias de IA siempre se marcan como "no verificadas por compilación".              |
| RB-04  | Una auditoría de un repo remoto descarta el clon temporal al terminar.                      |
| RB-05  | Los límites de tokens por auditoría los define el plan del usuario (default: 200k tokens).  |
| RB-06  | Resultados determinísticos nunca dependen del proveedor LLM (solo la priorización/sugerencias). |

---

## 6. Criterios de aceptación (historias de ejemplo)

| Historia                     | Dado (Given)                                             | Cuando (When)                          | Entonces (Then)                                                        |
| ---------------------------- | -------------------------------------------------------- | -------------------------------------- | ---------------------------------------------------------------------- |
| Auditar repo local           | un repo .NET con dead code conocido                      | ejecuto `codexa audit --path repo`     | el reporte lista el símbolo muerto con `archivo:línea` y severidad alta |
| Reporte priorizado           | un repo con 50 hallazgos                                 | genera el reporte                      | los críticos aparecen primero y el resumen IA explica el porqué        |
| Vulnerabilidades             | un repo con una dependencia vulnerable conocida          | ejecuto la auditoría                   | aparece la vulnerabilidad con CVSS y versión afectada                  |
| Funciones sin tests          | un repo con 23 métodos sin cobertura                     | ejecuto la auditoría                   | el reporte indica "23 métodos sin tests" con nombres                   |
| Score reproducible           | el mismo repo auditado 2 veces (sin cambios)             | comparo scores                         | el score determinístico es idéntico                                    |
| Cambio de proveedor          | configuración apuntando a Anthropic                      | ejecuto la auditoría                   | las sugerencias usan Anthropic sin cambios de código                   |
| Proveedor free (DeepSeek/Kimi/NVIDIA) | `LLM_PROVIDER=deepseek` + clave            | ejecuto la auditoría                   | las sugerencias usan DeepSeek con el mismo contrato                    |
| Aislamiento de usuarios (F2) | dos usuarios, cada uno con un repo                       | usuario A consulta repos               | solo ve los suyos (403 en el del otro)                                 |

---

## 7. Fuera de alcance (explícito)

- Análisis de lenguajes más allá de .NET y TypeScript/JavaScript en el MVP.
- Fine-tuning de modelos propios.
- Ejecución de tests del repositorio auditado.
- Autofix automático del código (solo sugerencias).
- Multi-tenant / planes de pago (Fase 4 opcional).

---

## 8. Métricas del producto

| Métrica                          | Qué mide                                  | Umbral de éxito |
| -------------------------------- | ----------------------------------------- | --------------- |
| Tiempo a primer reporte          | Experiencia desde 0 hasta reporte         | ≤ 5 min         |
| % falsos positivos dead code     | Precisión determinística                  | ≤ 5 %           |
| % de sugerencias accionables     | Calidad percibida del LLM (auto-revisión) | ≥ 70 %          |
| Repos auditados en demo          | Uso real del portafolio                   | ≥ 10            |

---

## 9. Glosario

| Término         | Definición                                                     |
| --------------- | -------------------------------------------------------------- |
| **Hallazgo**    | Problema detectado por un analizador (severidad + ubicación). |
| **Dead code**   | Símbolo/archivo referenciable pero nunca usado en ejecución.  |
| **Health Score**| Índice 0-100 de salud del repositorio.                        |
| **Analyzer Engine** | Capa que orquesta analizadores determinísticos.            |
| **LLM Gateway** | Capa que abstrae proveedores de modelos de lenguaje.          |
| **Priorización**| Orden de hallazgos por `severity × likelihood`.               |

---

## 10. Historial del documento

| Versión | Fecha      | Cambios                              |
| ------- | ---------- | ------------------------------------ |
| v0.1    | 2026-08-05 | Primera versión completa (Entrega 1) |

---

[06-Folder-Structure]: 06-Folder-Structure.md
[19-Security]: 19-Security.md
