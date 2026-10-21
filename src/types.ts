import type { IconName } from './components/icons'

/** Mes en formato `YYYY-MM`. */
export type MonthKey = string
/** Fecha local en formato `YYYY-MM-DD`. */
export type DateStr = string

export type ColorName =
  | 'emerald'
  | 'teal'
  | 'sky'
  | 'indigo'
  | 'violet'
  | 'pink'
  | 'rose'
  | 'orange'
  | 'amber'
  | 'lime'
  | 'slate'

export interface Category {
  id: string
  name: string
  icon: IconName
  color: ColorName
  /** Presupuesto mensual opcional. */
  budget: number | null
}

/** Día del mes (1–31). 31 significa "fin de mes" y se ajusta al último día. */
export type DayOfMonth = number

interface Recurring {
  id: string
  name: string
  amount: number
  icon: IconName
  color: ColorName
  /** Primer mes en que aplica (null = siempre). */
  startMonth: MonthKey | null
  /** Último mes en que aplica (null = sin fin). */
  endMonth: MonthKey | null
}

export interface FixedPayment extends Recurring {
  dueDay: DayOfMonth
}

export interface IncomeSource extends Recurring {
  payDay: DayOfMonth
}

/** Registro de un pago fijo o ingreso recibido en un mes concreto. */
export interface MonthRecord {
  amount: number
  date: DateStr
}

export type TransactionType = 'expense' | 'income'

export interface Transaction {
  id: string
  type: TransactionType
  amount: number
  date: DateStr
  /** Solo para gastos. */
  categoryId: string | null
  note: string
  createdAt: number
}

export type ThemePreference = 'system' | 'light' | 'dark'

export interface Settings {
  /** Primer mes que la app muestra en el historial. */
  startMonth: MonthKey
  theme: ThemePreference
  lastBackupAt: number | null
}

export interface AppData {
  version: number
  settings: Settings
  categories: Category[]
  fixedPayments: FixedPayment[]
  incomeSources: IncomeSource[]
  /** fixedRecords[mes][idPagoFijo] */
  fixedRecords: Record<MonthKey, Record<string, MonthRecord>>
  /** incomeRecords[mes][idIngreso] */
  incomeRecords: Record<MonthKey, Record<string, MonthRecord>>
  transactions: Transaction[]
}
