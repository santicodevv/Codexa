import isNumber from 'is-number'

export function classify(value) {
  return isNumber(value) ? 'number' : 'other'
}
