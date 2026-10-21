import { describe, expect, it } from 'vitest'
import { addMonths, dateInMonth, daysBetween, effectiveDay, monthLabel, monthRange } from './dates'

describe('fechas', () => {
  it('suma y resta meses cruzando años', () => {
    expect(addMonths('2026-12', 1)).toBe('2027-01')
    expect(addMonths('2026-01', -1)).toBe('2025-12')
    expect(addMonths('2026-10', -12)).toBe('2025-10')
  })

  it('ajusta "fin de mes" al último día real', () => {
    expect(effectiveDay('2026-02', 31)).toBe(28)
    expect(effectiveDay('2028-02', 31)).toBe(29)
    expect(dateInMonth('2026-04', 31)).toBe('2026-04-30')
    expect(dateInMonth('2026-10', 15)).toBe('2026-10-15')
  })

  it('genera rangos de meses', () => {
    expect(monthRange('2026-11', '2027-02')).toEqual(['2026-11', '2026-12', '2027-01', '2027-02'])
  })

  it('cuenta días entre fechas', () => {
    expect(daysBetween('2026-10-21', '2026-10-31')).toBe(10)
    expect(daysBetween('2026-10-31', '2026-10-21')).toBe(-10)
  })

  it('muestra el mes en español', () => {
    expect(monthLabel('2026-10')).toBe('Octubre 2026')
  })
})
