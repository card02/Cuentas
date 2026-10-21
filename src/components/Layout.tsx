import type { ReactNode } from 'react'
import {
  CalendarCheck,
  ChartColumn,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  ListOrdered,
  Plus,
  Settings,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import type { Route } from '../hooks/useRoute'
import { useMonthSummary } from '../hooks/useData'
import { currentMonth, monthLabel } from '../lib/dates'
import { formatQ } from '../lib/money'
import { useUiStore } from '../store/useUiStore'
import { cx, IconButton } from './ui'

const nav: { route: Route; label: string; short: string; icon: LucideIcon }[] = [
  { route: 'resumen', label: 'Resumen', short: 'Resumen', icon: LayoutDashboard },
  { route: 'movimientos', label: 'Movimientos', short: 'Movimientos', icon: ListOrdered },
  { route: 'pagos', label: 'Pagos fijos', short: 'Pagos', icon: CalendarCheck },
  { route: 'historial', label: 'Historial', short: 'Historial', icon: ChartColumn },
  { route: 'ajustes', label: 'Ajustes', short: 'Ajustes', icon: Settings },
]

const titles: Record<Route, string> = {
  resumen: 'Resumen',
  movimientos: 'Movimientos',
  pagos: 'Pagos fijos',
  historial: 'Historial',
  ajustes: 'Ajustes',
}

const monthScoped: Route[] = ['resumen', 'movimientos', 'pagos']

function Logo({ compact }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="inline-flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-sm">
        <Wallet className="size-5" aria-hidden />
      </span>
      <div className={cx('leading-tight', compact && 'max-[430px]:hidden')}>
        <p className="text-[15px] font-extrabold tracking-tight">Mis Cuentas</p>
        <p className="text-[11.5px] text-ink-3">Quetzales · GTQ</p>
      </div>
    </div>
  )
}

export function MonthPicker() {
  const month = useUiStore((s) => s.month)
  const shift = useUiStore((s) => s.shiftMonth)
  const setMonth = useUiStore((s) => s.setMonth)
  const isCurrent = month === currentMonth()
  return (
    <div className="flex items-center gap-1 rounded-2xl border border-line bg-surface p-1 shadow-card">
      <IconButton icon={ChevronLeft} label="Mes anterior" onClick={() => shift(-1)} className="size-8" />
      <button
        type="button"
        onClick={() => setMonth(currentMonth())}
        className="min-w-[8.5rem] rounded-lg px-1 text-center text-sm font-bold tracking-tight"
        title={isCurrent ? 'Mes actual' : 'Volver al mes actual'}
      >
        {monthLabel(month)}
        {!isCurrent && <span className="block text-[10.5px] font-semibold text-brand-ink">Volver a hoy</span>}
      </button>
      <IconButton icon={ChevronRight} label="Mes siguiente" onClick={() => shift(1)} className="size-8" />
    </div>
  )
}

function SidebarSummary() {
  const summary = useMonthSummary(currentMonth())
  return (
    <div className="rounded-2xl bg-gradient-to-br from-[var(--hero-from)] via-[var(--hero-via)] to-[var(--hero-to)] p-4 text-white">
      <p className="text-[12px] font-medium text-white/75">Libre este mes</p>
      <p className="num mt-0.5 text-xl font-extrabold tracking-tight">{formatQ(summary.free)}</p>
      <p className="mt-1 text-[11.5px] text-white/70">{monthLabel(summary.month)}</p>
    </div>
  )
}

export function Layout({ route, children }: { route: Route; children: ReactNode }) {
  const openNew = useUiStore((s) => s.openNewTransaction)
  const showMonth = monthScoped.includes(route)

  return (
    <div className="min-h-dvh lg:flex">
      {/* Barra lateral (escritorio) */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-6 border-r border-line bg-surface px-4 py-6 lg:flex">
        <div className="px-2">
          <Logo />
        </div>
        <nav aria-label="Secciones" className="flex flex-col gap-1">
          {nav.map((n) => (
            <a
              key={n.route}
              href={`#/${n.route}`}
              aria-current={route === n.route ? 'page' : undefined}
              className={cx(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition',
                route === n.route ? 'bg-brand-soft text-brand-ink' : 'text-ink-2 hover:bg-surface-2 hover:text-ink',
              )}
            >
              <n.icon className="size-[18px]" aria-hidden />
              {n.label}
            </a>
          ))}
        </nav>
        <button
          type="button"
          onClick={() => openNew('expense')}
          className="flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-brand-hover active:scale-[0.98]"
        >
          <Plus className="size-[18px]" aria-hidden /> Registrar gasto
        </button>
        <div className="mt-auto">
          <SidebarSummary />
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 border-b border-line bg-bg/85 backdrop-blur-md lg:border-0 lg:bg-transparent lg:backdrop-blur-none">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 sm:px-6 lg:px-8 lg:pt-7">
            <div className="lg:hidden">
              <Logo compact={showMonth} />
            </div>
            <h1 className="hidden text-2xl font-extrabold tracking-tight lg:block">{titles[route]}</h1>
            {showMonth && <MonthPicker />}
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-4 pt-3 pb-32 sm:px-6 lg:px-8 lg:pb-12">
          <h1 className="mb-4 text-[22px] font-extrabold tracking-tight lg:hidden">{titles[route]}</h1>
          {children}
        </main>
      </div>

      {/* Botón flotante (celular) */}
      <button
        type="button"
        onClick={() => openNew('expense')}
        aria-label="Registrar gasto"
        className="fixed right-4 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-30 inline-flex size-14 items-center justify-center rounded-2xl bg-brand text-white shadow-lg shadow-emerald-900/25 transition hover:bg-brand-hover active:scale-95 lg:hidden"
      >
        <Plus className="size-7" aria-hidden />
      </button>

      {/* Navegación inferior (celular) */}
      <nav
        aria-label="Secciones"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/92 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
      >
        <div className="mx-auto flex max-w-lg">
          {nav.map((n) => {
            const active = route === n.route
            return (
              <a
                key={n.route}
                href={`#/${n.route}`}
                aria-current={active ? 'page' : undefined}
                className={cx(
                  'flex flex-1 flex-col items-center gap-1 pt-2.5 pb-2 text-[10.5px] font-semibold transition',
                  active ? 'text-brand-ink' : 'text-ink-3',
                )}
              >
                <span className={cx('inline-flex h-7 w-12 items-center justify-center rounded-full transition', active && 'bg-brand-soft')}>
                  <n.icon className="size-5" aria-hidden />
                </span>
                {n.short}
              </a>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
