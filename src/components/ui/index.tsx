import { useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { CircleAlert, CircleCheck, Clock, X, type LucideIcon } from 'lucide-react'
import { colorClasses, getIcon } from '../icons'
import { formatNumber, formatQ, parseAmount } from '../../lib/money'
import type { ColorName } from '../../types'

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}

/* ---------- Botones ---------- */

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

const variants: Record<Variant, string> = {
  primary: 'bg-brand text-white hover:bg-brand-hover shadow-sm',
  secondary: 'bg-surface-2 text-ink hover:bg-surface-3 border border-line',
  ghost: 'text-ink-2 hover:bg-surface-2 hover:text-ink',
  danger: 'bg-bad/10 text-bad hover:bg-bad/15',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: 'sm' | 'md' | 'lg'
  icon?: LucideIcon
}

export function Button({ variant = 'secondary', size = 'md', icon: Icon, className, children, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      {...rest}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100',
        size === 'sm' && 'h-8 px-3 text-[13px]',
        size === 'md' && 'h-10 px-4 text-sm',
        size === 'lg' && 'h-12 px-5 text-[15px]',
        variants[variant],
        className,
      )}
    >
      {Icon && <Icon className={size === 'sm' ? 'size-4' : 'size-[18px]'} aria-hidden />}
      {children}
    </button>
  )
}

export function IconButton({
  icon: Icon,
  label,
  className,
  ...rest
}: { icon: LucideIcon; label: string } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...rest}
      className={cx(
        'inline-flex size-9 items-center justify-center rounded-xl text-ink-2 transition hover:bg-surface-2 hover:text-ink active:scale-95',
        className,
      )}
    >
      <Icon className="size-[18px]" aria-hidden />
    </button>
  )
}

/* ---------- Superficies ---------- */

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cx('card', className)}>{children}</section>
}

export function CardHeader({
  title,
  subtitle,
  action,
  icon: Icon,
}: {
  title: string
  subtitle?: ReactNode
  action?: ReactNode
  icon?: LucideIcon
}) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 pt-5">
      <div className="flex min-w-0 items-center gap-2.5">
        {Icon && <Icon className="size-[18px] shrink-0 text-brand-ink" aria-hidden />}
        <div className="min-w-0">
          <h2 className="text-[15px] font-bold tracking-tight text-ink">{title}</h2>
          {subtitle && <p className="mt-0.5 text-[13px] text-ink-3">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  )
}

export function IconBadge({ icon, color, size = 'md' }: { icon: string; color: ColorName; size?: 'sm' | 'md' | 'lg' }) {
  const Icon = getIcon(icon)
  return (
    <span
      className={cx(
        'inline-flex shrink-0 items-center justify-center',
        size === 'sm' && 'size-8 rounded-lg',
        size === 'md' && 'size-10 rounded-xl',
        size === 'lg' && 'size-12 rounded-2xl',
        colorClasses[color],
      )}
    >
      <Icon className={size === 'lg' ? 'size-6' : size === 'md' ? 'size-5' : 'size-4'} aria-hidden />
    </span>
  )
}

export function EmptyState({
  icon: Icon,
  title,
  text,
  action,
}: {
  icon: LucideIcon
  title: string
  text?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <span className="mb-3 inline-flex size-12 items-center justify-center rounded-2xl bg-brand-soft text-brand-ink">
        <Icon className="size-6" aria-hidden />
      </span>
      <p className="font-semibold text-ink">{title}</p>
      {text && <p className="mt-1 max-w-xs text-sm text-ink-3">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

/* ---------- Estado ---------- */

export type Status = 'paid' | 'pending' | 'soon' | 'overdue'

const statusStyles: Record<Status, { label: string; icon: LucideIcon; className: string }> = {
  paid: { label: 'Pagado', icon: CircleCheck, className: 'bg-good/10 text-good' },
  pending: { label: 'Pendiente', icon: Clock, className: 'bg-surface-2 text-ink-2' },
  soon: { label: 'Próximo', icon: Clock, className: 'bg-warn/12 text-warn' },
  overdue: { label: 'Vencido', icon: CircleAlert, className: 'bg-bad/10 text-bad' },
}

export function StatusChip({ status, label }: { status: Status; label?: string }) {
  const s = statusStyles[status]
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-semibold', s.className)}>
      <s.icon className="size-3.5" aria-hidden />
      {label ?? s.label}
    </span>
  )
}

/** Barra de avance: la parte llena cambia a advertencia y peligro según el porcentaje. */
export function Meter({
  value,
  max,
  tone = 'auto',
  label,
}: {
  value: number
  max: number
  tone?: 'auto' | 'brand'
  label: string
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  const ratio = max > 0 ? value / max : 0
  const fill =
    tone === 'brand' ? 'bg-brand-ink' : ratio > 1 ? 'bg-bad' : ratio >= 0.85 ? 'bg-warn' : 'bg-brand-ink'
  const track =
    tone === 'brand' ? 'bg-brand-soft' : ratio > 1 ? 'bg-bad/15' : ratio >= 0.85 ? 'bg-warn/15' : 'bg-brand-soft'
  return (
    <div
      className={cx('h-2 w-full overflow-hidden rounded-full', track)}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={Math.round(max * 100) / 100}
      aria-valuenow={Math.round(value * 100) / 100}
    >
      <div className={cx('h-full rounded-full transition-[width] duration-500', fill)} style={{ width: `${pct}%` }} />
    </div>
  )
}

export function Money({ value, className, signed }: { value: number; className?: string; signed?: boolean }) {
  const sign = signed && value > 0 ? '+' : ''
  return <span className={cx('num whitespace-nowrap', className)}>{sign + formatQ(value)}</span>
}

/* ---------- Formularios ---------- */

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: (id: string) => ReactNode }) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      {children(id)}
      {hint && <p className="mt-1.5 text-[12.5px] text-ink-3">{hint}</p>}
    </div>
  )
}

/** Campo de monto en quetzales que acepta comas y puntos. */
export function AmountInput({
  id,
  value,
  onChange,
  autoFocus,
  large,
  placeholder = '0.00',
}: {
  id?: string
  value: string
  onChange: (v: string) => void
  autoFocus?: boolean
  large?: boolean
  placeholder?: string
}) {
  return (
    <div
      className={cx(
        'flex items-center rounded-xl border border-line-strong bg-surface transition focus-within:border-brand-ink focus-within:ring-3 focus-within:ring-brand-soft',
        large ? 'px-4 py-3' : 'px-3.5 py-2.5',
      )}
    >
      <span className={cx('mr-2 font-bold text-ink-3', large ? 'text-2xl' : 'text-[15px]')}>Q</span>
      <input
        id={id}
        inputMode="decimal"
        autoComplete="off"
        autoFocus={autoFocus}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ''))}
        onBlur={() => {
          const n = parseAmount(value)
          if (n !== null) onChange(formatNumber(n))
        }}
        className={cx(
          'num w-full min-w-0 bg-transparent text-ink outline-none placeholder:text-ink-3/60',
          large ? 'text-3xl font-bold tracking-tight' : 'text-[15px]',
        )}
      />
    </div>
  )
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string; icon?: LucideIcon }[]
  label: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-xl bg-surface-2 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[13.5px] font-semibold transition',
            value === o.value ? 'bg-surface text-ink shadow-sm' : 'text-ink-3 hover:text-ink',
          )}
        >
          {o.icon && <o.icon className="size-4" aria-hidden />}
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Botones de acción que quedan visibles al pie de una hoja aunque el formulario sea largo. */
export function SheetActions({ children }: { children: ReactNode }) {
  return (
    <div className="sticky -bottom-5 z-10 -mx-5 -mb-5 flex gap-2 border-t border-line bg-surface px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      {children}
    </div>
  )
}

/* ---------- Hoja / diálogo ---------- */

export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
    >
      {open && (
        <div className="sheet-panel flex max-h-[inherit] flex-col rounded-t-3xl border border-line bg-surface shadow-2xl sm:rounded-3xl">
          <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-line-strong sm:hidden" aria-hidden />
          <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-2 sm:pt-5">
            <div>
              <h2 id={titleId} className="text-lg font-bold tracking-tight">
                {title}
              </h2>
              {description && <p className="mt-0.5 text-sm text-ink-3">{description}</p>}
            </div>
            <IconButton icon={X} label="Cerrar" onClick={onClose} className="-mr-2" />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-2 pb-5">{children}</div>
          {footer && (
            <div className="flex gap-2 border-t border-line px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {footer}
            </div>
          )}
        </div>
      )}
    </dialog>
  )
}

/** Confirmación simple basada en Sheet. */
export function useConfirm() {
  const [state, setState] = useState<{
    title: string
    text: ReactNode
    confirmLabel: string
    danger?: boolean
    resolve: (ok: boolean) => void
  } | null>(null)

  const confirm = (opts: { title: string; text: ReactNode; confirmLabel?: string; danger?: boolean }) =>
    new Promise<boolean>((resolve) => setState({ confirmLabel: 'Confirmar', ...opts, resolve }))

  const close = (ok: boolean) => {
    state?.resolve(ok)
    setState(null)
  }

  const dialog = (
    <Sheet
      open={state !== null}
      onClose={() => close(false)}
      title={state?.title ?? ''}
      footer={
        <>
          <Button className="flex-1" onClick={() => close(false)}>
            Cancelar
          </Button>
          <Button className="flex-1" variant={state?.danger ? 'danger' : 'primary'} onClick={() => close(true)}>
            {state?.confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-[15px] leading-relaxed text-ink-2">{state?.text}</div>
    </Sheet>
  )

  return { confirm, dialog }
}
