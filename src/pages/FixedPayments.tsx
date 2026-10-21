import { CalendarCheck, CircleCheck, Info, Plus } from 'lucide-react'
import { FixedRow } from '../components/recurring'
import { useRecurringSheets } from '../components/RecurringSheets'
import { Button, Card, EmptyState, Meter, Money } from '../components/ui'
import { useMonthSummary } from '../hooks/useData'
import { monthLabel } from '../lib/dates'
import { useUiStore } from '../store/useUiStore'

export function FixedPayments() {
  const month = useUiStore((s) => s.month)
  const summary = useMonthSummary(month)
  const { openDetail, openEditor, sheets } = useRecurringSheets(month)
  const paidCount = summary.fixedLines.filter((l) => l.record).length

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[13px] font-medium text-ink-3">Total de pagos fijos · {monthLabel(month)}</p>
            <Money value={summary.fixedTotal} className="mt-1 block text-[32px] leading-none font-extrabold tracking-tight" />
          </div>
          <div className="text-right">
            <p className="text-[13px] text-ink-3">
              {paidCount} de {summary.fixedLines.length} pagados
            </p>
            {summary.fixedPending > 0 ? (
              <p className="text-[14px] font-semibold">
                Falta <Money value={summary.fixedPending} />
              </p>
            ) : (
              summary.fixedLines.length > 0 && (
                <p className="inline-flex items-center gap-1 text-[14px] font-semibold text-good">
                  <CircleCheck className="size-4" aria-hidden /> Todo pagado
                </p>
              )
            )}
          </div>
        </div>
        <div className="mt-4">
          <Meter value={summary.fixedPaid} max={summary.fixedTotal} tone="brand" label="Avance de pagos fijos" />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-surface-2 px-4 py-3">
            <p className="text-[12px] font-medium text-ink-3">Ingresos del mes</p>
            <Money value={summary.incomeTotal} className="text-[16px] font-bold" />
          </div>
          <div className="rounded-2xl bg-brand-soft px-4 py-3">
            <p className="text-[12px] font-medium text-ink-2">Libre después de pagos fijos</p>
            <Money value={summary.freeAfterFixed} className="text-[16px] font-bold text-brand-ink" />
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-2">
          <h2 className="text-[15px] font-bold tracking-tight">Este mes</h2>
          <Button size="sm" variant="primary" icon={Plus} onClick={() => openEditor('fixed')}>
            Nuevo pago fijo
          </Button>
        </div>
        {summary.fixedLines.length ? (
          <ul className="divide-y divide-line pb-1">
            {summary.fixedLines.map((l) => (
              <FixedRow key={l.payment.id} line={l} month={month} onOpen={() => openDetail('fixed', l.payment.id)} />
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={CalendarCheck}
            title="No tienes pagos fijos este mes"
            text="Agrega lo que pagas todos los meses: renta, carro, préstamos, teléfono…"
          />
        )}
      </Card>

      <p className="flex gap-2 px-1 text-[12.5px] leading-relaxed text-ink-3">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
        Toca el círculo para marcar un pago como hecho. Toca el pago para cambiar el monto de este mes, la fecha, o editarlo.
      </p>
      {sheets}
    </div>
  )
}
