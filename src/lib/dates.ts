import type { DateStr, DayOfMonth, MonthKey } from '../types'

const pad = (n: number) => String(n).padStart(2, '0')

export function toDateStr(d: Date): DateStr {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function today(): DateStr {
  return toDateStr(new Date())
}

export function currentMonth(): MonthKey {
  return monthOf(today())
}

export function monthOf(date: DateStr): MonthKey {
  return date.slice(0, 7)
}

export function parseMonth(month: MonthKey): { year: number; month: number } {
  const [y, m] = month.split('-').map(Number)
  return { year: y ?? 1970, month: m ?? 1 }
}

export function addMonths(month: MonthKey, delta: number): MonthKey {
  const { year, month: m } = parseMonth(month)
  const index = year * 12 + (m - 1) + delta
  return `${Math.floor(index / 12)}-${pad((index % 12) + 1)}`
}

/** Lista de meses desde `from` hasta `to`, inclusive. */
export function monthRange(from: MonthKey, to: MonthKey): MonthKey[] {
  const out: MonthKey[] = []
  for (let m = from; m <= to; m = addMonths(m, 1)) out.push(m)
  return out
}

export function daysInMonth(month: MonthKey): number {
  const { year, month: m } = parseMonth(month)
  return new Date(year, m, 0).getDate()
}

/** Ajusta un día (p. ej. 31 = fin de mes) al último día válido del mes. */
export function effectiveDay(month: MonthKey, day: DayOfMonth): number {
  return Math.min(Math.max(1, day), daysInMonth(month))
}

export function dateInMonth(month: MonthKey, day: DayOfMonth): DateStr {
  return `${month}-${pad(effectiveDay(month, day))}`
}

export function isEndOfMonth(day: DayOfMonth): boolean {
  return day >= 31
}

export function dayLabel(day: DayOfMonth): string {
  return isEndOfMonth(day) ? 'Fin de mes' : `Día ${day}`
}

/** Fecha sugerida para registrar algo en `month`: hoy si es el mes actual. */
export function defaultDateFor(month: MonthKey): DateStr {
  const t = today()
  if (monthOf(t) === month) return t
  return dateInMonth(month, Number(t.slice(8, 10)))
}

/** Días entre dos fechas (b - a). */
export function daysBetween(a: DateStr, b: DateStr): number {
  const [ay, am, ad] = a.split('-').map(Number)
  const [by, bm, bd] = b.split('-').map(Number)
  const ta = Date.UTC(ay ?? 0, (am ?? 1) - 1, ad ?? 1)
  const tb = Date.UTC(by ?? 0, (bm ?? 1) - 1, bd ?? 1)
  return Math.round((tb - ta) / 86_400_000)
}

const monthNames = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]
const weekdays = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** "Octubre 2026" */
export function monthLabel(month: MonthKey): string {
  const { year, month: m } = parseMonth(month)
  return `${cap(monthNames[m - 1] ?? '')} ${year}`
}

/** "Oct" */
export function monthShort(month: MonthKey): string {
  const { month: m } = parseMonth(month)
  return cap((monthNames[m - 1] ?? '').slice(0, 3))
}

/** "Martes 21 de octubre" */
export function longDateLabel(date: DateStr): string {
  const [y, m, d] = date.split('-').map(Number)
  const js = new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1)
  return `${cap(weekdays[js.getDay()] ?? '')} ${d} de ${monthNames[(m ?? 1) - 1]}`
}

/** "21 oct" */
export function shortDateLabel(date: DateStr): string {
  const [, m, d] = date.split('-').map(Number)
  return `${d} ${(monthNames[(m ?? 1) - 1] ?? '').slice(0, 3)}`
}
