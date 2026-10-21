import { useState } from 'react'
import { ArrowDownRight, ArrowUpRight, Trash2 } from 'lucide-react'
import { AmountInput, Button, Field, Segmented, Sheet, SheetActions, cx } from './ui'
import { getIcon, colorClasses } from './icons'
import { defaultDateFor, monthLabel, monthOf } from '../lib/dates'
import { formatNumber, formatQ, parseAmount } from '../lib/money'
import { useAppStore } from '../store/useAppStore'
import { useUiStore } from '../store/useUiStore'
import type { Transaction, TransactionType } from '../types'

export function TransactionSheet() {
  const sheet = useUiStore((s) => s.transactionSheet)
  const close = useUiStore((s) => s.closeTransactionSheet)
  const editing = sheet?.mode === 'edit' ? sheet.transaction : null

  return (
    <Sheet
      open={sheet !== null}
      onClose={close}
      title={editing ? (editing.type === 'income' ? 'Editar ingreso' : 'Editar gasto') : 'Nuevo movimiento'}
    >
      {sheet && (
        <TransactionForm
          key={editing?.id ?? 'new'}
          initial={editing}
          initialType={sheet.mode === 'new' ? sheet.type : (editing?.type ?? 'expense')}
          onDone={close}
        />
      )}
    </Sheet>
  )
}

function TransactionForm({
  initial,
  initialType,
  onDone,
}: {
  initial: Transaction | null
  initialType: TransactionType
  onDone: () => void
}) {
  const categories = useAppStore((s) => s.categories)
  const addTransaction = useAppStore((s) => s.addTransaction)
  const updateTransaction = useAppStore((s) => s.updateTransaction)
  const deleteTransaction = useAppStore((s) => s.deleteTransaction)
  const restoreTransaction = useAppStore((s) => s.restoreTransaction)
  const month = useUiStore((s) => s.month)
  const setMonth = useUiStore((s) => s.setMonth)
  const toast = useUiStore((s) => s.toast)

  const [type, setType] = useState<TransactionType>(initialType)
  const [amount, setAmount] = useState(initial ? formatNumber(initial.amount) : '')
  const [categoryId, setCategoryId] = useState<string | null>(initial?.categoryId ?? null)
  const [date, setDate] = useState(initial?.date ?? defaultDateFor(month))
  const [note, setNote] = useState(initial?.note ?? '')
  const [error, setError] = useState<string | null>(null)

  const save = () => {
    const value = parseAmount(amount)
    if (value === null || value <= 0) return setError('Escribe un monto mayor a cero.')
    if (type === 'expense' && !categoryId) return setError('Elige una categoría.')
    if (!date) return setError('Elige la fecha.')

    const payload = {
      type,
      amount: value,
      date,
      categoryId: type === 'expense' ? categoryId : null,
      note: note.trim(),
    }
    if (initial) {
      updateTransaction(initial.id, payload)
      toast('Cambios guardados')
    } else {
      addTransaction(payload)
      toast(type === 'expense' ? `Gasto de ${formatQ(value)} guardado` : `Ingreso de ${formatQ(value)} guardado`)
    }
    // Si la fecha cae en otro mes, se muestra ese mes para que se vea el registro.
    if (monthOf(date) !== month) setMonth(monthOf(date))
    onDone()
  }

  const remove = () => {
    if (!initial) return
    const removed = deleteTransaction(initial.id)
    onDone()
    if (removed) toast('Movimiento eliminado', { label: 'Deshacer', run: () => restoreTransaction(removed) })
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault()
        save()
      }}
    >
      <Segmented
        label="Tipo de movimiento"
        value={type}
        onChange={(v) => {
          setType(v)
          setError(null)
        }}
        options={[
          { value: 'expense', label: 'Gasto', icon: ArrowDownRight },
          { value: 'income', label: 'Ingreso extra', icon: ArrowUpRight },
        ]}
      />

      <Field label="Monto">
        {(id) => (
          <AmountInput
            id={id}
            large
            autoFocus={!initial}
            value={amount}
            onChange={(v) => {
              setAmount(v)
              setError(null)
            }}
          />
        )}
      </Field>

      {type === 'expense' && (
        <div>
          <span className="label" id="cat-label">
            Categoría
          </span>
          <div role="radiogroup" aria-labelledby="cat-label" className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {categories.map((c) => {
              const Icon = getIcon(c.icon)
              const active = categoryId === c.id
              return (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => {
                    setCategoryId(c.id)
                    setError(null)
                  }}
                  className={cx(
                    'flex flex-col items-center gap-1.5 rounded-xl border px-1.5 py-2.5 text-center transition',
                    active ? 'border-brand-ink bg-brand-soft ring-1 ring-brand-ink' : 'border-line hover:bg-surface-2',
                  )}
                >
                  <span className={cx('inline-flex size-8 items-center justify-center rounded-lg', colorClasses[c.color])}>
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span className="line-clamp-2 text-[11.5px] leading-tight font-semibold text-ink-2">{c.name}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Fecha" hint={monthOf(date) !== month && date ? `Se guardará en ${monthLabel(monthOf(date))}.` : undefined}>
          {(id) => <input id={id} type="date" className="field" value={date} onChange={(e) => setDate(e.target.value)} />}
        </Field>
        <Field label="Descripción (opcional)">
          {(id) => (
            <input
              id={id}
              className="field"
              placeholder={type === 'expense' ? 'Ej. Gasolina, almuerzo…' : 'Ej. Bono, venta…'}
              value={note}
              maxLength={120}
              onChange={(e) => setNote(e.target.value)}
            />
          )}
        </Field>
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-bad/10 px-3.5 py-2.5 text-sm font-medium text-bad">
          {error}
        </p>
      )}

      <SheetActions>
        {initial && <Button variant="danger" size="lg" icon={Trash2} onClick={remove} aria-label="Eliminar movimiento" />}
        <Button type="submit" variant="primary" size="lg" className="flex-1">
          {initial ? 'Guardar cambios' : type === 'expense' ? 'Guardar gasto' : 'Guardar ingreso'}
        </Button>
      </SheetActions>
    </form>
  )
}
