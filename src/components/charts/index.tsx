import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { formatCompactQ, formatQ } from '../../lib/money'
import { cx } from '../ui'

/** Las tres series de la app; el mismo color significa lo mismo en todas las gráficas. */
export const series = {
  fixed: { label: 'Pagos fijos', color: 'var(--series-fixed)' },
  spend: { label: 'Gastos', color: 'var(--series-spend)' },
  free: { label: 'Libre', color: 'var(--series-free)' },
} as const
export type SeriesKey = keyof typeof series

export function LegendItem({ k, value, extra }: { k: SeriesKey; value?: ReactNode; extra?: ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: series[k].color }} aria-hidden />
      <span className="text-[13px] text-ink-2">{series[k].label}</span>
      {value !== undefined && <span className="num ml-auto pl-2 text-[13px] font-semibold text-ink">{value}</span>}
      {extra}
    </div>
  )
}

function Tip({ children, style }: { children: ReactNode; style: CSSProperties }) {
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-10 min-w-36 -translate-x-1/2 -translate-y-full rounded-xl border border-line bg-surface px-3 py-2 text-[12.5px] shadow-lg"
      style={style}
    >
      {children}
    </div>
  )
}

function TipRow({ k, value }: { k: SeriesKey; value: number }) {
  return (
    <div className="flex items-center gap-2 py-0.5">
      <span className="size-2 rounded-[2px]" style={{ background: series[k].color }} aria-hidden />
      <span className="text-ink-2">{series[k].label}</span>
      <span className="num ml-auto pl-3 font-semibold text-ink">{formatQ(value)}</span>
    </div>
  )
}

/* ---------- Barra apilada horizontal: a dónde va el ingreso del mes ---------- */

export function IncomeSplitBar({ fixed, spend, free }: { fixed: number; spend: number; free: number }) {
  const [hover, setHover] = useState<{ k: SeriesKey; x: number } | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const parts: { k: SeriesKey; value: number }[] = [
    { k: 'fixed' as const, value: fixed },
    { k: 'spend' as const, value: spend },
    { k: 'free' as const, value: Math.max(0, free) },
  ].filter((p) => p.value > 0)
  const total = parts.reduce((a, p) => a + p.value, 0)

  if (total === 0) return <div className="h-4 rounded-r-[4px] bg-surface-3" aria-hidden />

  return (
    <div ref={ref} className="relative" onPointerLeave={() => setHover(null)}>
      <div className="flex h-4 gap-[2px]" role="img" aria-label={parts.map((p) => `${series[p.k].label}: ${formatQ(p.value)}`).join(', ')}>
        {parts.map((p, i) => (
          <div
            key={p.k}
            className={cx('h-full transition-opacity', i === parts.length - 1 && 'rounded-r-[4px]', hover && hover.k !== p.k && 'opacity-50')}
            style={{ width: `${(p.value / total) * 100}%`, background: series[p.k].color, minWidth: 3 }}
            onPointerMove={(e) => {
              const box = ref.current?.getBoundingClientRect()
              if (box) setHover({ k: p.k, x: e.clientX - box.left })
            }}
          />
        ))}
      </div>
      {hover && (
        <Tip style={{ left: hover.x, top: -6 }}>
          <TipRow k={hover.k} value={parts.find((p) => p.k === hover.k)?.value ?? 0} />
          <div className="text-ink-3">{Math.round(((parts.find((p) => p.k === hover.k)?.value ?? 0) / total) * 100)}% del total</div>
        </Tip>
      )}
    </div>
  )
}

/* ---------- Barras ordenadas: en qué se va el dinero ---------- */

export interface RankedItem {
  id: string
  label: string
  icon: ReactNode
  value: number
  k: SeriesKey
  sub?: string
}

export function RankedBars({ items, base }: { items: RankedItem[]; base: number }) {
  const max = Math.max(...items.map((i) => i.value), 1)
  return (
    <ul className="space-y-3.5">
      {items.map((item) => (
        <li key={item.id} className="flex items-center gap-3">
          {item.icon}
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-3">
              <span className="truncate text-[13.5px] font-semibold text-ink">{item.label}</span>
              <span className="num shrink-0 text-[13.5px] font-semibold text-ink">{formatQ(item.value)}</span>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <div className="h-2 flex-1">
                <div
                  className="h-full rounded-r-[4px]"
                  style={{ width: `${Math.max(1.5, (item.value / max) * 100)}%`, background: series[item.k].color }}
                />
              </div>
              <span className="num w-10 shrink-0 text-right text-[12px] text-ink-3">
                {base > 0 ? `${Math.round((item.value / base) * 100)}%` : '—'}
              </span>
            </div>
            {item.sub && <p className="mt-0.5 text-[12px] text-ink-3">{item.sub}</p>}
          </div>
        </li>
      ))}
    </ul>
  )
}

/* ---------- Columnas apiladas por mes ---------- */

export interface MonthColumn {
  key: string
  label: string
  fullLabel: string
  fixed: number
  spend: number
  free: number
  income: number
}

function niceStep(max: number, ticks = 4): number {
  const raw = max / ticks
  const mag = 10 ** Math.floor(Math.log10(raw || 1))
  const norm = raw / mag
  return (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag
}

/** Rectángulo con esquinas superiores redondeadas (extremo del dato) y base recta. */
function topRounded(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.min(r, h, w / 2)
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`
}

export function MonthlyColumns({ data, onSelect }: { data: MonthColumn[]; onSelect?: (key: string) => void }) {
  const wrap = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(600)
  const [hover, setHover] = useState<number | null>(null)

  useLayoutEffect(() => {
    const el = wrap.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => entry && setWidth(entry.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const height = 220
  const pad = { top: 12, right: 4, bottom: 26, left: 44 }
  const innerW = Math.max(0, width - pad.left - pad.right)
  const innerH = height - pad.top - pad.bottom
  const maxValue = Math.max(1, ...data.map((d) => Math.max(d.income, d.fixed + d.spend)))
  const step = niceStep(maxValue)
  const top = Math.ceil(maxValue / step) * step
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step)
  const band = data.length ? innerW / data.length : innerW
  const barW = Math.min(24, Math.max(8, band * 0.55))
  const y = (v: number) => pad.top + innerH - (v / top) * innerH
  const hovered = hover !== null ? data[hover] : undefined

  return (
    <div ref={wrap} className="relative w-full select-none" onPointerLeave={() => setHover(null)}>
      <svg width={width} height={height} role="img" aria-label="Ingresos del mes divididos en pagos fijos, gastos y dinero libre">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} stroke={t === 0 ? 'var(--axis)' : 'var(--grid)'} strokeWidth={1} />
            <text x={pad.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="num fill-ink-3 text-[11px]">
              {t === 0 ? '0' : formatCompactQ(t)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const cx0 = pad.left + band * i + band / 2
          const x = cx0 - barW / 2
          const segs = [
            { k: 'fixed' as const, v: d.fixed },
            { k: 'spend' as const, v: d.spend },
            { k: 'free' as const, v: Math.max(0, d.free) },
          ].filter((s) => s.v > 0)
          let acc = 0
          const dim = hover !== null && hover !== i
          return (
            <g key={d.key} opacity={dim ? 0.45 : 1} style={{ transition: 'opacity .15s' }}>
              {segs.map((s, si) => {
                const y0 = y(acc)
                acc += s.v
                const y1 = y(acc)
                const gap = si > 0 ? 2 : 0
                const h = Math.max(0, y0 - y1 - gap)
                const isTop = si === segs.length - 1
                return isTop ? (
                  <path key={s.k} d={topRounded(x, y1, barW, h, 4)} fill={series[s.k].color} />
                ) : (
                  <rect key={s.k} x={x} y={y1} width={barW} height={h} fill={series[s.k].color} />
                )
              })}
              {d.free < 0 && (
                <text x={cx0} y={y(d.fixed + d.spend) - 6} textAnchor="middle" className="fill-bad text-[11px] font-bold">
                  !
                </text>
              )}
              <text x={cx0} y={height - 8} textAnchor="middle" className={cx('text-[11px]', hover === i ? 'fill-ink font-semibold' : 'fill-ink-3')}>
                {d.label}
              </text>
              <rect
                x={pad.left + band * i}
                y={pad.top}
                width={band}
                height={innerH + pad.bottom}
                fill="transparent"
                onPointerEnter={() => setHover(i)}
                onPointerDown={() => setHover(i)}
                onClick={() => onSelect?.(d.key)}
                style={{ cursor: onSelect ? 'pointer' : 'default' }}
              />
            </g>
          )
        })}
      </svg>
      {hovered && hover !== null && (
        <Tip style={{ left: Math.min(Math.max(pad.left + band * hover + band / 2, 90), width - 90), top: y(Math.max(hovered.income, hovered.fixed + hovered.spend)) - 6 }}>
          <div className="mb-1 font-semibold text-ink">{hovered.fullLabel}</div>
          <TipRow k="fixed" value={hovered.fixed} />
          <TipRow k="spend" value={hovered.spend} />
          {hovered.free >= 0 ? (
            <TipRow k="free" value={hovered.free} />
          ) : (
            <div className="flex items-center gap-2 py-0.5 font-semibold text-bad">
              Déficit <span className="num ml-auto">{formatQ(hovered.free)}</span>
            </div>
          )}
          <div className="mt-1 flex border-t border-line pt-1 text-ink-3">
            Ingresos <span className="num ml-auto pl-3 font-semibold text-ink">{formatQ(hovered.income)}</span>
          </div>
        </Tip>
      )}
    </div>
  )
}
