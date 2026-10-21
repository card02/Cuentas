import { ArrowUpRight } from 'lucide-react'
import { IconBadge, cx } from './ui'
import { formatQ } from '../lib/money'
import { shortDateLabel } from '../lib/dates'
import { useUiStore } from '../store/useUiStore'
import type { Category, Transaction } from '../types'

export function TransactionRow({
  t,
  category,
  showDate = true,
}: {
  t: Transaction
  category: Category | undefined
  showDate?: boolean
}) {
  const openEdit = useUiStore((s) => s.openEditTransaction)
  const isIncome = t.type === 'income'
  const title = t.note || (isIncome ? 'Ingreso extra' : (category?.name ?? 'Gasto'))
  const subtitle = [isIncome ? 'Ingreso extra' : t.note ? category?.name : null, showDate ? shortDateLabel(t.date) : null]
    .filter(Boolean)
    .join(' · ')

  return (
    <li>
      <button
        type="button"
        onClick={() => openEdit(t)}
        className="flex w-full items-center gap-3 px-5 py-3 text-left transition hover:bg-surface-2"
      >
        {isIncome ? (
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-good/12 text-good">
            <ArrowUpRight className="size-5" aria-hidden />
          </span>
        ) : (
          <IconBadge icon={category?.icon ?? 'package'} color={category?.color ?? 'slate'} />
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14.5px] font-semibold">{title}</span>
          {subtitle && <span className="mt-0.5 block truncate text-[12.5px] text-ink-3">{subtitle}</span>}
        </span>
        <span className={cx('num shrink-0 text-[14.5px] font-bold', isIncome ? 'text-good' : 'text-ink')}>
          {isIncome ? '+' : '−'}
          {formatQ(t.amount)}
        </span>
      </button>
    </li>
  )
}
