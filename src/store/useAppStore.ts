import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { addMonths } from '../lib/dates'
import { newId } from '../lib/id'
import { round2 } from '../lib/money'
import type {
  AppData,
  Category,
  FixedPayment,
  IncomeSource,
  MonthKey,
  MonthRecord,
  Settings,
  Transaction,
} from '../types'
import { createDefaultData, DATA_VERSION, OTHER_CATEGORY_ID } from './defaults'

export const STORAGE_KEY = 'mis-cuentas:datos'

type RecordKind = 'fixedRecords' | 'incomeRecords'
type RecurringKind = 'fixedPayments' | 'incomeSources'

export interface AppActions {
  addTransaction: (t: Omit<Transaction, 'id' | 'createdAt'>) => Transaction
  updateTransaction: (id: string, patch: Partial<Omit<Transaction, 'id' | 'createdAt'>>) => void
  deleteTransaction: (id: string) => Transaction | undefined
  restoreTransaction: (t: Transaction) => void

  setRecord: (kind: RecordKind, month: MonthKey, id: string, record: MonthRecord) => void
  clearRecord: (kind: RecordKind, month: MonthKey, id: string) => MonthRecord | undefined

  saveFixedPayment: (p: Omit<FixedPayment, 'id'> & { id?: string }) => void
  saveIncomeSource: (s: Omit<IncomeSource, 'id'> & { id?: string }) => void
  /** Deja de aplicar a partir de `fromMonth` (conserva el historial anterior). */
  endRecurring: (kind: RecurringKind, id: string, fromMonth: MonthKey) => void

  saveCategory: (c: Omit<Category, 'id'> & { id?: string }) => void
  /** Elimina la categoría y mueve sus gastos a `moveTo`. */
  deleteCategory: (id: string, moveTo: string) => void

  updateSettings: (patch: Partial<Settings>) => void
  replaceData: (data: AppData) => void
  resetData: () => void
}

export type AppState = AppData & AppActions

function pickData(state: AppState): AppData {
  return {
    version: state.version,
    settings: state.settings,
    categories: state.categories,
    fixedPayments: state.fixedPayments,
    incomeSources: state.incomeSources,
    fixedRecords: state.fixedRecords,
    incomeRecords: state.incomeRecords,
    transactions: state.transactions,
  }
}

export function getData(): AppData {
  return pickData(useAppStore.getState())
}

function upsert<T extends { id: string }>(items: T[], item: Omit<T, 'id'> & { id?: string }): T[] {
  if (item.id && items.some((i) => i.id === item.id)) {
    return items.map((i) => (i.id === item.id ? ({ ...i, ...item } as T) : i))
  }
  return [...items, { ...item, id: item.id ?? newId() } as T]
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...createDefaultData(),

      addTransaction: (t) => {
        const tx: Transaction = { ...t, amount: round2(t.amount), id: newId(), createdAt: Date.now() }
        set((s) => ({ transactions: [...s.transactions, tx] }))
        return tx
      },
      updateTransaction: (id, patch) =>
        set((s) => ({
          transactions: s.transactions.map((t) =>
            t.id === id ? { ...t, ...patch, amount: round2(patch.amount ?? t.amount) } : t,
          ),
        })),
      deleteTransaction: (id) => {
        const removed = get().transactions.find((t) => t.id === id)
        set((s) => ({ transactions: s.transactions.filter((t) => t.id !== id) }))
        return removed
      },
      restoreTransaction: (t) =>
        set((s) => (s.transactions.some((x) => x.id === t.id) ? s : { transactions: [...s.transactions, t] })),

      setRecord: (kind, month, id, record) =>
        set((s) => ({
          [kind]: { ...s[kind], [month]: { ...s[kind][month], [id]: { ...record, amount: round2(record.amount) } } },
        })),
      clearRecord: (kind, month, id) => {
        const prev = get()[kind][month]?.[id]
        set((s) => {
          const { [id]: _removed, ...rest } = s[kind][month] ?? {}
          const next = { ...s[kind] }
          if (Object.keys(rest).length) next[month] = rest
          else delete next[month]
          return { [kind]: next }
        })
        return prev
      },

      saveFixedPayment: (p) => set((s) => ({ fixedPayments: upsert(s.fixedPayments, { ...p, amount: round2(p.amount) }) })),
      saveIncomeSource: (src) => set((s) => ({ incomeSources: upsert(s.incomeSources, { ...src, amount: round2(src.amount) }) })),
      endRecurring: (kind, id, fromMonth) =>
        set((s) => {
          const items = s[kind] as (FixedPayment | IncomeSource)[]
          const item = items.find((i) => i.id === id)
          if (!item) return s
          const recordKind: RecordKind = kind === 'fixedPayments' ? 'fixedRecords' : 'incomeRecords'
          const hasRecords = Object.values(s[recordKind]).some((byId) => byId[id])
          const startsLater = item.startMonth !== null && item.startMonth >= fromMonth
          // Si nunca aplicó antes de este mes ni tiene pagos registrados, se elimina por completo.
          if (!hasRecords && startsLater) {
            return { [kind]: items.filter((i) => i.id !== id) } as Partial<AppState>
          }
          const endMonth = addMonths(fromMonth, -1)
          return { [kind]: items.map((i) => (i.id === id ? { ...i, endMonth } : i)) } as Partial<AppState>
        }),

      saveCategory: (c) =>
        set((s) => ({ categories: upsert(s.categories, { ...c, budget: c.budget === null ? null : round2(c.budget) }) })),
      deleteCategory: (id, moveTo) =>
        set((s) => {
          if (id === OTHER_CATEGORY_ID) return s
          const target = s.categories.some((c) => c.id === moveTo && c.id !== id) ? moveTo : OTHER_CATEGORY_ID
          return {
            categories: s.categories.filter((c) => c.id !== id),
            transactions: s.transactions.map((t) => (t.categoryId === id ? { ...t, categoryId: target } : t)),
          }
        }),

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      replaceData: (data) => set(() => ({ ...data })),
      resetData: () => set(() => createDefaultData()),
    }),
    {
      name: STORAGE_KEY,
      version: DATA_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => pickData(state),
      // Punto de entrada para futuras migraciones del formato de datos.
      migrate: (persisted) => persisted as AppData,
    },
  ),
)
