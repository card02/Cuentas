import { ArrowRight, CalendarCheck, CircleAlert, CircleCheck, Lightbulb, ListOrdered, PiggyBank, Plus, ShieldCheck, Target, Wallet } from 'lucide-react'
import { IncomeSplitBar, LegendItem, RankedBars, type RankedItem } from '../components/charts'
import { FixedRow, IncomeRow } from '../components/recurring'
import { useRecurringSheets } from '../components/RecurringSheets'
import { TransactionRow } from '../components/TransactionRow'
import { Button, Card, CardHeader, EmptyState, IconBadge, Meter, Money, cx } from '../components/ui'
import { useCategoryMap, useMonthSummary } from '../hooks/useData'
import { navigate } from '../hooks/useRoute'
import { payPlan, type MonthSummary } from '../lib/calc'
import { currentMonth, monthLabel } from '../lib/dates'
import { formatQ } from '../lib/money'
import { useAppStore } from '../store/useAppStore'
import { useUiStore } from '../store/useUiStore'

export function Dashboard() {
  const month = useUiStore((s) => s.month)
  const summary = useMonthSummary(month)
  const { openDetail, sheets } = useRecurringSheets(month)

  return (
    <div className="space-y-4">
      <BackupReminder />
      <Hero summary={summary} />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <IncomeCard summary={summary} onOpen={(id) => openDetail('income', id)} />
          <FixedCard summary={summary} onOpen={(id) => openDetail('fixed', id)} />
        </div>
        <div className="space-y-4">
          <WhereCard summary={summary} />
          <BudgetsCard summary={summary} />
          <RecentCard summary={summary} />
        </div>
      </div>
      {sheets}
    </div>
  )
}

function Hero({ summary }: { summary: MonthSummary }) {
  const isCurrent = summary.month === currentMonth()
  const negative = summary.free < 0
  return (
    <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-[var(--hero-from)] via-[var(--hero-via)] to-[var(--hero-to)] text-white shadow-lg shadow-emerald-950/10">
      <div className="relative px-5 pt-5 pb-4 sm:px-7 sm:pt-7">
        <div aria-hidden className="pointer-events-none absolute -top-16 -right-10 size-56 rounded-full bg-white/8 blur-2xl" />
        <p className="text-[13px] font-medium text-white/80">
          {negative ? 'Te pasaste este mes' : `Te queda libre en ${monthLabel(summary.month).split(' ')[0]?.toLowerCase()}`}
        </p>
        <p className="num mt-1 text-[44px] leading-none font-extrabold tracking-tight sm:text-[52px]">{formatQ(summary.free)}</p>
        <p className="mt-2 text-[13px] text-white/75">
          De <span className="num font-semibold text-white">{formatQ(summary.incomeTotal)}</span> de ingresos, después de pagos fijos y gastos.
        </p>
      </div>
      <div className="grid grid-cols-3 divide-x divide-white/15 border-t border-white/15 bg-black/10">
        <HeroStat label="En mano" value={summary.onHand} hint={isCurrent ? 'Recibido − pagado − gastado' : undefined} />
        <HeroStat label="Reservar" value={summary.reserve} hint={summary.reserve > 0 ? 'Para completar tus pagos fijos' : 'Nada pendiente que cubrir'} />
        <HeroStat label="Puedes gastar" value={Math.max(0, summary.spendable)} hint="Sin afectar tus pagos" strong />
      </div>
    </section>
  )
}

function HeroStat({ label, value, hint, strong }: { label: string; value: number; hint?: string; strong?: boolean }) {
  return (
    <div className="min-w-0 px-3 py-3.5 sm:px-6">
      <p className="truncate text-[11.5px] font-medium text-white/75 sm:text-[12.5px]">{label}</p>
      <p className={cx('num mt-0.5 truncate font-bold tracking-tight', strong ? 'text-[17px] sm:text-xl' : 'text-[15px] sm:text-lg')}>
        {formatQ(value)}
      </p>
      {hint && <p className="mt-0.5 hidden truncate text-[11.5px] text-white/60 sm:block">{hint}</p>}
    </div>
  )
}

function SplitCard({ summary }: { summary: MonthSummary }) {
  const base = summary.incomeTotal
  const pct = (v: number) => (base > 0 ? `${Math.round((v / base) * 100)}%` : '')
  return (
    <div className="px-5 pb-5">
      <IncomeSplitBar fixed={summary.fixedTotal} spend={summary.expensesTotal} free={summary.free} />
      <div className="mt-3 grid gap-1.5">
        <LegendItem k="fixed" value={formatQ(summary.fixedTotal)} extra={<span className="w-9 text-right text-[12px] text-ink-3">{pct(summary.fixedTotal)}</span>} />
        <LegendItem k="spend" value={formatQ(summary.expensesTotal)} extra={<span className="w-9 text-right text-[12px] text-ink-3">{pct(summary.expensesTotal)}</span>} />
        <LegendItem k="free" value={formatQ(Math.max(0, summary.free))} extra={<span className="w-9 text-right text-[12px] text-ink-3">{pct(Math.max(0, summary.free))}</span>} />
      </div>
    </div>
  )
}

function IncomeCard({ summary, onOpen }: { summary: MonthSummary; onOpen: (id: string) => void }) {
  const plan = payPlan(summary)
  const openNew = useUiStore((s) => s.openNewTransaction)
  return (
    <Card>
      <CardHeader
        icon={Wallet}
        title="Ingresos del mes"
        subtitle={
          <>
            Recibido <Money value={summary.incomeReceived + summary.extraIncome} className="font-semibold text-ink" /> de{' '}
            <Money value={summary.incomeTotal} />
          </>
        }
        action={
          <Button size="sm" variant="ghost" icon={Plus} onClick={() => openNew('income')}>
            Extra
          </Button>
        }
      />
      <ul className="mt-2 divide-y divide-line">
        {summary.incomeLines.map((l) => (
          <IncomeRow key={l.source.id} line={l} month={summary.month} onOpen={() => onOpen(l.source.id)} />
        ))}
        {summary.extraIncome > 0 && (
          <li className="flex items-center justify-between px-5 py-3 text-[14px]">
            <span className="text-ink-2">Ingresos extra</span>
            <Money value={summary.extraIncome} signed className="font-bold text-good" />
          </li>
        )}
      </ul>
      {plan && (
        <div className="m-4 mt-1 flex gap-3 rounded-2xl bg-brand-soft p-3.5 text-[13px] leading-relaxed text-ink-2">
          <Lightbulb className="mt-0.5 size-[18px] shrink-0 text-brand-ink" aria-hidden />
          {plan.reserveFromEarlier > 0 ? (
            <p>
              Tus pagos de fin de mes suman <strong className="num text-ink">{formatQ(plan.fixedAfter)}</strong> y tu {plan.lastIncome.source.name} es de{' '}
              <strong className="num text-ink">{formatQ(plan.lastIncome.amount)}</strong>. Guarda{' '}
              <strong className="num text-ink">{formatQ(plan.reserveFromEarlier)}</strong> de la quincena anterior para completarlos.
            </p>
          ) : (
            <p>
              Tu {plan.lastIncome.source.name} cubre tus pagos de fin de mes (<strong className="num text-ink">{formatQ(plan.fixedAfter)}</strong>) y te sobran{' '}
              <strong className="num text-ink">{formatQ(plan.leftoverFromLast)}</strong>.
            </p>
          )}
        </div>
      )}
    </Card>
  )
}

function FixedCard({ summary, onOpen }: { summary: MonthSummary; onOpen: (id: string) => void }) {
  const allPaid = summary.fixedLines.length > 0 && summary.fixedPending === 0
  return (
    <Card>
      <CardHeader
        icon={CalendarCheck}
        title="Pagos fijos"
        subtitle={
          allPaid ? (
            <span className="inline-flex items-center gap-1 font-semibold text-good">
              <CircleCheck className="size-3.5" aria-hidden /> Todo pagado este mes
            </span>
          ) : (
            <>
              Pagado <Money value={summary.fixedPaid} className="font-semibold text-ink" /> de <Money value={summary.fixedTotal} />
            </>
          )
        }
        action={
          <Button size="sm" variant="ghost" onClick={() => navigate('pagos')}>
            Ver <ArrowRight className="size-4" aria-hidden />
          </Button>
        }
      />
      <div className="px-5 pt-3">
        <Meter value={summary.fixedPaid} max={summary.fixedTotal} tone="brand" label="Avance de pagos fijos" />
      </div>
      {summary.fixedLines.length ? (
        <ul className="mt-2 divide-y divide-line pb-1">
          {summary.fixedLines.map((l) => (
            <FixedRow key={l.payment.id} line={l} month={summary.month} onOpen={() => onOpen(l.payment.id)} />
          ))}
        </ul>
      ) : (
        <EmptyState icon={CalendarCheck} title="Sin pagos fijos" text="Agrega tu renta, préstamos o servicios en Pagos fijos." />
      )}
    </Card>
  )
}

function WhereCard({ summary }: { summary: MonthSummary }) {
  const items: RankedItem[] = [
    ...summary.fixedLines.map((l) => ({
      id: `f-${l.payment.id}`,
      label: l.payment.name,
      icon: <IconBadge icon={l.payment.icon} color={l.payment.color} size="sm" />,
      value: l.amount,
      k: 'fixed' as const,
    })),
    ...summary.byCategory
      .filter((c) => c.total > 0)
      .map((c) => ({
        id: `c-${c.category.id}`,
        label: c.category.name,
        icon: <IconBadge icon={c.category.icon} color={c.category.color} size="sm" />,
        value: c.total,
        k: 'spend' as const,
        sub: `${c.count} ${c.count === 1 ? 'gasto' : 'gastos'}`,
      })),
  ].sort((a, b) => b.value - a.value)

  return (
    <Card>
      <CardHeader icon={PiggyBank} title="¿En qué se va tu dinero?" subtitle="Porcentaje de tus ingresos del mes" />
      <div className="mt-4">
        <SplitCard summary={summary} />
      </div>
      <div className="border-t border-line px-5 py-5">
        <div className="mb-4 flex gap-4">
          <LegendItem k="fixed" />
          <LegendItem k="spend" />
        </div>
        <RankedBars items={items} base={summary.incomeTotal} />
      </div>
    </Card>
  )
}

function BudgetsCard({ summary }: { summary: MonthSummary }) {
  const withBudget = summary.byCategory.filter((c) => c.category.budget !== null && c.category.budget > 0)
  if (!withBudget.length) {
    return (
      <Card className="flex items-center gap-4 p-5">
        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand-ink">
          <Target className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14.5px] font-bold">Ponte un presupuesto</p>
          <p className="text-[13px] text-ink-3">Por ejemplo, cuánto quieres gastar en gasolina al mes.</p>
        </div>
        <Button size="sm" onClick={() => navigate('ajustes')}>
          Definir
        </Button>
      </Card>
    )
  }
  return (
    <Card>
      <CardHeader icon={Target} title="Presupuestos" subtitle="Gasto del mes contra tu límite" />
      <ul className="space-y-4 px-5 pt-4 pb-5">
        {withBudget.map(({ category, total }) => {
          const budget = category.budget ?? 0
          const left = budget - total
          const over = left < 0
          return (
            <li key={category.id}>
              <div className="mb-1.5 flex items-center gap-2.5">
                <IconBadge icon={category.icon} color={category.color} size="sm" />
                <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">{category.name}</span>
                <span className="num text-[13px] text-ink-2">
                  <span className="font-semibold text-ink">{formatQ(total)}</span> / {formatQ(budget)}
                </span>
              </div>
              <Meter value={total} max={budget} label={`Presupuesto de ${category.name}`} />
              <p className={cx('mt-1 flex items-center gap-1 text-[12.5px] font-medium', over ? 'text-bad' : 'text-ink-3')}>
                {over ? (
                  <>
                    <CircleAlert className="size-3.5" aria-hidden /> Te pasaste por {formatQ(-left)}
                  </>
                ) : (
                  <>Te quedan {formatQ(left)}</>
                )}
              </p>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

function RecentCard({ summary }: { summary: MonthSummary }) {
  const categories = useCategoryMap()
  const openNew = useUiStore((s) => s.openNewTransaction)
  const recent = summary.transactions.slice(0, 5)
  return (
    <Card>
      <CardHeader
        icon={ListOrdered}
        title="Últimos movimientos"
        subtitle={`${summary.transactions.length} en ${monthLabel(summary.month).toLowerCase()}`}
        action={
          summary.transactions.length > 0 && (
            <Button size="sm" variant="ghost" onClick={() => navigate('movimientos')}>
              Ver todos <ArrowRight className="size-4" aria-hidden />
            </Button>
          )
        }
      />
      {recent.length ? (
        <ul className="mt-2 divide-y divide-line pb-1">
          {recent.map((t) => (
            <TransactionRow key={t.id} t={t} category={t.categoryId ? categories.get(t.categoryId) : undefined} />
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={ListOrdered}
          title="Aún no hay gastos este mes"
          text="Registra la gasolina, comida y todo lo que pagues para saber en qué se va tu dinero."
          action={
            <Button variant="primary" icon={Plus} onClick={() => openNew('expense')}>
              Registrar gasto
            </Button>
          }
        />
      )}
    </Card>
  )
}

function BackupReminder() {
  const count = useAppStore((s) => s.transactions.length)
  const last = useAppStore((s) => s.settings.lastBackupAt)
  const stale = last === null || Date.now() - last > 30 * 86_400_000
  if (count < 10 || !stale) return null
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 shadow-card">
      <ShieldCheck className="size-5 shrink-0 text-brand-ink" aria-hidden />
      <p className="flex-1 text-[13.5px] text-ink-2">
        {last === null ? 'Aún no has hecho un respaldo de tus datos.' : 'Tu último respaldo tiene más de un mes.'} Descárgalo para no perder nada.
      </p>
      <Button size="sm" onClick={() => navigate('ajustes')}>
        Respaldar
      </Button>
    </div>
  )
}
