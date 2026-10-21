import { useMemo, useState } from 'react'
import { ChartColumn, Table2 } from 'lucide-react'
import { LegendItem, MonthlyColumns, RankedBars, type MonthColumn, type RankedItem } from '../components/charts'
import { Card, CardHeader, IconBadge, Money, Segmented, cx } from '../components/ui'
import { useData } from '../hooks/useData'
import { navigate } from '../hooks/useRoute'
import { historyBounds, summarizeMonth } from '../lib/calc'
import { addMonths, currentMonth, monthLabel, monthRange, monthShort } from '../lib/dates'
import { formatQ, round2, sum } from '../lib/money'
import { useUiStore } from '../store/useUiStore'

type Range = '6' | '12' | 'all'

export function History() {
  const data = useData()
  const setMonth = useUiStore((s) => s.setMonth)
  const [range, setRange] = useState<Range>('6')

  const summaries = useMemo(() => {
    const { from, to } = historyBounds(data, currentMonth())
    const start = range === 'all' ? from : [from, addMonths(to, -(Number(range) - 1))].sort().at(-1)!
    return monthRange(start, to).map((m) => summarizeMonth(data, m))
  }, [data, range])

  const columns: MonthColumn[] = summaries.map((s) => ({
    key: s.month,
    label: monthShort(s.month),
    fullLabel: monthLabel(s.month),
    fixed: s.fixedTotal,
    spend: s.expensesTotal,
    free: s.free,
    income: s.incomeTotal,
  }))

  const totals = {
    income: sum(summaries.map((s) => s.incomeTotal)),
    fixed: sum(summaries.map((s) => s.fixedTotal)),
    spend: sum(summaries.map((s) => s.expensesTotal)),
    free: sum(summaries.map((s) => s.free)),
  }
  const avgSpend = summaries.length ? round2(totals.spend / summaries.length) : 0

  const topCategories: RankedItem[] = useMemo(() => {
    const map = new Map<string, RankedItem>()
    for (const s of summaries) {
      for (const c of s.byCategory) {
        if (c.total <= 0) continue
        const cur = map.get(c.category.id)
        map.set(c.category.id, {
          id: c.category.id,
          label: c.category.name,
          icon: <IconBadge icon={c.category.icon} color={c.category.color} size="sm" />,
          value: round2((cur?.value ?? 0) + c.total),
          k: 'spend',
        })
      }
    }
    return [...map.values()].sort((a, b) => b.value - a.value).slice(0, 8)
  }, [summaries])

  const openMonth = (m: string) => {
    setMonth(m)
    navigate('resumen')
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <div className="w-full sm:w-80">
          <Segmented
            label="Periodo"
            value={range}
            onChange={setRange}
            options={[
              { value: '6', label: '6 meses' },
              { value: '12', label: '12 meses' },
              { value: 'all', label: 'Todo' },
            ]}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Ingresos" value={totals.income} />
        <Tile label="Pagos fijos" value={totals.fixed} />
        <Tile label="Gastos variables" value={totals.spend} sub={`Promedio mensual ${formatQ(avgSpend)}`} />
        <Tile label={totals.free >= 0 ? 'Ahorro acumulado' : 'Déficit acumulado'} value={totals.free} accent />
      </div>

      <Card>
        <CardHeader icon={ChartColumn} title="Mes a mes" subtitle="Cómo se repartió el ingreso de cada mes. Toca un mes para abrirlo." />
        <div className="flex flex-wrap gap-x-5 gap-y-1.5 px-5 pt-4">
          <LegendItem k="fixed" />
          <LegendItem k="spend" />
          <LegendItem k="free" />
        </div>
        <div className="px-3 pt-2 pb-4 sm:px-5">
          <MonthlyColumns data={columns} onSelect={openMonth} />
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader icon={Table2} title="Detalle por mes" />
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[34rem] text-[13.5px]">
              <thead>
                <tr className="border-y border-line bg-surface-2 text-left text-[12px] text-ink-3">
                  <th className="px-5 py-2 font-semibold">Mes</th>
                  <th className="px-3 py-2 text-right font-semibold">Ingresos</th>
                  <th className="px-3 py-2 text-right font-semibold">Pagos fijos</th>
                  <th className="px-3 py-2 text-right font-semibold">Gastos</th>
                  <th className="px-5 py-2 text-right font-semibold">Libre</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {[...summaries].reverse().map((s) => (
                  <tr key={s.month} onClick={() => openMonth(s.month)} className="cursor-pointer transition hover:bg-surface-2">
                    <td className="px-5 py-2.5 font-semibold">{monthLabel(s.month)}</td>
                    <td className="px-3 py-2.5 text-right"><Money value={s.incomeTotal} /></td>
                    <td className="px-3 py-2.5 text-right"><Money value={s.fixedTotal} /></td>
                    <td className="px-3 py-2.5 text-right"><Money value={s.expensesTotal} /></td>
                    <td className={cx('px-5 py-2.5 text-right font-bold', s.free < 0 ? 'text-bad' : 'text-ink')}>
                      <Money value={s.free} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Categorías con más gasto" subtitle="Porcentaje del gasto variable del periodo" />
          <div className="px-5 pt-4 pb-5">
            {topCategories.length ? (
              <RankedBars items={topCategories} base={totals.spend} />
            ) : (
              <p className="py-6 text-center text-sm text-ink-3">Todavía no hay gastos registrados en este periodo.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}

function Tile({ label, value, sub, accent }: { label: string; value: number; sub?: string; accent?: boolean }) {
  return (
    <div className={cx('min-w-0 rounded-2xl border px-4 py-3.5 shadow-card', accent ? 'border-transparent bg-brand-soft' : 'border-line bg-surface')}>
      <p className="truncate text-[12px] font-medium text-ink-3">{label}</p>
      <Money value={value} className={cx('mt-0.5 block truncate text-lg font-extrabold tracking-tight', accent && (value < 0 ? 'text-bad' : 'text-brand-ink'))} />
      {sub && <p className="mt-0.5 truncate text-[12px] text-ink-3">{sub}</p>}
    </div>
  )
}
