# 05 · Coding Standards — Codexa

> **Estado:** Borrador v0.1 · **Última actualización:** 2026-08-05
> **Documentos relacionados:** [00-Project-Overview](00-Project-Overview.md) · [04-Technology-Stack](04-Technology-Stack.md) · [16-Testing-Strategy] · [22-Contributing]

---

## 1. Propósito y alcance

Este documento define cómo se escribe, formatea, organiza y revisa el código de Codexa. Su objetivo
es que cualquier colaborador (humano o agente IA) produzca código consistente, testable y legible.

**Aplica a:**

- Código TypeScript — backend NestJS, CLI y paquetes compartidos.
- Código TypeScript/React — frontend.
- Archivos de configuración, scripts y documentación.

**No cubre** (ver documentos dedicados): estrategia de tests
([16-Testing-Strategy]) ni proceso de contribución ([22-Contributing]).

---

## 2. Estándares generales (todo el código)

1. **TypeScript estricto.** `strict: true` y `tsc --noEmit` pasan en CI.
2. **Prohibido `any`.** Usar `unknown` + type narrowing, o tipos explícitos.
3. **No dejar código comentado.** Usa control de versiones; el comentario muerto se elimina.
4. **Nombres descriptivos > comentarios.** Preferir código que se autoexplica.
5. **Pequeñas unidades de trabajo.** Funciones cortas, una responsabilidad por unidad.
6. **Comandos idempotentes:** los analizadores y el CLI deben producir el mismo resultado ante la
   misma entrada (ver RB-06 en [02-Product-Requirements](02-Product-Requirements.md)).
7. **Sin secretos en código.** Todo secreto va en `.env` o en el secret store.
8. **Async correcto.** Nada de promesas sin manejar; siempre `await` o retorno explícito.

---

## 3. Backend — TypeScript / NestJS

### 3.1 Organización

- Sigue la estructura de módulos de NestJS (ver [08-Backend-Architecture](08-Backend-Architecture.md)):
  cada feature es un módulo con `controller`, `service`, `commands/queries` y `dtos`.
- Un archivo por tipo; el nombre del archivo coincide con el símbolo exportado.
- Rutas de imports con alias `@api/*`, `@packages/*` (paths de `tsconfig`), nunca `../../../`.

### 3.2 Naming conventions

| Elemento                       | Convención                            | Ejemplo                     |
| ------------------------------ | ------------------------------------- | --------------------------- |
| Clases, interfaces, enums      | `PascalCase`                          | `AuditOrchestrator`         |
| Interfaces (contratos públicos) | `I` + `PascalCase` (opcional)        | `IAnalyzer`                 |
| Funciones, variables, propiedades | `camelCase`                       | `calculateHealthScore()`    |
| Constantes (top-level)         | `SCREAMING_SNAKE_CASE`               | `MAX_TOKEN_BUDGET`          |
| Archivos de módulos Nest       | `nombre.tipo.ts` (`.controller`, `.service`, `.module`) | `audits.controller.ts` |
| DTOs / zod schemas             | `XxxDto` / `XxxSchema`               | `CreateRepositoryDto`       |
| Enums de dominio               | `PascalCase`                          | `FindingSeverity`           |
| Directorios                    | `kebab-case`                          | `feature/audits/`           |

### 3.3 Formato y estilo

- **Sin puntos y coma** requeridos: Prettier con `semi: false` (consistente con la base config).
- Indentación: 2 espacios (Prettier + ESLint).
- `printWidth: 100` (Prettier).
- Strings: comillas simples; backticks solo para template literals.
- Archivos terminan en salto de línea.

> La fuente de verdad es la config de Prettier del repo. `npm run format` debe pasar en CI.

### 3.4 Tipado y diseño de tipos

- `strict: true`, `noUncheckedIndexedAccess: true`.
- Preferir `interface` para formas de objetos/API y `type` para uniones/alias.
- DTOs de entrada/salida tipados (class-validator o zod); nunca `any` en la frontera de la API.
- Tipos de base de datos generados por Prisma (`@prisma/client`) se reutilizan, no se duplican.

### 3.5 Manejo de errores

- Flujos esperados (validación, 404, proveedor caído): usar `Result<T>` de `@codexa/contracts`
  o excepciones Nest (`NotFoundException`, `ConflictException`, etc.) con `code` en el payload.
- Las excepciones se lanzan con `HttpException`/`ServiceException` tipada; se traducen a
  `ProblemDetails` por el `ExceptionFilter` global.
- `ValidationPipe` global de NestJS con `whitelist: true` y `forbidNonWhitelisted: true`.

### 3.6 DI y ciclos de vida (NestJS)

- Inyección por constructor; clases marcadas `@Injectable()`.
- Scopes: default (singleton) para servicios stateless; `REQUEST` solo cuando se requiere el
  usuario actual (`ICurrentUser`).
- No capturar `INestApplicationContext` fuera del bootstrap salvo en `main.ts`.

### 3.7 Async y concurrencia

- `async/await` de extremo a extremo; nunca callback-style para lógica de negocio.
- Trabajo en paralelo con `Promise.all`/`Promise.allSettled` cuando no hay dependencia (analizadores).
- Timeouts en toda llamada a I/O externa (LLM, GitHub, procesos `dotnet`) — ver
  [10-AI-Engine](10-AI-Engine.md).

### 3.8 Lint y análisis estático

- `@typescript-eslint/recommended` + reglas extra del repo.
- `no-explicit-any`, `no-unused-vars`, `consistent-type-imports` activas.
- `eslint-plugin-import` para detectar imports fuera de la frontera de un feature.

---

## 4. Frontend — TypeScript / React

### 4.1 Organización

- Componentes en `src/features/<feature>/` con sus tests junto a ellos (`Component.test.tsx`).
- Hooks propios en `src/hooks/`; tipos de API en `src/types/` (ver [09-Frontend-Architecture](09-Frontend-Architecture.md)).
- Un componente = un archivo; componentes presentacionales separados de los de datos (containers).

### 4.2 Naming conventions

| Elemento                 | Convención                 | Ejemplo                  |
| ------------------------ | -------------------------- | ------------------------ |
| Componentes y tipos      | `PascalCase`               | `AuditReportCard`        |
| Funciones, variables, props | `camelCase`             | `handleExport`           |
| Constantes                 | `SCREAMING_SNAKE_CASE`    | `MAX_PAGE_SIZE`          |
| Archivos de componentes    | `PascalCase.tsx`          | `AuditReportCard.tsx`    |
| Archivos helpers/modules    | `camelCase.ts`            | `formatScore.ts`         |

### 4.3 Tipado (TypeScript)

- `strict: true`; `noUncheckedIndexedAccess: true`.
- **Prohibido `any`**. Usar `unknown` + narrow, o tipos explícitos.
- Tipos de la API importados desde `@codexa/contracts` o generados del OpenAPI de NestJS.
- Preferir `interface` para formas de objetos/API y `type` para uniones/alias.

### 4.4 React y hooks

- Componentes funcionales con hooks. **Sin** class components.
- Seguir Rules of Hooks: hooks solo en top-level y dentro de componentes/hooks.
- Fetch vía **TanStack Query** (no en `useEffect` a mano); mutaciones con `useMutation`.
- Estado de UI local con `useState`; global (sesión, filtros) con Zustand.
- Props mínimas: pasar primitivos y callbacks; evitar objetos grandes que rompen memo.

### 4.5 Estilos

- Tailwind CSS con clases utilitarias; **no** CSS suelto salvo animaciones/temas complejos.
- Paleta y tipografía centralizadas en `tailwind.config.*` (tokens de `get_variables` del diseño).
- Preferir `gap` sobre margenes para espaciado entre elementos de layout.

### 4.6 Accesibilidad mínima (WCAG 2.1 AA)

- Elementos interactivos con `aria-label` cuando no hay texto visible.
- Contraste del texto según paleta de tokens.
- Navegación por teclado funcional en modales, selects y tablas.

### 4.7 Estado del servidor vs estado local

| Tipo de estado      | Herramienta        | Ejemplo                        |
| ------------------- | ------------------ | ------------------------------ |
| Datos del servidor  | TanStack Query     | Lista de auditorías de un repo |
| UI local            | `useState`         | Selector de severidad activa   |
| UI global           | Zustand            | Usuario autenticado, tema      |

---

## 5. Git workflow

### 5.1 Flujo de trabajo

- **Trunk-based con ramas de feature cortas.** `main` siempre verde.
- Rama por unidad de trabajo: `feat/<id>-<slug>`, `fix/<id>-<slug>`, `docs/<slug>`, `chore/<slug>`.
- PR de ≤ 400 líneas de diff cuando sea posible; si es mayor, dividir.

### 5.2 Conventional Commits

Formato: `<tipo>(<ámbito>): <descripción>`

| Tipo    | Uso                                            |
| ------- | ---------------------------------------------- |
| `feat`  | Nueva funcionalidad                            |
| `fix`   | Corrección de bug                              |
| `docs`  | Documentación                                  |
| `refactor` | Cambio de estructura sin cambio de comportamiento |
| `test`  | Añadir/ajustar tests                           |
| `chore` | Mantenimiento (deps, CI, config)               |
| `perf`  | Mejora de rendimiento                          |

Ejemplos:

```
feat(analyzer): detectar complejidad ciclomática
fix(gateway): timeout en proveedor Anthropic
docs(coding-standards): añadir convención de módulos NestJS
```

### 5.3 Mensajes de commit

- Descripción en **imperativo, minúsculas, ≤ 72 caracteres**.
- Cuerpo opcional explicando el *por qué* (no el qué).
- Referenciar issue/PR cuando exista.

### 5.4 Reglas de PR

- Rebase sobre `main` antes de merge (o squash-merge).
- Requerido: CI verde + al menos un reviewer + tests para cambios de lógica.
- Plantilla de PR con checklist (ver sección 9).

---

## 6. Estándares de testing

- Estrategia completa en [16-Testing-Strategy]; aquí van las convenciones de código.

### 6.1 Backend (Jest)

- Patrón **AAA** (Arrange, Act, Assert) con una sección explícita cada una.
- Naming: `given_when_then` — `givenRepoWithDeadCode_whenAuditRuns_thenReportsFinding`.
- Fakes con `jest.fn()`/`@nestjs/testing`; fixtures reales para los analizadores (no mocks gigantes).
- Tests de integración con PostgreSQL real vía Testcontainers (o Prisma contra Postgres local).

```ts
describe('AuditOrchestrator', () => {
  it('given repo with dead code, when audit runs, then reports finding', async () => {
    // Arrange
    const orchestrator = await buildOrchestratorWithFixture('ts-deadcode');
    // Act
    const report = await orchestrator.run(fixture.path);
    // Assert
    expect(report.findings).toContainEqual(
      expect.objectContaining({ ruleId: 'CD-001' }),
    );
  });
});
```

### 6.2 Frontend (Vitest + RTL)

- Tests de comportamiento: render → interactuar → verificar en el DOM.
- `screen.getByRole(...)` preferido sobre clases/`data-testid` cuando sea posible.
- Nombrar archivos `*.test.tsx` junto al componente.

### 6.3 Cobertura mínima

| Área                | Mínimo   |
| ------------------- | -------- |
| Analyzer Engine     | 70 %     |
| LLM Gateway         | 80 %     |
| Application (CQRS)  | 70 %     |
| Frontend (funcionalidad crítica) | 60 % |

---

## 7. Documentación

- Cada feature nueva actualiza la documentación afectada en `docs/`.
- **Comentarios de código:** solo para explicar *por qué* no evidente. No duplicar lo que el código
  dice. Sin "documentación de autoayuda" (`// suma dos números`).
- Los DTOs/contratos expuestos se documentan en [14-API-Documentation].
- El idioma de la documentación es español; el código y los identificadores en inglés.

---

## 8. Herramientas de calidad (resumen)

| Herramienta      | Comando                  | Cuándo se ejecuta         |
| ---------------- | ------------------------ | ------------------------- |
| Type check       | `npx tsc --noEmit`       | CI                        |
| ESLint           | `npm run lint`           | Pre-commit + CI           |
| Prettier         | `npm run format`         | Pre-commit                |
| Tests backend    | `npm test`               | CI                        |
| Tests frontend   | `npm test --workspace frontend` | CI                   |
| Prisma validate  | `npx prisma validate`    | CI                        |

---

## 9. Checklist de code review

Para **todo** PR (usar la plantilla de `.github/PULL_REQUEST_TEMPLATE.md`):

- [ ] El PR resuelve un problema concreto y su título sigue Conventional Commits.
- [ ] CI verde (type check, lint, tests, cobertura mínima).
- [ ] Sin `any`, sin código comentado, sin secretos.
- [ ] Errores tipados (Result/excepciones Nest) en lugar de errores silenciosos.
- [ ] Nombres y estructura siguen este documento.
- [ ] Tests que cubren la lógica nueva y el caso de error.
- [ ] Documentación afectada actualizada.
- [ ] No hay cambios de alcance no relacionados (scope creep).

---

## 10. Definition of Done (DoD)

Una historia/feature está **Lista** cuando:

1. Código implementado y en `main` vía PR con reviewer.
2. CI verde y cobertura mínima cumplida.
3. Tests unitarios (y de integración si aplica) aprobados.
4. Cumple los requerimientos y criterios de aceptación de
   [02-Product-Requirements](02-Product-Requirements.md).
5. Documentación y changelog actualizados.
6. Sin deuda introducida conscientemente sin ticket de seguimiento.

---

## 11. Checklist para agentes IA y contribuidores nuevos

Antes de escribir código, revisa en orden:

1. [ ] Leer [00-Project-Overview](00-Project-Overview.md) para contexto.
2. [ ] Respetar la estructura de carpetas ([08-Backend-Architecture](08-Backend-Architecture.md)/[09-Frontend-Architecture](09-Frontend-Architecture.md)).
3. [ ] Seguir los contratos ya definidos (`IAnalyzer`, `ILanguageModel`, DTOs en `@codexa/contracts`).
4. [ ] Aplicar naming y formato de este documento.
5. [ ] Escribir/ajustar tests en el mismo PR.
6. [ ] Verificar localmente: `npx tsc --noEmit`, `npm run lint`, `npm test`.

---

## 12. Historial del documento

| Versión | Fecha      | Cambios                              |
| ------- | ---------- | ------------------------------------ |
| v0.1    | 2026-08-05 | Primera versión completa (Entrega 1). |
| v0.2    | 2026-08-05 | Migración de C#/.NET a TypeScript/NestJS. |

---

[02-Product-Requirements]: 02-Product-Requirements.md
[08-Backend-Architecture]: 08-Backend-Architecture.md
[09-Frontend-Architecture]: 09-Frontend-Architecture.md
[14-API-Documentation]: 14-API-Documentation.md
[16-Testing-Strategy]: 16-Testing-Strategy.md
[22-Contributing]: 22-Contributing.md
