import { describe, expect, it } from 'vitest'
import { formatQ, parseAmount, sum } from './money'

describe('formatQ', () => {
  it('formatea en quetzales con dos decimales', () => {
    expect(formatQ(4780.65)).toBe('Q4,780.65')
    expect(formatQ(120)).toBe('Q120.00')
    expect(formatQ(-280.65)).toBe('-Q280.65')
  })
})

describe('parseAmount', () => {
  it.each([
    ['660.65', 660.65],
    ['2,000', 2000],
    ['2,000.00', 2000],
    ['Q 120', 120],
    ['Q.4500', 4500],
    ['12,5', 12.5],
    ['12,50', 12.5],
    ['1,234', 1234],
    ['  75 ', 75],
  ])('"%s" → %d', (input, expected) => {
    expect(parseAmount(input)).toBe(expected)
  })

  it.each(['', 'abc', '.', '1.2.3', '-5'])('rechaza "%s"', (input) => {
    expect(parseAmount(input)).toBeNull()
  })
})

describe('sum', () => {
  it('suma sin errores de punto flotante', () => {
    expect(sum([0.1, 0.2])).toBe(0.3)
    expect(sum([2000, 2000, 660.65, 120])).toBe(4780.65)
  })
})
