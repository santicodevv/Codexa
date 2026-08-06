# Prompts — Codexa AI Engine

> **Estado:** Borrador v0.1 · **Última actualización:** 2026-08-05
> **Documentos relacionados:** [10-AI-Engine](../10-AI-Engine.md) · [16-Testing-Strategy](../16-Testing-Strategy.md) · [21-Performance-Optimization](../21-Performance-Optimization.md)

---

## 1. Propósito

Estas plantillas son el **contrato de entrada** del pipeline de IA de Codexa
([10-AI-Engine §5](../10-AI-Engine.md)). Los LLM generan texto libre: si el prompt no es
explícito, la salida es inválida. Por eso cada plantilla define:

- Instrucciones del sistema (rol + reglas).
- Formato de entrada (contexto enriquecido).
- Formato de salida (JSON estricto, validado con `zod` en `packages/ai`).
- Reglas de rechazo (qué NO hacer).

Los prompts se versionan junto al código. La **versión del prompt** forma parte del hash de
cache en Redis ([21-Performance-Optimization §4](../21-Performance-Optimization.md)): si cambia
la plantilla, el cache se invalida.

---

## 2. Inventario de plantillas

| Archivo                          | Paso del pipeline          | Modelo  | Coste |
| -------------------------------- | -------------------------- | ------- | ----- |
| [`mini-filter.md`](mini-filter.md) | Clasificación/filtrado de findings | `Mini` | Bajo |
| [`system-suggest-refactor.md`](system-suggest-refactor.md) | Sugerencias de refactorización | `Pro` | Alto |
| [`system-audit-summary.md`](system-audit-summary.md) | Resumen ejecutivo del reporte | `Pro` | Alto |
| [`context-builder.md`](context-builder.md) | Construcción del contexto de entrada | —      | —     |

---

## 3. Cómo se usan

```typescript
// packages/ai/src/prompt/prompt-loader.ts
import { readFile } from 'node:fs/promises';
import { compile } from './template';

export async function loadPrompt(name: PromptName, vars: Record<string, string>) {
  const raw = await readFile(`../prompts/${name}.md`, 'utf8');
  return compile(raw, vars); // interpola {{var}} y elimina secretos
}
```

Reglas:

1. Los prompts se cargan como **recursos del paquete**, nunca por cadena en código.
2. `context-builder.md` describe cómo se arma el contexto **antes** de interpolar (sanitización
   primero, ver [10-AI-Engine §7](../10-AI-Engine.md)).
3. Toda salida se valida con `zod`; si falla, se reintenta una vez y luego se marca el reporte
   como `degraded` (ver [16-Testing-Strategy §7](../16-Testing-Strategy.md)).
4. Nunca incluir `ANTHROPIC_API_KEY` ni otras claves en los prompts (se interpolan en runtime).

---

## 4. Cambios en un prompt

1. Editar la plantilla + ejemplo golden ([16-Testing-Strategy §4](../16-Testing-Strategy.md)).
2. Bump de `PROMPT_VERSION` en `packages/ai` (parte del hash de cache).
3. Regenerar los golden outputs con el modelo real (solo en un pipeline manual, nunca en CI).
4. Registrar el cambio en [23-Changelog](../23-Changelog.md).

---

## 5. Historial del documento

| Versión | Fecha      | Cambios                              |
| ------- | ---------- | ------------------------------------ |
| v0.1    | 2026-08-05 | Primera versión completa (Entrega 5). |
