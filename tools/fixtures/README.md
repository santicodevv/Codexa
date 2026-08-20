# Fixtures de pruebas

Este directorio contiene **fixtures de test versionados y determinísticos** usados como base de los
specs de los analizadores de la Fase 1.

## Reglas

- **Se commitean**: NO van en `.gitignore`. Son datos de entrada estables para los specs.
- **Determinísticos**: su contenido está fijado y no debe variar entre ejecuciones.
- **No modificar sin actualizar los specs**: si cambias un fixture, debes actualizar los specs de los
  analizadores que dependen de sus expectativas (dead-code, complejidad ciclomática, funciones sin
  tests, reglas de ESLint, análisis de lockfiles).

## Fixtures

### `ts-basic/`

Proyecto TypeScript mínimo (strict, noEmit) pensado para el analizador de TypeScript:

- **Dead-code esperado**: `subtract` y `multiply` en `src/math.ts`, `unusedHelper` en `src/legacy.ts`,
  `unusedLocal` en `src/index.ts`.
- **Complejidad ciclomática**: `doEverything` tiene 11 puntos de decisión (10 ifs + base 1), supera el
  umbral 10.
- **Funciones sin tests**: no hay archivos `.spec` ni `.test`, así que se reportan todas las funciones
  exportadas.
- **ESLint**: `console.log` y `==` en `src/plain.js` violan el ruleset fijo del analizador.

### `js-esm/`

Proyecto JavaScript ESM mínimo (`"type": "module"`) para el analizador de JavaScript:

- **Dead-code esperado**: `unusedJs` en `src/helper.js` (exportada pero no importada).

### `npm-lock/`

Proyecto con una dependencia (`is-number`) cuyo `package-lock.json` se genera con
`npm install --package-lock-only` para el analizador de lockfiles de npm. Solo debe contener el
lockfile, sin `node_modules`.
