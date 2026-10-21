import type {
  AppData,
  Category,
  FixedPayment,
  IncomeSource,
  MonthKey,
  MonthRecord,
  Transaction,
} from '../types'
import { addMonths, effectiveDay, monthOf } from './dates'
import { round2, sum } from './money'

export function appliesTo(item: { startMonth: MonthKey | null; endMonth: MonthKey | null }, month: MonthKey): boolean {
  return (item.startMonth === null || item.startMonth <= month) && (item.endMonth === null || month <= item.endMonth)
}

export interface FixedLine {
  payment: FixedPayment
  /** Monto pagado si ya se registró; si no, el monto configurado. */
  amount: number
  record: MonthRecord | null
  dueDay: number
}

export interface IncomeLine {
  source: IncomeSource
  amount: number
  record: MonthRecord | null
  payDay: number
}

export interface CategoryTotal {
  category: Category
  total: number
  count: number
}

export interface MonthSummary {
  month: MonthKey
  incomeLines: IncomeLine[]
  fixedLines: FixedLine[]
  transactions: Transaction[]
  /** Ingresos recurrentes esperados (quincenas). */
  incomeExpected: number
  /** Ingresos recurrentes ya marcados como recibidos. */
  incomeReceived: number
  /** Ingresos extra registrados como movimientos. */
  extraIncome: number
  /** Todo lo que entra en el mes (esperado + extra). */
  incomeTotal: number
  fixedTotal: number
  fixedPaid: number
  fixedPending: number
  expensesTotal: number
  byCategory: CategoryTotal[]
  /** Lo que queda libre a fin de mes después de pagos fijos y gastos. */
  free: number
  /** Ingreso menos pagos fijos, sin contar gastos variables. */
  freeAfterFixed: number
  /** Dinero recibido que aún no se ha ido en pagos ni gastos. */
  onHand: number
  /** Parte del dinero en mano que hay que guardar para los pagos fijos pendientes. */
  reserve: number
  /** Lo que se puede gastar hoy sin comprometer los pagos fijos (puede ser negativo). */
  spendable: number
}

export function transactionsOf(data: Pick<AppData, 'transactions'>, month: MonthKey): Transaction[] {
  return data.transactions
    .filter((t) => monthOf(t.date) === month)
    .sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : a.date < b.date ? 1 : -1))
}

export function summarizeMonth(data: AppData, month: MonthKey): MonthSummary {
  const fixedRecords = data.fixedRecords[month] ?? {}
  const incomeRecords = data.incomeRecords[month] ?? {}

  const fixedLines: FixedLine[] = data.fixedPayments
    .filter((p) => appliesTo(p, month) || fixedRecords[p.id])
    .map((payment) => {
      const record = fixedRecords[payment.id] ?? null
      return { payment, record, amount: record?.amount ?? payment.amount, dueDay: effectiveDay(month, payment.dueDay) }
    })
    .sort((a, b) => a.dueDay - b.dueDay)

  const incomeLines: IncomeLine[] = data.incomeSources
    .filter((s) => appliesTo(s, month) || incomeRecords[s.id])
    .map((source) => {
      const record = incomeRecords[source.id] ?? null
      return { source, record, amount: record?.amount ?? source.amount, payDay: effectiveDay(month, source.payDay) }
    })
    .sort((a, b) => a.payDay - b.payDay)

  const transactions = transactionsOf(data, month)
  const expenses = transactions.filter((t) => t.type === 'expense')

  const incomeExpected = sum(incomeLines.map((l) => l.amount))
  const incomeReceived = sum(incomeLines.filter((l) => l.record).map((l) => l.amount))
  const extraIncome = sum(transactions.filter((t) => t.type === 'income').map((t) => t.amount))
  const fixedTotal = sum(fixedLines.map((l) => l.amount))
  const fixedPaid = sum(fixedLines.filter((l) => l.record).map((l) => l.amount))
  const expensesTotal = sum(expenses.map((t) => t.amount))

  const totals = new Map<string, { total: number; count: number }>()
  for (const t of expenses) {
    const key = t.categoryId ?? ''
    const cur = totals.get(key) ?? { total: 0, count: 0 }
    totals.set(key, { total: round2(cur.total + t.amount), count: cur.count + 1 })
  }
  const byCategory: CategoryTotal[] = data.categories
    .map((category) => ({ category, ...(totals.get(category.id) ?? { total: 0, count: 0 }) }))
    .sort((a, b) => b.total - a.total)

  const incomeTotal = round2(incomeExpected + extraIncome)
  const free = round2(incomeTotal - fixedTotal - expensesTotal)
  const onHand = round2(incomeReceived + extraIncome - fixedPaid - expensesTotal)
  const fixedPending = round2(fixedTotal - fixedPaid)
  const incomePending = round2(incomeExpected - incomeReceived)
  const reserve = Math.max(0, round2(fixedPending - incomePending))

  return {
    month,
    incomeLines,
    fixedLines,
    transactions,
    incomeExpected,
    incomeReceived,
    extraIncome,
    incomeTotal,
    fixedTotal,
    fixedPaid,
    fixedPending,
    expensesTotal,
    byCategory,
    free,
    freeAfterFixed: round2(incomeTotal - fixedTotal),
    onHand,
    reserve,
    spendable: Math.min(onHand, free),
  }
}

export interface PayPlan {
  lastIncome: IncomeLine
  /** Pagos fijos que vencen el día de la última quincena o después. */
  fixedAfter: number
  /** Cuánto guardar de las quincenas anteriores para completar esos pagos (0 si alcanza). */
  reserveFromEarlier: number
  /** Lo que sobra de la última quincena después de esos pagos (0 si no alcanza). */
  leftoverFromLast: number
}

/**
 * Plan quincenal: si los pagos fijos se hacen a fin de mes con la última quincena,
 * ¿alcanza o hay que guardar algo de la quincena anterior?
 */
export function payPlan(summary: MonthSummary): PayPlan | null {
  if (summary.incomeLines.length < 2 || summary.fixedLines.length === 0) return null
  const lastIncome = summary.incomeLines[summary.incomeLines.length - 1]
  if (!lastIncome) return null
  const fixedAfter = sum(summary.fixedLines.filter((l) => l.dueDay >= lastIncome.payDay).map((l) => l.amount))
  if (fixedAfter === 0) return null
  return {
    lastIncome,
    fixedAfter,
    reserveFromEarlier: Math.max(0, round2(fixedAfter - lastIncome.amount)),
    leftoverFromLast: Math.max(0, round2(lastIncome.amount - fixedAfter)),
  }
}

/** Primer y último mes con información para el historial. */
export function historyBounds(data: AppData, upTo: MonthKey): { from: MonthKey; to: MonthKey } {
  let from = data.settings.startMonth
  let to = upTo
  const months = [
    ...data.transactions.map((t) => monthOf(t.date)),
    ...Object.keys(data.fixedRecords),
    ...Object.keys(data.incomeRecords),
  ]
  for (const m of months) {
    if (m < from) from = m
    if (m > to) to = m
  }
  // Nunca más de 10 años hacia atrás por si hay una fecha mal escrita.
  const floor = addMonths(to, -119)
  return { from: from < floor ? floor : from, to }
}
