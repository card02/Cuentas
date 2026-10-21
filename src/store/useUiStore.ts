import { create } from 'zustand'
import { addMonths, currentMonth } from '../lib/dates'
import type { MonthKey, Transaction, TransactionType } from '../types'

export interface Toast {
  id: number
  message: string
  action?: { label: string; run: () => void }
}

/** Qué formulario de movimiento está abierto: uno nuevo o la edición de uno existente. */
export type TransactionSheet = { mode: 'new'; type: TransactionType } | { mode: 'edit'; transaction: Transaction } | null

interface UiState {
  month: MonthKey
  setMonth: (m: MonthKey) => void
  shiftMonth: (delta: number) => void

  transactionSheet: TransactionSheet
  openNewTransaction: (type?: TransactionType) => void
  openEditTransaction: (t: Transaction) => void
  closeTransactionSheet: () => void

  toasts: Toast[]
  toast: (message: string, action?: Toast['action']) => void
  dismissToast: (id: number) => void
}

let toastSeq = 0

export const useUiStore = create<UiState>()((set, get) => ({
  month: currentMonth(),
  setMonth: (month) => set({ month }),
  shiftMonth: (delta) => set({ month: addMonths(get().month, delta) }),

  transactionSheet: null,
  openNewTransaction: (type = 'expense') => set({ transactionSheet: { mode: 'new', type } }),
  openEditTransaction: (transaction) => set({ transactionSheet: { mode: 'edit', transaction } }),
  closeTransactionSheet: () => set({ transactionSheet: null }),

  toasts: [],
  toast: (message, action) => {
    const id = ++toastSeq
    set((s) => ({ toasts: [...s.toasts.slice(-2), { id, message, action }] }))
    setTimeout(() => get().dismissToast(id), action ? 6000 : 3500)
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))
