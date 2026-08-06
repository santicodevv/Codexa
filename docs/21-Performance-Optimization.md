# 21 · Performance Optimization — Codexa

> **Estado:** Borrador v0.1 · **Última actualización:** 2026-08-05
> **Documentos relacionados:** [08-Backend-Architecture](08-Backend-Architecture.md) · [10-AI-Engine](10-AI-Engine.md) · [07-Database-Design](07-Database-Design.md) · [17-Deployment](17-Deployment.md)

---

## 1. Visión general

Los objetivos de rendimiento (NFR-13/14/15) se concentran en la **latencia percibida** de una
auditoría y la **estabilidad** del worker. La optimización se aplica en cuatro frentes:
análisis, IA, datos y frontend.

Principio rector: **medir antes de optimizar**. Cada optimización se valida con benchmarks sobre
fixtures reales.

---

## 2. Objetivos

| Métrica                              | Objetivo                        |
| ------------------------------------ | ------------------------------- |
| Auditoría repo pequeño (API)         | < 30 s de punta a punta         |
| Auditoría repo grande (worker)       | < 10 min (límite sandbox)       |
| Respuesta API p95                    | < 250 ms (excluye auditoría)    |
| Latencia LLM (sugerencias)           | < 15 s por lote                 |
| Tiempo de carga del dashboard        | < 2 s (p75)                     |

---

## 3. Optimización del análisis (`@codexa/analysis`)

- **Análisis en paralelo:** los analyzers se ejecutan de forma concurrente; el orquestador
  fusiona resultados (ver [11-Code-Analyzer](11-Code-Analyzer.md) §4).
- **Incremental / diff-aware:** en PRs solo se analiza el diff; en el MVP completo se cachea el
  AST de archivos sin cambios por hash.
- **Límites:** número máximo de archivos analizados con `ts-morph` para repos grandes (top-N por
  módulo); el resto se marca como no analizado en el reporte.
- `npm audit` y `dotnet` corren en paralelo con el análisis AST.

---

## 4. Optimización de IA (`@codexa/ai`)

- **Cache en Redis** por hash de findings + versión de prompts (NFR-13): evita pagar dos veces por
  el mismo análisis (ver [10-AI-Engine](10-AI-Engine.md) §6).
- **Racionalización de coste:** solo los findings `high`/`critical` llegan al modelo caro;
  el resto se clasifica con el modelo `Mini` en un solo lote.
- **Streaming** de respuestas LLM a la UI cuando el reporte se construye en vivo (Fase 2+).
- **Timeout por llamada** (ej. 30 s) con retry exponencial limitado.

```typescript
// ai/cache.ts
export async function cachedSuggestions(hash: string, build: () => Promise<AiSuggestion[]>) {
  const key = `llm:suggest:${hash}`;
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);
  const result = await build();
  await redis.set(key, JSON.stringify(result), { EX: 24 * 3600 });
  return result;
}
```

---

## 5. Optimización de datos

- **Índices:** cubrir las queries calientes del agregado de auditoría
  (ver [07-Database-Design](07-Database-Design.md) §7): `Audit(ownerId, startedAt)`,
  `Finding(auditId)`, `RefreshToken(familyId)`.
- **Paginación:** historial con `skip/take` limitado a 100 por página; evitar `count(*)` en
  listas grandes (caché de conteo).
- **jsonb** para metadatos flexibles sin columnas dispersas.
- **Connection pooling:** Prisma con pool acotado (config `DATABASE_URL` + `connection_limit`),
  sin abrir conexión por request.

---

## 6. Optimización del frontend

- **TanStack Query:** caché por clave + `staleTime` en reportes; refetch solo en estado activo.
- **Virtualización** de listas largas (findings > 500) con `@tanstack/react-virtual`.
- **Code splitting** por ruta (React Router lazy) y carga diferida del chart de tendencias.
- **Assets:** Tailwind purge, imágenes optimizadas, prefetch del reporte al hover.

---

## 7. Escalabilidad del worker

| Escenario                 | Estrategia                                      |
| ------------------------- | ----------------------------------------------- |
| Muchas auditorías          | Colas BullMQ + concurrencia por worker (configurable). |
| Repos grandes             | Escalar workers horizontalmente (misma cola Redis). |
| LLM rate limited          | Backoff en BullMQ (`attempts` + `backoff`).     |
| Pico de registros         | Rate limit en login/registro + cola de envío SMTP. |

---

## 8. Benchmarking y monitoring

- Benchmarks de `@codexa/analysis` con fixtures de repos (1k / 10k / 100k archivos).
- Métricas en producción (ver [17-Deployment](17-Deployment.md) §7): p95 API, duración de jobs,
  tasa de cache hit LLM, latencia LLM por modelo.
- Alertas: jobs > límite de sandbox, p95 API > 500 ms sostenido.

---

## 9. Checklist de implementación

- [ ] Analizadores en paralelo con límites por tamaño de repo.
- [ ] Cache LLM por hash de findings + cache de conteos.
- [ ] Índices del agregado de auditoría (ver [07-Database-Design]).
- [ ] Pool de Prisma acotado y paginación.
- [ ] Virtualización de findings y code splitting en frontend.
- [ ] Backoff de BullMQ ante rate limit del proveedor.
- [ ] Benchmarks de análisis en CI (fixtures).

---

## 10. Historial del documento

| Versión | Fecha      | Cambios                              |
| ------- | ---------- | ------------------------------------ |
| v0.1    | 2026-08-05 | Primera versión completa (Entrega 4). |

---

[07-Database-Design]: 07-Database-Design.md
