import type { AppData, Category, ColorName, FixedPayment, IncomeSource, MonthRecord, Transaction } from '../types'
import { colorNames, iconNames, type IconName } from '../components/icons'
import { DATA_VERSION, OTHER_CATEGORY_ID } from '../store/defaults'
import { round2 } from './money'

const BACKUP_KIND = 'mis-cuentas-respaldo'

export interface BackupFile {
  kind: typeof BACKUP_KIND
  exportedAt: string
  data: AppData
}

export function createBackup(data: AppData): BackupFile {
  return { kind: BACKUP_KIND, exportedAt: new Date().toISOString(), data }
}

export class BackupError extends Error {}

type Obj = Record<string, unknown>

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)
const monthRe = /^\d{4}-(0[1-9]|1[0-2])$/
const dateRe = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/

function str(v: unknown, field: string): string {
  if (typeof v !== 'string') throw new BackupError(`El campo "${field}" no es válido.`)
  return v
}

function amount(v: unknown, field: string): number {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) throw new BackupError(`El monto de "${field}" no es válido.`)
  return round2(v)
}

function month(v: unknown, field: string): string | null {
  if (v === null || v === undefined) return null
  if (typeof v !== 'string' || !monthRe.test(v)) throw new BackupError(`El mes de "${field}" no es válido.`)
  return v
}

function day(v: unknown, field: string): number {
  if (typeof v !== 'number' || !Number.isInteger(v) || v < 1 || v > 31) throw new BackupError(`El día de "${field}" no es válido.`)
  return v
}

const icon = (v: unknown): IconName => (iconNames.includes(v as IconName) ? (v as IconName) : 'package')
const color = (v: unknown): ColorName => (colorNames.includes(v as ColorName) ? (v as ColorName) : 'slate')

function list(v: unknown, field: string): unknown[] {
  if (!Array.isArray(v)) throw new BackupError(`Falta la lista "${field}".`)
  return v
}

function records(v: unknown, field: string): Record<string, Record<string, MonthRecord>> {
  if (v === undefined) return {}
  if (!isObj(v)) throw new BackupError(`Los registros de "${field}" no son válidos.`)
  const out: Record<string, Record<string, MonthRecord>> = {}
  for (const [m, byId] of Object.entries(v)) {
    if (!monthRe.test(m) || !isObj(byId)) throw new BackupError(`Los registros de "${field}" no son válidos.`)
    out[m] = {}
    for (const [id, rec] of Object.entries(byId)) {
      if (!isObj(rec) || typeof rec.date !== 'string' || !dateRe.test(rec.date)) {
        throw new BackupError(`Un registro de "${field}" no es válido.`)
      }
      out[m][id] = { amount: amount(rec.amount, field), date: rec.date }
    }
  }
  return out
}

/** Valida y normaliza los datos de un respaldo. Lanza BackupError con un mensaje legible. */
export function parseBackup(text: string): AppData {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new BackupError('El archivo no es un respaldo válido (no es JSON).')
  }
  const data = isObj(raw) && raw.kind === BACKUP_KIND ? raw.data : raw
  if (!isObj(data)) throw new BackupError('El archivo no es un respaldo de Mis Cuentas.')
  if (typeof data.version === 'number' && data.version > DATA_VERSION) {
    throw new BackupError('Este respaldo es de una versión más nueva de la app. Actualiza la página e inténtalo de nuevo.')
  }

  const s = isObj(data.settings) ? data.settings : {}
  const settings: AppData['settings'] = {
    startMonth: month(s.startMonth, 'mes de inicio') ?? new Date().toISOString().slice(0, 7),
    theme: s.theme === 'light' || s.theme === 'dark' ? s.theme : 'system',
    lastBackupAt: typeof s.lastBackupAt === 'number' ? s.lastBackupAt : null,
  }

  const categories: Category[] = list(data.categories, 'categorías').map((c) => {
    if (!isObj(c)) throw new BackupError('Una categoría no es válida.')
    return {
      id: str(c.id, 'categoría'),
      name: str(c.name, 'categoría'),
      icon: icon(c.icon),
      color: color(c.color),
      budget: c.budget === null || c.budget === undefined ? null : amount(c.budget, 'presupuesto'),
    }
  })
  if (!categories.some((c) => c.id === OTHER_CATEGORY_ID)) {
    categories.push({ id: OTHER_CATEGORY_ID, name: 'Otros', icon: 'package', color: 'slate', budget: null })
  }

  const fixedPayments: FixedPayment[] = list(data.fixedPayments, 'pagos fijos').map((p) => {
    if (!isObj(p)) throw new BackupError('Un pago fijo no es válido.')
    return {
      id: str(p.id, 'pago fijo'),
      name: str(p.name, 'pago fijo'),
      amount: amount(p.amount, 'pago fijo'),
      icon: icon(p.icon),
      color: color(p.color),
      dueDay: day(p.dueDay, 'pago fijo'),
      startMonth: month(p.startMonth, 'pago fijo'),
      endMonth: month(p.endMonth, 'pago fijo'),
    }
  })

  const incomeSources: IncomeSource[] = list(data.incomeSources, 'ingresos').map((p) => {
    if (!isObj(p)) throw new BackupError('Un ingreso no es válido.')
    return {
      id: str(p.id, 'ingreso'),
      name: str(p.name, 'ingreso'),
      amount: amount(p.amount, 'ingreso'),
      icon: icon(p.icon),
      color: color(p.color),
      payDay: day(p.payDay, 'ingreso'),
      startMonth: month(p.startMonth, 'ingreso'),
      endMonth: month(p.endMonth, 'ingreso'),
    }
  })

  const categoryIds = new Set(categories.map((c) => c.id))
  const transactions: Transaction[] = list(data.transactions, 'movimientos').map((t) => {
    if (!isObj(t)) throw new BackupError('Un movimiento no es válido.')
    const date = str(t.date, 'fecha')
    if (!dateRe.test(date)) throw new BackupError(`La fecha "${date}" de un movimiento no es válida.`)
    const type = t.type === 'income' ? 'income' : 'expense'
    const categoryId = typeof t.categoryId === 'string' && categoryIds.has(t.categoryId) ? t.categoryId : null
    return {
      id: str(t.id, 'movimiento'),
      type,
      amount: amount(t.amount, 'movimiento'),
      date,
      categoryId: type === 'expense' ? (categoryId ?? OTHER_CATEGORY_ID) : null,
      note: typeof t.note === 'string' ? t.note : '',
      createdAt: typeof t.createdAt === 'number' ? t.createdAt : Date.now(),
    }
  })

  return {
    version: DATA_VERSION,
    settings,
    categories,
    fixedPayments,
    incomeSources,
    fixedRecords: records(data.fixedRecords, 'pagos fijos'),
    incomeRecords: records(data.incomeRecords, 'ingresos'),
    transactions,
  }
}

function csvCell(value: string | number): string {
  const s = String(value)
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** CSV con todos los movimientos y pagos registrados, listo para Excel o Google Sheets. */
export function toCsv(data: AppData): string {
  const categories = new Map(data.categories.map((c) => [c.id, c.name]))
  const rows: (string | number)[][] = [['Fecha', 'Tipo', 'Categoría', 'Descripción', 'Monto (Q)']]

  for (const t of data.transactions) {
    rows.push([
      t.date,
      t.type === 'income' ? 'Ingreso extra' : 'Gasto',
      t.type === 'income' ? '' : (categories.get(t.categoryId ?? '') ?? 'Otros'),
      t.note,
      t.type === 'income' ? t.amount.toFixed(2) : (-t.amount).toFixed(2),
    ])
  }
  const fixedNames = new Map(data.fixedPayments.map((p) => [p.id, p.name]))
  for (const byId of Object.values(data.fixedRecords)) {
    for (const [id, rec] of Object.entries(byId)) {
      rows.push([rec.date, 'Pago fijo', fixedNames.get(id) ?? 'Pago fijo', '', (-rec.amount).toFixed(2)])
    }
  }
  const incomeNames = new Map(data.incomeSources.map((s) => [s.id, s.name]))
  for (const byId of Object.values(data.incomeRecords)) {
    for (const [id, rec] of Object.entries(byId)) {
      rows.push([rec.date, 'Salario', incomeNames.get(id) ?? 'Salario', '', rec.amount.toFixed(2)])
    }
  }

  const [header, ...body] = rows
  body.sort((a, b) => String(a[0]).localeCompare(String(b[0])))
  // BOM para que Excel reconozca los acentos.
  return '﻿' + [header!, ...body].map((r) => r.map(csvCell).join(',')).join('\n')
}

export function downloadFile(filename: string, content: string, type: string): void {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
