import { describe, expect, it } from 'vitest'
import { createDefaultData } from '../store/defaults'
import type { AppData, Transaction } from '../types'
import { historyBounds, payPlan, summarizeMonth } from './calc'

const M = '2026-10'

function data(patch: Partial<AppData> = {}): AppData {
  return { ...createDefaultData(), ...patch, settings: { startMonth: M, theme: 'system', lastBackupAt: null } }
}

let seq = 0
function tx(amount: number, date: string, extra: Partial<Transaction> = {}): Transaction {
  return { id: `t${++seq}`, type: 'expense', amount, date, categoryId: 'gasolina', note: '', createdAt: seq, ...extra }
}

describe('summarizeMonth con la configuración inicial', () => {
  it('calcula lo libre después de los pagos fijos', () => {
    const s = summarizeMonth(data(), M)
    expect(s.incomeExpected).toBe(9000)
    expect(s.fixedTotal).toBe(4780.65)
    expect(s.freeAfterFixed).toBe(4219.35)
    expect(s.free).toBe(4219.35)
    expect(s.onHand).toBe(0)
  })

  it('resta gastos y suma ingresos extra', () => {
    const s = summarizeMonth(
      data({
        transactions: [
          tx(350, '2026-10-05'),
          tx(275.5, '2026-10-12', { categoryId: 'supermercado' }),
          tx(500, '2026-10-20', { type: 'income', categoryId: null }),
          tx(999, '2026-09-30'), // otro mes
        ],
      }),
      M,
    )
    expect(s.expensesTotal).toBe(625.5)
    expect(s.extraIncome).toBe(500)
    expect(s.free).toBe(4093.85) // 9000 + 500 − 4780.65 − 625.50
    expect(s.byCategory[0]).toMatchObject({ total: 350, count: 1 })
    expect(s.byCategory[0]?.category.id).toBe('gasolina')
  })

  it('indica cuánto guardar de la 1ª quincena para los pagos de fin de mes', () => {
    const d = data({
      incomeRecords: { [M]: { 'quincena-1': { amount: 4500, date: '2026-10-15' } } },
      transactions: [tx(600, '2026-10-16')],
    })
    const s = summarizeMonth(d, M)
    expect(s.onHand).toBe(3900)
    expect(s.reserve).toBe(280.65)
    expect(s.spendable).toBe(3619.35)
    expect(s.spendable).toBe(s.free)
  })

  it('al pagar los fijos y recibir todo, lo que se puede gastar es lo que hay en mano', () => {
    const d = data({
      incomeRecords: {
        [M]: {
          'quincena-1': { amount: 4500, date: '2026-10-15' },
          'quincena-2': { amount: 4500, date: '2026-10-31' },
        },
      },
      fixedRecords: {
        [M]: {
          apartamento: { amount: 2000, date: '2026-10-31' },
          carro: { amount: 2000, date: '2026-10-31' },
          prestamo: { amount: 660.65, date: '2026-10-31' },
          celular: { amount: 120, date: '2026-10-31' },
        },
      },
    })
    const s = summarizeMonth(d, M)
    expect(s.fixedPaid).toBe(4780.65)
    expect(s.fixedPending).toBe(0)
    expect(s.reserve).toBe(0)
    expect(s.onHand).toBe(4219.35)
    expect(s.spendable).toBe(4219.35)
  })

  it('usa el monto realmente pagado en el mes si fue distinto', () => {
    const d = data({ fixedRecords: { [M]: { celular: { amount: 150, date: '2026-10-28' } } } })
    const s = summarizeMonth(d, M)
    expect(s.fixedLines.find((l) => l.payment.id === 'celular')?.amount).toBe(150)
    expect(s.fixedTotal).toBe(4810.65)
  })

  it('respeta los meses de inicio y fin de cada pago fijo', () => {
    const base = data()
    base.fixedPayments.push({
      id: 'internet', name: 'Internet', amount: 250, icon: 'wifi', color: 'sky', dueDay: 10, startMonth: '2026-11', endMonth: null,
    })
    base.fixedPayments = base.fixedPayments.map((p) => (p.id === 'prestamo' ? { ...p, endMonth: '2026-10' } : p))
    expect(summarizeMonth(base, '2026-10').fixedTotal).toBe(4780.65)
    expect(summarizeMonth(base, '2026-11').fixedTotal).toBe(4370) // sin préstamo, con internet
  })
})

describe('payPlan', () => {
  it('detecta que la 2ª quincena no alcanza para los pagos de fin de mes', () => {
    const plan = payPlan(summarizeMonth(data(), M))
    expect(plan?.lastIncome.source.id).toBe('quincena-2')
    expect(plan?.fixedAfter).toBe(4780.65)
    expect(plan?.reserveFromEarlier).toBe(280.65)
    expect(plan?.leftoverFromLast).toBe(0)
  })

  it('solo cuenta los pagos que vencen el día de la última quincena o después', () => {
    const d = data()
    d.fixedPayments = d.fixedPayments.map((p) => (p.id === 'carro' ? { ...p, dueDay: 10 } : p))
    const plan = payPlan(summarizeMonth(d, M))
    expect(plan?.fixedAfter).toBe(2780.65)
    expect(plan?.leftoverFromLast).toBe(1719.35)
  })
})

describe('historyBounds', () => {
  it('incluye meses con movimientos anteriores al mes de inicio', () => {
    const d = data({ transactions: [tx(10, '2026-07-02')] })
    expect(historyBounds(d, '2026-10')).toEqual({ from: '2026-07', to: '2026-10' })
  })
})
