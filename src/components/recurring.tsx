import { useState } from 'react'
import { Check, Trash2 } from 'lucide-react'
import { AmountInput, Button, Field, IconBadge, Money, Sheet, SheetActions, StatusChip, cx, type Status } from './ui'
import { colorNames, colorSwatch, getIcon, iconNames, type IconName } from './icons'
import type { FixedLine, IncomeLine } from '../lib/calc'
import { currentMonth, dateInMonth, dayLabel, daysBetween, monthLabel, shortDateLabel, today } from '../lib/dates'
import { formatNumber, formatQ, parseAmount } from '../lib/money'
import { useAppStore } from '../store/useAppStore'
import { useUiStore } from '../store/useUiStore'
import type { ColorName, MonthKey } from '../types'

type Kind = 'fixed' | 'income'

const recordKind = (kind: Kind) => (kind === 'fixed' ? 'fixedRecords' : 'incomeRecords')

export function fixedStatus(line: FixedLine, month: MonthKey): { status: Status; label?: string } {
  if (line.record) return { status: 'paid' }
  const now = today()
  const due = dateInMonth(month, line.payment.dueDay)
  const diff = daysBetween(now, due)
  if (diff < 0) return { status: 'overdue' }
  if (diff === 0) return { status: 'soon', label: 'Vence hoy' }
  if (diff <= 5) return { status: 'soon', label: `Vence en ${diff} ${diff === 1 ? 'día' : 'días'}` }
  return { status: 'pending' }
}

/** Fecha sugerida al marcar algo como pagado/recibido. */
function suggestedDate(month: MonthKey, day: number) {
  return month === currentMonth() ? today() : dateInMonth(month, day)
}

/** Marcar o desmarcar un pago fijo / quincena con un toque, con opción de deshacer. */
export function useToggleRecord() {
  const setRecord = useAppStore((s) => s.setRecord)
  const clearRecord = useAppStore((s) => s.clearRecord)
  const toast = useUiStore((s) => s.toast)

  return (kind: Kind, month: MonthKey, line: FixedLine | IncomeLine) => {
    const id = 'payment' in line ? line.payment.id : line.source.id
    const name = 'payment' in line ? line.payment.name : line.source.name
    const day = 'payment' in line ? line.payment.dueDay : line.source.payDay
    if (line.record) {
      const prev = clearRecord(recordKind(kind), month, id)
      toast(kind === 'fixed' ? `${name}: marcado como pendiente` : `${name}: marcada como pendiente`, prev && {
        label: 'Deshacer',
        run: () => setRecord(recordKind(kind), month, id, prev),
      })
    } else {
      setRecord(recordKind(kind), month, id, { amount: line.amount, date: suggestedDate(month, day) })
      toast(kind === 'fixed' ? `${name} pagado · ${formatQ(line.amount)}` : `${name} recibida · ${formatQ(line.amount)}`)
    }
  }
}

function CheckButton({ done, onClick, label }: { done: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={done}
      aria-label={label}
      title={label}
      className={cx(
        'inline-flex size-9 shrink-0 items-center justify-center rounded-full border-2 transition active:scale-90',
        done ? 'border-brand bg-brand text-white' : 'border-line-strong text-transparent hover:border-brand-ink hover:text-brand-ink/40',
      )}
    >
      <Check className="size-5" strokeWidth={3} aria-hidden />
    </button>
  )
}

export function FixedRow({ line, month, onOpen }: { line: FixedLine; month: MonthKey; onOpen: () => void }) {
  const toggle = useToggleRecord()
  const st = fixedStatus(line, month)
  const p = line.payment
  return (
    <li className="flex items-center gap-3 pr-5 transition hover:bg-surface-2">
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-5 text-left">
        <IconBadge icon={p.icon} color={p.color} />
        <span className="min-w-0 flex-1">
          <span className={cx('block truncate text-[14.5px] font-semibold', line.record && 'text-ink-2')}>{p.name}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-ink-3">
            <StatusChip status={st.status} label={st.label} />
            <span>{line.record ? `el ${shortDateLabel(line.record.date)}` : dayLabel(p.dueDay)}</span>
          </span>
        </span>
        <Money value={line.amount} className={cx('text-[14.5px] font-bold', line.record && 'text-ink-3 line-through decoration-1')} />
      </button>
      <CheckButton
        done={!!line.record}
        onClick={() => toggle('fixed', month, line)}
        label={line.record ? `Marcar ${p.name} como pendiente` : `Marcar ${p.name} como pagado`}
      />
    </li>
  )
}

export function IncomeRow({ line, month, onOpen }: { line: IncomeLine; month: MonthKey; onOpen: () => void }) {
  const toggle = useToggleRecord()
  const s = line.source
  return (
    <li className="flex items-center gap-3 pr-5 transition hover:bg-surface-2">
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-5 text-left">
        <IconBadge icon={s.icon} color={s.color} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14.5px] font-semibold">{s.name}</span>
          <span className="mt-0.5 block text-[12.5px] text-ink-3">
            {line.record ? (
              <span className="font-semibold text-good">Recibida el {shortDateLabel(line.record.date)}</span>
            ) : (
              `Pendiente · ${dayLabel(s.payDay)}`
            )}
          </span>
        </span>
        <Money value={line.amount} className="text-[14.5px] font-bold" />
      </button>
      <CheckButton
        done={!!line.record}
        onClick={() => toggle('income', month, line)}
        label={line.record ? `Marcar ${s.name} como pendiente` : `Marcar ${s.name} como recibida`}
      />
    </li>
  )
}

/* ---------- Detalle del mes: ajustar monto / fecha de lo pagado ---------- */

export function RecordSheet({
  kind,
  line,
  month,
  onClose,
  onEditTemplate,
}: {
  kind: Kind
  line: FixedLine | IncomeLine | null
  month: MonthKey
  onClose: () => void
  onEditTemplate: () => void
}) {
  const title = line ? ('payment' in line ? line.payment.name : line.source.name) : ''
  return (
    <Sheet open={line !== null} onClose={onClose} title={title} description={monthLabel(month)}>
      {line && <RecordForm key={month} kind={kind} line={line} month={month} onClose={onClose} onEditTemplate={onEditTemplate} />}
    </Sheet>
  )
}

function RecordForm({
  kind,
  line,
  month,
  onClose,
  onEditTemplate,
}: {
  kind: Kind
  line: FixedLine | IncomeLine
  month: MonthKey
  onClose: () => void
  onEditTemplate: () => void
}) {
  const setRecord = useAppStore((s) => s.setRecord)
  const clearRecord = useAppStore((s) => s.clearRecord)
  const toast = useUiStore((s) => s.toast)
  const isFixed = 'payment' in line
  const id = isFixed ? line.payment.id : line.source.id
  const day = isFixed ? line.payment.dueDay : line.source.payDay
  const configured = isFixed ? line.payment.amount : line.source.amount

  const [amount, setAmount] = useState(formatNumber(line.amount))
  const [date, setDate] = useState(line.record?.date ?? suggestedDate(month, day))
  const [error, setError] = useState<string | null>(null)

  const save = () => {
    const value = parseAmount(amount)
    if (value === null || value <= 0) return setError('Escribe un monto mayor a cero.')
    if (!date) return setError('Elige la fecha.')
    setRecord(recordKind(kind), month, id, { amount: value, date })
    toast(isFixed ? 'Pago registrado' : 'Ingreso registrado')
    onClose()
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        save()
      }}
    >
      <div className="flex items-center justify-between rounded-2xl bg-surface-2 px-4 py-3 text-sm">
        <span className="text-ink-2">
          Monto configurado · {dayLabel(day)}
        </span>
        <Money value={configured} className="font-semibold" />
      </div>
      <Field label={isFixed ? 'Monto pagado este mes' : 'Monto recibido este mes'} hint="Cámbialo solo si este mes fue distinto.">
        {(fid) => <AmountInput id={fid} value={amount} onChange={setAmount} />}
      </Field>
      <Field label={isFixed ? 'Fecha de pago' : 'Fecha en que lo recibiste'}>
        {(fid) => (
          <input id={fid} type="date" className="field" value={date} min={`${month}-01`} max={dateInMonth(month, 31)} onChange={(e) => setDate(e.target.value)} />
        )}
      </Field>
      {error && <p role="alert" className="rounded-xl bg-bad/10 px-3.5 py-2.5 text-sm font-medium text-bad">{error}</p>}
      <Button type="submit" variant="primary" size="lg" className="w-full" icon={Check}>
        {line.record ? 'Guardar cambios' : isFixed ? 'Marcar como pagado' : 'Marcar como recibida'}
      </Button>
      <div className="flex gap-2">
        {line.record && (
          <Button
            className="flex-1"
            onClick={() => {
              clearRecord(recordKind(kind), month, id)
              toast('Marcado como pendiente')
              onClose()
            }}
          >
            Marcar pendiente
          </Button>
        )}
        <Button variant="ghost" className="flex-1" onClick={onEditTemplate}>
          {isFixed ? 'Editar pago fijo' : 'Editar ingreso'}
        </Button>
      </div>
    </form>
  )
}

/* ---------- Crear / editar un pago fijo o ingreso ---------- */

export interface RecurringDraft {
  id?: string
  name: string
  amount: number
  icon: IconName
  color: ColorName
  day: number
}

const dayOptions = [...Array.from({ length: 30 }, (_, i) => i + 1), 31]

export function RecurringEditor({
  kind,
  open,
  initial,
  month,
  onClose,
}: {
  kind: Kind
  open: boolean
  initial: RecurringDraft | null
  month: MonthKey
  onClose: () => void
}) {
  const isNew = !initial?.id
  const title =
    kind === 'fixed' ? (isNew ? 'Nuevo pago fijo' : 'Editar pago fijo') : isNew ? 'Nuevo ingreso fijo' : 'Editar ingreso fijo'
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      {open && <RecurringForm key={initial?.id ?? 'new'} kind={kind} initial={initial} month={month} onClose={onClose} />}
    </Sheet>
  )
}

function RecurringForm({
  kind,
  initial,
  month,
  onClose,
}: {
  kind: Kind
  initial: RecurringDraft | null
  month: MonthKey
  onClose: () => void
}) {
  const saveFixed = useAppStore((s) => s.saveFixedPayment)
  const saveIncome = useAppStore((s) => s.saveIncomeSource)
  const endRecurring = useAppStore((s) => s.endRecurring)
  const fixedPayments = useAppStore((s) => s.fixedPayments)
  const incomeSources = useAppStore((s) => s.incomeSources)
  const toast = useUiStore((s) => s.toast)

  const [name, setName] = useState(initial?.name ?? '')
  const [amount, setAmount] = useState(initial ? formatNumber(initial.amount) : '')
  const [day, setDay] = useState(initial?.day ?? (kind === 'fixed' ? 31 : 15))
  const [icon, setIcon] = useState<IconName>(initial?.icon ?? (kind === 'fixed' ? 'receipt' : 'wallet'))
  const [color, setColor] = useState<ColorName>(initial?.color ?? (kind === 'fixed' ? 'indigo' : 'emerald'))
  const [error, setError] = useState<string | null>(null)
  const [confirmEnd, setConfirmEnd] = useState(false)

  const save = () => {
    const value = parseAmount(amount)
    if (!name.trim()) return setError('Escribe un nombre.')
    if (value === null || value <= 0) return setError('Escribe un monto mayor a cero.')
    const existing = initial?.id
      ? kind === 'fixed'
        ? fixedPayments.find((p) => p.id === initial.id)
        : incomeSources.find((s) => s.id === initial.id)
      : undefined
    const base = {
      id: initial?.id,
      name: name.trim(),
      amount: value,
      icon,
      color,
      startMonth: existing ? existing.startMonth : month,
      endMonth: existing ? existing.endMonth : null,
    }
    if (kind === 'fixed') saveFixed({ ...base, dueDay: day })
    else saveIncome({ ...base, payDay: day })
    toast(initial?.id ? 'Cambios guardados' : `${name.trim()} agregado`)
    onClose()
  }

  const end = () => {
    if (!initial?.id) return
    endRecurring(kind === 'fixed' ? 'fixedPayments' : 'incomeSources', initial.id, month)
    toast(`${initial.name} ya no se contará desde ${monthLabel(month)}`)
    onClose()
  }

  if (confirmEnd && initial) {
    return (
      <div className="space-y-4">
        <p className="text-[15px] leading-relaxed text-ink-2">
          <strong className="text-ink">{initial.name}</strong> dejará de contarse desde <strong className="text-ink">{monthLabel(month)}</strong> en
          adelante. Los meses anteriores conservan su historial.
        </p>
        <div className="flex gap-2">
          <Button className="flex-1" onClick={() => setConfirmEnd(false)}>
            Cancelar
          </Button>
          <Button variant="danger" className="flex-1" icon={Trash2} onClick={end}>
            Sí, quitar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        save()
      }}
    >
      <Field label="Nombre">
        {(id) => (
          <input
            id={id}
            className="field"
            value={name}
            maxLength={40}
            autoFocus={!initial}
            placeholder={kind === 'fixed' ? 'Ej. Internet, seguro, colegiatura…' : 'Ej. Quincena, renta de cuarto…'}
            onChange={(e) => setName(e.target.value)}
          />
        )}
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Monto mensual">{(id) => <AmountInput id={id} value={amount} onChange={setAmount} />}</Field>
        <Field label={kind === 'fixed' ? 'Se paga el' : 'Se recibe el'}>
          {(id) => (
            <select id={id} className="field" value={day} onChange={(e) => setDay(Number(e.target.value))}>
              {dayOptions.map((d) => (
                <option key={d} value={d}>
                  {dayLabel(d)}
                </option>
              ))}
            </select>
          )}
        </Field>
      </div>
      <IconColorPicker icon={icon} color={color} onIcon={setIcon} onColor={setColor} />
      {isNewHint(initial, month)}
      {error && <p role="alert" className="rounded-xl bg-bad/10 px-3.5 py-2.5 text-sm font-medium text-bad">{error}</p>}
      <SheetActions>
        {initial?.id && <Button variant="danger" size="lg" icon={Trash2} onClick={() => setConfirmEnd(true)} aria-label="Quitar" />}
        <Button type="submit" variant="primary" size="lg" className="flex-1">
          {initial?.id ? 'Guardar cambios' : 'Agregar'}
        </Button>
      </SheetActions>
    </form>
  )
}

function isNewHint(initial: RecurringDraft | null, month: MonthKey) {
  if (initial?.id) {
    return <p className="text-[12.5px] text-ink-3">El nuevo monto aplica a los meses que aún no has marcado; lo ya pagado conserva su monto.</p>
  }
  return <p className="text-[12.5px] text-ink-3">Se contará desde {monthLabel(month)} en adelante.</p>
}

export function IconColorPicker({
  icon,
  color,
  onIcon,
  onColor,
}: {
  icon: IconName
  color: ColorName
  onIcon: (i: IconName) => void
  onColor: (c: ColorName) => void
}) {
  return (
    <div className="space-y-3">
      <div>
        <span className="label">Ícono</span>
        <div className="grid grid-cols-8 gap-1.5">
          {iconNames.map((name) => {
            const Icon = getIcon(name)
            const active = icon === name
            return (
              <button
                key={name}
                type="button"
                aria-label={name}
                aria-pressed={active}
                onClick={() => onIcon(name)}
                className={cx(
                  'inline-flex aspect-square items-center justify-center rounded-lg border transition',
                  active ? 'border-brand-ink bg-brand-soft text-brand-ink' : 'border-transparent text-ink-2 hover:bg-surface-2',
                )}
              >
                <Icon className="size-[18px]" aria-hidden />
              </button>
            )
          })}
        </div>
      </div>
      <div>
        <span className="label">Color</span>
        <div className="flex flex-wrap gap-2">
          {colorNames.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={c}
              aria-pressed={color === c}
              onClick={() => onColor(c)}
              className={cx(
                'size-8 rounded-full ring-offset-2 ring-offset-surface transition',
                colorSwatch[c],
                color === c ? 'ring-2 ring-ink' : 'hover:scale-110',
              )}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

