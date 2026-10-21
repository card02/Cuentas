import { currentMonth } from '../lib/dates'
import type { AppData, Category, FixedPayment, IncomeSource } from '../types'

export const DATA_VERSION = 1

export const OTHER_CATEGORY_ID = 'otros'

export const defaultCategories: Category[] = [
  { id: 'gasolina', name: 'Gasolina', icon: 'fuel', color: 'amber', budget: null },
  { id: 'supermercado', name: 'Supermercado', icon: 'shopping-cart', color: 'emerald', budget: null },
  { id: 'comida', name: 'Comida y restaurantes', icon: 'utensils', color: 'orange', budget: null },
  { id: 'carro', name: 'Mantenimiento del carro', icon: 'wrench', color: 'slate', budget: null },
  { id: 'servicios', name: 'Servicios (luz, agua, internet)', icon: 'zap', color: 'sky', budget: null },
  { id: 'salud', name: 'Salud', icon: 'heart-pulse', color: 'rose', budget: null },
  { id: 'entretenimiento', name: 'Entretenimiento', icon: 'film', color: 'violet', budget: null },
  { id: 'personal', name: 'Ropa y cuidado personal', icon: 'shirt', color: 'pink', budget: null },
  { id: 'hogar', name: 'Hogar', icon: 'sofa', color: 'teal', budget: null },
  { id: OTHER_CATEGORY_ID, name: 'Otros', icon: 'package', color: 'slate', budget: null },
]

export const defaultFixedPayments: FixedPayment[] = [
  { id: 'apartamento', name: 'Apartamento', amount: 2000, icon: 'house', color: 'indigo', dueDay: 31, startMonth: null, endMonth: null },
  { id: 'carro', name: 'Carro', amount: 2000, icon: 'car', color: 'sky', dueDay: 31, startMonth: null, endMonth: null },
  { id: 'prestamo', name: 'Préstamo', amount: 660.65, icon: 'landmark', color: 'violet', dueDay: 31, startMonth: null, endMonth: null },
  { id: 'celular', name: 'Línea de celular', amount: 120, icon: 'smartphone', color: 'teal', dueDay: 31, startMonth: null, endMonth: null },
]

export const defaultIncomeSources: IncomeSource[] = [
  { id: 'quincena-1', name: '1ª quincena', amount: 4500, icon: 'wallet', color: 'emerald', payDay: 15, startMonth: null, endMonth: null },
  { id: 'quincena-2', name: '2ª quincena', amount: 4500, icon: 'wallet', color: 'emerald', payDay: 31, startMonth: null, endMonth: null },
]

export function createDefaultData(): AppData {
  return {
    version: DATA_VERSION,
    settings: { startMonth: currentMonth(), theme: 'system', lastBackupAt: null },
    categories: structuredClone(defaultCategories),
    fixedPayments: structuredClone(defaultFixedPayments),
    incomeSources: structuredClone(defaultIncomeSources),
    fixedRecords: {},
    incomeRecords: {},
    transactions: [],
  }
}
