import { add, doEverything } from './math'
import { usedLegacy } from './legacy'

const unusedLocal = 42

export function run(input: number): number {
  return add(usedLegacy(), doEverything(input))
}
