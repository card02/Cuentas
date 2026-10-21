import { useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { summarizeMonth } from '../lib/calc'
import { useAppStore, type AppState } from '../store/useAppStore'
import type { AppData, MonthKey } from '../types'

const selectData = (s: AppState): AppData => ({
  version: s.version,
  settings: s.settings,
  categories: s.categories,
  fixedPayments: s.fixedPayments,
  incomeSources: s.incomeSources,
  fixedRecords: s.fixedRecords,
  incomeRecords: s.incomeRecords,
  transactions: s.transactions,
})

/** Todos los datos guardados (se vuelve a renderizar solo cuando cambian). */
export function useData(): AppData {
  return useAppStore(useShallow(selectData))
}

export function useMonthSummary(month: MonthKey) {
  const data = useData()
  return useMemo(() => summarizeMonth(data, month), [data, month])
}

export function useCategoryMap() {
  const categories = useAppStore((s) => s.categories)
  return useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])
}
