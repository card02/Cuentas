import { beforeEach, describe, expect, it } from 'vitest'
import { summarizeMonth } from '../lib/calc'
import { getData, useAppStore } from './useAppStore'

const store = () => useAppStore.getState()

beforeEach(() => {
  store().resetData()
})

describe('pagos fijos', () => {
  it('quitar un pago fijo conserva los meses anteriores', () => {
    store().setRecord('fixedRecords', '2026-09', 'prestamo', { amount: 660.65, date: '2026-09-30' })
    store().endRecurring('fixedPayments', 'prestamo', '2026-10')
    const data = getData()
    expect(data.fixedPayments.find((p) => p.id === 'prestamo')?.endMonth).toBe('2026-09')
    expect(summarizeMonth(data, '2026-09').fixedTotal).toBe(4780.65)
    expect(summarizeMonth(data, '2026-10').fixedTotal).toBe(4120)
  })

  it('un pago nuevo sin registros se elimina por completo', () => {
    store().saveFixedPayment({ name: 'Internet', amount: 250, icon: 'wifi', color: 'sky', dueDay: 10, startMonth: '2026-10', endMonth: null })
    const id = getData().fixedPayments.find((p) => p.name === 'Internet')!.id
    store().endRecurring('fixedPayments', id, '2026-10')
    expect(getData().fixedPayments.some((p) => p.id === id)).toBe(false)
  })

  it('un pago nuevo ya pagado este mes se conserva en ese mes', () => {
    store().saveFixedPayment({ name: 'Internet', amount: 250, icon: 'wifi', color: 'sky', dueDay: 10, startMonth: '2026-10', endMonth: null })
    const id = getData().fixedPayments.find((p) => p.name === 'Internet')!.id
    store().setRecord('fixedRecords', '2026-10', id, { amount: 250, date: '2026-10-10' })
    store().endRecurring('fixedPayments', id, '2026-10')
    const data = getData()
    expect(summarizeMonth(data, '2026-10').fixedTotal).toBe(5030.65)
    expect(summarizeMonth(data, '2026-11').fixedTotal).toBe(4780.65)
  })
})

describe('categorías', () => {
  it('al eliminar una categoría sus gastos pasan a "Otros"', () => {
    const t = store().addTransaction({ type: 'expense', amount: 90, date: '2026-10-02', categoryId: 'salud', note: '' })
    store().deleteCategory('salud', 'otros')
    expect(getData().categories.some((c) => c.id === 'salud')).toBe(false)
    expect(getData().transactions.find((x) => x.id === t.id)?.categoryId).toBe('otros')
  })

  it('"Otros" no se puede eliminar', () => {
    store().deleteCategory('otros', 'otros')
    expect(getData().categories.some((c) => c.id === 'otros')).toBe(true)
  })
})

describe('movimientos', () => {
  it('eliminar y deshacer restaura el movimiento', () => {
    const t = store().addTransaction({ type: 'expense', amount: 45.5, date: '2026-10-02', categoryId: 'comida', note: 'Café' })
    const removed = store().deleteTransaction(t.id)
    expect(getData().transactions).toHaveLength(0)
    store().restoreTransaction(removed!)
    expect(getData().transactions).toEqual([t])
  })
})
