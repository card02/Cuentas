import { useMemo, useState } from 'react'
import { ListOrdered, Plus, Search, X } from 'lucide-react'
import { TransactionRow } from '../components/TransactionRow'
import { getIcon } from '../components/icons'
import { Button, Card, EmptyState, Money, Segmented, cx } from '../components/ui'
import { useCategoryMap, useMonthSummary } from '../hooks/useData'
import { longDateLabel, monthLabel } from '../lib/dates'
import { formatQ, sum } from '../lib/money'
import { useAppStore } from '../store/useAppStore'
import { useUiStore } from '../store/useUiStore'
import type { Transaction } from '../types'

type TypeFilter = 'all' | 'expense' | 'income'

const normalize = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

export function Movements() {
  const month = useUiStore((s) => s.month)
  const openNew = useUiStore((s) => s.openNewTransaction)
  const summary = useMonthSummary(month)
  const categories = useAppStore((s) => s.categories)
  const categoryMap = useCategoryMap()

  const [type, setType] = useState<TypeFilter>('all')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = normalize(query.trim())
    return summary.transactions.filter((t) => {
      if (type !== 'all' && t.type !== type) return false
      if (categoryId && t.categoryId !== categoryId) return false
      if (!q) return true
      const cat = t.categoryId ? categoryMap.get(t.categoryId)?.name : 'ingreso extra'
      return normalize(`${t.note} ${cat ?? ''} ${t.amount}`).includes(q)
    })
  }, [summary.transactions, type, categoryId, query, categoryMap])

  const groups = useMemo(() => {
    const map = new Map<string, Transaction[]>()
    for (const t of filtered) map.set(t.date, [...(map.get(t.date) ?? []), t])
    return [...map.entries()]
  }, [filtered])

  const usedCategories = categories.filter((c) => summary.byCategory.some((b) => b.category.id === c.id && b.count > 0))
  const filtering = type !== 'all' || categoryId !== null || query.trim() !== ''

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Gastos" value={summary.expensesTotal} />
        <Stat label="Extras" value={summary.extraIncome} tone="good" />
        <Stat label="Movimientos" count={summary.transactions.length} />
      </div>

      <Card className="overflow-hidden">
        <div className="space-y-3 border-b border-line p-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="relative flex-1">
              <span className="sr-only">Buscar</span>
              <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-3" aria-hidden />
              <input
                className="field pl-10"
                placeholder="Buscar por descripción o monto"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <div className="sm:w-80">
              <Segmented
                label="Tipo"
                value={type}
                onChange={(v) => {
                  setType(v)
                  if (v === 'income') setCategoryId(null)
                }}
                options={[
                  { value: 'all', label: 'Todos' },
                  { value: 'expense', label: 'Gastos' },
                  { value: 'income', label: 'Ingresos' },
                ]}
              />
            </div>
          </div>
          {type !== 'income' && usedCategories.length > 0 && (
            <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
              {usedCategories.map((c) => {
                const Icon = getIcon(c.icon)
                const active = categoryId === c.id
                return (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setCategoryId(active ? null : c.id)}
                    className={cx(
                      'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-semibold transition',
                      active ? 'border-brand-ink bg-brand-soft text-brand-ink' : 'border-line text-ink-2 hover:bg-surface-2',
                    )}
                  >
                    <Icon className="size-3.5" aria-hidden />
                    {c.name}
                    {active && <X className="size-3.5" aria-hidden />}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {groups.length ? (
          <div>
            {filtering && (
              <p className="border-b border-line bg-surface-2 px-5 py-2 text-[12.5px] text-ink-3">
                {filtered.length} resultado{filtered.length === 1 ? '' : 's'} · gastos{' '}
                <span className="num font-semibold text-ink">{formatQ(sum(filtered.filter((t) => t.type === 'expense').map((t) => t.amount)))}</span>
              </p>
            )}
            {groups.map(([date, items]) => {
              const net = sum(items.map((t) => (t.type === 'income' ? t.amount : -t.amount)))
              return (
                <section key={date}>
                  <h3 className="flex items-center justify-between border-b border-line bg-surface-2/60 px-5 py-2 text-[12.5px] font-bold text-ink-2">
                    <span>{longDateLabel(date)}</span>
                    <span className="num font-semibold text-ink-3">
                      {net > 0 ? '+' : net < 0 ? '−' : ''}
                      {formatQ(Math.abs(net))}
                    </span>
                  </h3>
                  <ul className="divide-y divide-line">
                    {items.map((t) => (
                      <TransactionRow key={t.id} t={t} category={t.categoryId ? categoryMap.get(t.categoryId) : undefined} showDate={false} />
                    ))}
                  </ul>
                </section>
              )
            })}
          </div>
        ) : filtering ? (
          <EmptyState icon={Search} title="Sin resultados" text="Prueba con otra búsqueda o quita los filtros." />
        ) : (
          <EmptyState
            icon={ListOrdered}
            title={`Sin movimientos en ${monthLabel(month).toLowerCase()}`}
            text="Cada gasto que registres aparecerá aquí, ordenado por día."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button variant="primary" icon={Plus} onClick={() => openNew('expense')}>
                  Registrar gasto
                </Button>
                <Button icon={Plus} onClick={() => openNew('income')}>
                  Ingreso extra
                </Button>
              </div>
            }
          />
        )}
      </Card>
    </div>
  )
}

function Stat({ label, value, count, tone }: { label: string; value?: number; count?: number; tone?: 'good' }) {
  return (
    <div className="card min-w-0 px-4 py-3.5">
      <p className="truncate text-[12px] font-medium text-ink-3">{label}</p>
      {value !== undefined ? (
        <Money value={value} className={cx('mt-0.5 block truncate text-[16px] font-bold sm:text-lg', tone === 'good' && value > 0 && 'text-good')} />
      ) : (
        <p className="num mt-0.5 text-[16px] font-bold sm:text-lg">{count}</p>
      )}
    </div>
  )
}
