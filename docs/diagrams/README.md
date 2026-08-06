# Diagrams — Codexa

> **Estado:** Borrador v0.1 · **Última actualización:** 2026-08-05
> **Documentos relacionados:** [README](../../README.md) · [00-Project-Overview](../00-Project-Overview.md) · [03-System-Architecture](../03-System-Architecture.md)

---

## 1. Propósito

Los diagramas **viven dentro de los documentos** (bloques ` ```mermaid `) — esa es la única
fuente de verdad. Esta carpeta solo agrupa:

1. **El índice** de diagramas por documento.
2. **El script de exportación** que los extrae y renderiza a PNG/SVG.
3. **Los archivos exportados** en `out/` (generados, no editados a mano).

Así no hay duplicación: si cambia un diagrama en el doc, se regenera la imagen con el script.

---

## 2. Exportar diagramas

Requisito: [mermaid-cli](https://github.com/mermaid-js/mermaid-cli) (`mmdc`), Node.js 20.

```powershell
npm i -g @mermaid-js/mermaid-cli
./export-diagrams.ps1              # renderiza todos los diagramas a PNG (2x)
./export-diagrams.ps1 -Format svg  # renderiza a SVG
./export-diagrams.ps1 -Doc 03      # solo el documento 03
./export-diagrams.ps1 -PngOut out  # directorio de salida (default: out/)
```

Salida: `out/03-01-system-architecture.png` (formato `<doc>-<n>-<título>.png`).

---

## 3. Índice de diagramas

| # | Doc | Línea | Diagrama |
| - | --- | ----- | -------- |
| 00 | 00-Project-Overview | 50  | Flujo de producto (usuario → auditoría) |
| 00 | 00-Project-Overview | 141 | Arquitectura de alto nivel (API, análisis, IA) |
| 01 | 01-Roadmap | 23  | Fases del roadmap |
| 01 | 01-Roadmap | 198 | Estado de fases |
| 01 | 01-Roadmap | 218 | Iteración de feedback |
| 03 | 03-System-Architecture | 25  | C4 contexto |
| 03 | 03-System-Architecture | 45  | C4 contenedores |
| 03 | 03-System-Architecture | 86  | Componentes de la API |
| 03 | 03-System-Architecture | 174 | Secuencia de auditoría |
| 03 | 03-System-Architecture | 210 | Despliegue |
| 03 | 03-System-Architecture | 284 | Flujo de decisiones ADR |
| 04 | 04-Technology-Stack | 111 | Capas de tecnología |
| 07 | 07-Database-Design | 13  | Modelo de datos (ERD) |
| 07 | 07-Database-Design | 36  | Agregado de auditoría |
| 07 | 07-Database-Design | 203 | Secuencia de transacción |
| 08 | 08-Backend-Architecture | 24  | Mapa de dependencias |
| 09 | 09-Frontend-Architecture | 14  | Arquitectura frontend |
| 10 | 10-AI-Engine | 28  | Pipeline de IA |
| 11 | 11-Code-Analyzer | 70  | Pipeline de análisis |
| 12 | 12-Authentication-and-Authorization | 14  | Flujo de login/refresh |
| 12 | 12-Authentication-and-Authorization | 26  | Rotación de refresh |
| 13 | 13-GitHub-Integration | 14  | Integración con GitHub |
| 13 | 13-GitHub-Integration | 153 | Auditoría en PR |
| 15 | 15-UI-UX-Design | 23  | Flujo de usuario |
| 15 | 15-UI-UX-Design | 49  | Sitemap de la UI |
| 16 | 16-Testing-Strategy | 24  | Pirámide de tests |
| 17 | 17-Deployment | 29  | Topología de despliegue |
| 20 | 20-Repository-Safety | 36  | Arquitectura del sandbox |
| prom | prompts/context-builder | 30  | Pipeline de contexto |

> Las líneas son aproximadas; el script extrae por posición real de cada bloque ` ```mermaid `.

---

## 4. Convención de nombres

- `out/<doc>-<índice>-<slug>.png` donde `<slug>` es el título del diagrama en kebab-case.
- Imágenes para el portfolio: exportar a `2x` (default) para pantallas retina.
- Los PNG/SVG exportados **pueden** versionarse si se usan en el README o en presentaciones;
  si no, se regeneran bajo demanda.

---

## 5. Historial del documento

| Versión | Fecha      | Cambios                              |
| ------- | ---------- | ------------------------------------ |
| v0.1    | 2026-08-05 | Primera versión completa (Entrega 5). |
