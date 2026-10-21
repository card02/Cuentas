import { useState } from 'react'
import { useMonthSummary } from '../hooks/useData'
import type { FixedLine, IncomeLine } from '../lib/calc'
import type { MonthKey } from '../types'
import { RecordSheet, RecurringEditor, type RecurringDraft } from './recurring'

type Kind = 'fixed' | 'income'

export function toDraft(line: FixedLine | IncomeLine): RecurringDraft {
  if ('payment' in line) {
    const p = line.payment
    return { id: p.id, name: p.name, amount: p.amount, icon: p.icon, color: p.color, day: p.dueDay }
  }
  const s = line.source
  return { id: s.id, name: s.name, amount: s.amount, icon: s.icon, color: s.color, day: s.payDay }
}

/** Hojas para ver/ajustar un pago del mes y para crear o editar pagos fijos e ingresos. */
export function useRecurringSheets(month: MonthKey) {
  const summary = useMonthSummary(month)
  const [detail, setDetail] = useState<{ kind: Kind; id: string } | null>(null)
  const [editor, setEditor] = useState<{ kind: Kind; initial: RecurringDraft | null } | null>(null)

  const line: FixedLine | IncomeLine | null = detail
    ? ((detail.kind === 'fixed'
        ? summary.fixedLines.find((l) => l.payment.id === detail.id)
        : summary.incomeLines.find((l) => l.source.id === detail.id)) ?? null)
    : null

  const sheets = (
    <>
      <RecordSheet
        kind={detail?.kind ?? 'fixed'}
        line={line}
        month={month}
        onClose={() => setDetail(null)}
        onEditTemplate={() => {
          if (!detail || !line) return
          setDetail(null)
          setEditor({ kind: detail.kind, initial: toDraft(line) })
        }}
      />
      <RecurringEditor
        kind={editor?.kind ?? 'fixed'}
        open={editor !== null}
        initial={editor?.initial ?? null}
        month={month}
        onClose={() => setEditor(null)}
      />
    </>
  )

  return {
    openDetail: (kind: Kind, id: string) => setDetail({ kind, id }),
    openEditor: (kind: Kind, initial: RecurringDraft | null = null) => setEditor({ kind, initial }),
    sheets,
  }
}
