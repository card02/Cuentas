const currency = new Intl.NumberFormat('es-GT', {
  style: 'currency',
  currency: 'GTQ',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const plain = new Intl.NumberFormat('es-GT', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const compact = new Intl.NumberFormat('es-GT', { maximumFractionDigits: 1 })

/** Redondea a centavos evitando errores de punto flotante. */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function sum(values: Iterable<number>): number {
  let cents = 0
  for (const v of values) cents += Math.round(v * 100)
  return cents / 100
}

/** Q4,780.65 */
export function formatQ(value: number): string {
  // Intl agrega un espacio entre el símbolo y el número; "Q4,780.65" es la forma habitual.
  return currency.format(round2(value)).replace(/\s/g, '')
}

/** 4,780.65 */
export function formatNumber(value: number): string {
  return plain.format(round2(value))
}

/** Q7.5K, para ejes de gráficas. */
export function formatCompactQ(value: number): string {
  return Math.abs(value) >= 1000 ? `Q${compact.format(value / 1000)}K` : `Q${compact.format(value)}`
}

/**
 * Convierte lo que escribe la persona en un monto. Acepta "1,234.50", "1234.5",
 * "Q 120" y también coma decimal ("12,50") cuando la coma va seguida de 1–2 dígitos.
 */
export function parseAmount(input: string): number | null {
  let s = input.trim().replace(/^q\.?/i, '').replace(/\s/g, '')
  if (!s) return null
  const lastComma = s.lastIndexOf(',')
  if (!s.includes('.') && lastComma !== -1 && /^\d{1,2}$/.test(s.slice(lastComma + 1))) {
    s = `${s.slice(0, lastComma).replace(/,/g, '')}.${s.slice(lastComma + 1)}`
  } else {
    s = s.replace(/,/g, '')
  }
  if (!/^\d*\.?\d*$/.test(s) || s === '.') return null
  const n = Number(s)
  return Number.isFinite(n) ? round2(n) : null
}
