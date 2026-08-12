export function add(a: number, b: number): number {
  return a + b
}

export function subtract(a: number, b: number): number {
  return a - b
}

export function multiply(a: number, b: number): number {
  return a * b
}

const internalFactor = 2

export function doEverything(input: number): number {
  let value = input
  if (value > 0) {
    value += 1
  }
  if (value > 2) {
    value *= 2
  }
  if (value > 4) {
    value -= 3
  }
  if (value > 8) {
    value = value / 2
  }
  if (value > 16) {
    value += 5
  }
  if (value > 32) {
    value = value * 3
  }
  if (value > 64) {
    value -= 7
  }
  if (value > 128) {
    value += 11
  }
  if (value > 256) {
    value = value / 4
  }
  return value * internalFactor
}
