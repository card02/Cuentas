import { describe, expect, it } from 'vitest'
import { createDefaultData } from '../store/defaults'
import { BackupError, createBackup, parseBackup, toCsv } from './backup'

describe('respaldos', () => {
  it('un respaldo exportado se puede restaurar igual', () => {
    const data = createDefaultData()
    data.transactions.push({
      id: 'a', type: 'expense', amount: 125.5, date: '2026-10-03', categoryId: 'gasolina', note: 'Shell', createdAt: 1,
    })
    data.fixedRecords['2026-10'] = { carro: { amount: 2000, date: '2026-10-31' } }
    const restored = parseBackup(JSON.stringify(createBackup(data)))
    expect(restored).toEqual(data)
  })

  it('mueve gastos con categoría desconocida a "Otros"', () => {
    const data = createDefaultData()
    data.transactions.push({ id: 'a', type: 'expense', amount: 5, date: '2026-10-03', categoryId: 'no-existe', note: '', createdAt: 1 })
    expect(parseBackup(JSON.stringify(data)).transactions[0]?.categoryId).toBe('otros')
  })

  it('rechaza archivos que no son respaldos', () => {
    expect(() => parseBackup('hola')).toThrow(BackupError)
    expect(() => parseBackup('{"foo":1}')).toThrow(BackupError)
    const bad = createDefaultData()
    bad.transactions.push({ id: 'a', type: 'expense', amount: -5, date: '2026-10-03', categoryId: 'otros', note: '', createdAt: 1 })
    expect(() => parseBackup(JSON.stringify(bad))).toThrow(/monto/)
  })

  it('exporta CSV con gastos negativos y comillas escapadas', () => {
    const data = createDefaultData()
    data.transactions.push({ id: 'a', type: 'expense', amount: 80, date: '2026-10-03', categoryId: 'comida', note: 'Pollo, "Campero"', createdAt: 1 })
    const csv = toCsv(data)
    expect(csv).toContain('2026-10-03,Gasto,Comida y restaurantes,"Pollo, ""Campero""",-80.00')
  })
})
