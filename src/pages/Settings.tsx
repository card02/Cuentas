import { useEffect, useRef, useState } from 'react'
import {
  ChevronRight,
  Download,
  FileSpreadsheet,
  HardDrive,
  Monitor,
  Moon,
  Plus,
  ShieldCheck,
  Sun,
  Tags,
  Trash2,
  Upload,
  Wallet,
} from 'lucide-react'
import { IconColorPicker } from '../components/recurring'
import { toDraft, useRecurringSheets } from '../components/RecurringSheets'
import type { IconName } from '../components/icons'
import { AmountInput, Button, Card, CardHeader, Field, IconBadge, Money, Segmented, Sheet, SheetActions, useConfirm } from '../components/ui'
import { useMonthSummary } from '../hooks/useData'
import { BackupError, createBackup, downloadFile, parseBackup, toCsv } from '../lib/backup'
import { currentMonth, dayLabel, today } from '../lib/dates'
import { formatNumber, parseAmount } from '../lib/money'
import { OTHER_CATEGORY_ID } from '../store/defaults'
import { getData, useAppStore } from '../store/useAppStore'
import { useUiStore } from '../store/useUiStore'
import type { Category, ColorName, ThemePreference } from '../types'

export function Settings() {
  const { confirm, dialog } = useConfirm()
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-4">
        <IncomeSettings />
        <CategorySettings confirm={confirm} />
      </div>
      <div className="space-y-4">
        <AppearanceSettings />
        <DataSettings confirm={confirm} />
        <p className="px-1 text-center text-[12px] text-ink-3">Mis Cuentas · versión {__APP_VERSION__}</p>
      </div>
      {dialog}
    </div>
  )
}

type Confirm = ReturnType<typeof useConfirm>['confirm']

function IncomeSettings() {
  const month = currentMonth()
  const summary = useMonthSummary(month)
  const { openEditor, sheets } = useRecurringSheets(month)
  return (
    <Card>
      <CardHeader
        icon={Wallet}
        title="Salario e ingresos fijos"
        subtitle={
          <>
            Ingreso mensual: <Money value={summary.incomeExpected} className="font-semibold text-ink" />
          </>
        }
        action={
          <Button size="sm" variant="ghost" icon={Plus} onClick={() => openEditor('income')}>
            Agregar
          </Button>
        }
      />
      <ul className="mt-2 divide-y divide-line pb-1">
        {summary.incomeLines.map((l) => (
          <li key={l.source.id}>
            <button
              type="button"
              onClick={() => openEditor('income', toDraft(l))}
              className="flex w-full items-center gap-3 px-5 py-3 text-left transition hover:bg-surface-2"
            >
              <IconBadge icon={l.source.icon} color={l.source.color} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14.5px] font-semibold">{l.source.name}</span>
                <span className="block text-[12.5px] text-ink-3">{dayLabel(l.source.payDay)}</span>
              </span>
              <Money value={l.source.amount} className="text-[14.5px] font-bold" />
              <ChevronRight className="size-4 text-ink-3" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      {sheets}
    </Card>
  )
}

function CategorySettings({ confirm }: { confirm: Confirm }) {
  const categories = useAppStore((s) => s.categories)
  const [editing, setEditing] = useState<Category | 'new' | null>(null)
  return (
    <Card>
      <CardHeader
        icon={Tags}
        title="Categorías y presupuestos"
        subtitle="Define cuánto quieres gastar al mes en cada cosa."
        action={
          <Button size="sm" variant="ghost" icon={Plus} onClick={() => setEditing('new')}>
            Nueva
          </Button>
        }
      />
      <ul className="mt-2 divide-y divide-line pb-1">
        {categories.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => setEditing(c)}
              className="flex w-full items-center gap-3 px-5 py-3 text-left transition hover:bg-surface-2"
            >
              <IconBadge icon={c.icon} color={c.color} />
              <span className="min-w-0 flex-1 truncate text-[14.5px] font-semibold">{c.name}</span>
              {c.budget ? (
                <span className="text-right text-[12.5px] text-ink-3">
                  Presupuesto
                  <Money value={c.budget} className="block text-[14px] font-bold text-ink" />
                </span>
              ) : (
                <span className="text-[12.5px] text-ink-3">Sin presupuesto</span>
              )}
              <ChevronRight className="size-4 text-ink-3" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      <Sheet open={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? 'Nueva categoría' : 'Editar categoría'}>
        {editing !== null && (
          <CategoryForm
            key={editing === 'new' ? 'new' : editing.id}
            initial={editing === 'new' ? null : editing}
            onClose={() => setEditing(null)}
            confirm={confirm}
          />
        )}
      </Sheet>
    </Card>
  )
}

function CategoryForm({ initial, onClose, confirm }: { initial: Category | null; onClose: () => void; confirm: Confirm }) {
  const saveCategory = useAppStore((s) => s.saveCategory)
  const deleteCategory = useAppStore((s) => s.deleteCategory)
  const usage = useAppStore((s) => (initial ? s.transactions.filter((t) => t.categoryId === initial.id).length : 0))
  const toast = useUiStore((s) => s.toast)

  const [name, setName] = useState(initial?.name ?? '')
  const [budget, setBudget] = useState(initial?.budget ? formatNumber(initial.budget) : '')
  const [icon, setIcon] = useState<IconName>(initial?.icon ?? 'package')
  const [color, setColor] = useState<ColorName>(initial?.color ?? 'emerald')
  const [error, setError] = useState<string | null>(null)

  const save = () => {
    if (!name.trim()) return setError('Escribe un nombre.')
    const value = budget.trim() ? parseAmount(budget) : null
    if (budget.trim() && (value === null || value < 0)) return setError('El presupuesto no es válido.')
    saveCategory({ id: initial?.id, name: name.trim(), icon, color, budget: value || null })
    toast(initial ? 'Categoría actualizada' : 'Categoría creada')
    onClose()
  }

  const remove = async () => {
    if (!initial) return
    onClose()
    const ok = await confirm({
      title: `¿Eliminar "${initial.name}"?`,
      text: usage
        ? `Tiene ${usage} ${usage === 1 ? 'gasto registrado' : 'gastos registrados'}; se moverán a la categoría "Otros".`
        : 'Esta categoría no tiene gastos registrados.',
      confirmLabel: 'Eliminar',
      danger: true,
    })
    if (ok) {
      deleteCategory(initial.id, OTHER_CATEGORY_ID)
      toast('Categoría eliminada')
    }
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
        {(id) => <input id={id} className="field" value={name} maxLength={40} autoFocus={!initial} onChange={(e) => setName(e.target.value)} />}
      </Field>
      <Field label="Presupuesto mensual (opcional)" hint="Te avisaremos en el resumen cuando te acerques a este límite.">
        {(id) => <AmountInput id={id} value={budget} onChange={setBudget} placeholder="Sin límite" />}
      </Field>
      <IconColorPicker icon={icon} color={color} onIcon={setIcon} onColor={setColor} />
      {error && <p role="alert" className="rounded-xl bg-bad/10 px-3.5 py-2.5 text-sm font-medium text-bad">{error}</p>}
      <SheetActions>
        {initial && initial.id !== OTHER_CATEGORY_ID && (
          <Button variant="danger" size="lg" icon={Trash2} onClick={remove} aria-label="Eliminar categoría" />
        )}
        <Button type="submit" variant="primary" size="lg" className="flex-1">
          {initial ? 'Guardar cambios' : 'Crear categoría'}
        </Button>
      </SheetActions>
    </form>
  )
}

function AppearanceSettings() {
  const theme = useAppStore((s) => s.settings.theme)
  const update = useAppStore((s) => s.updateSettings)
  return (
    <Card className="p-5">
      <h2 className="mb-3 text-[15px] font-bold tracking-tight">Apariencia</h2>
      <Segmented<ThemePreference>
        label="Tema"
        value={theme}
        onChange={(v) => update({ theme: v })}
        options={[
          { value: 'system', label: 'Automático', icon: Monitor },
          { value: 'light', label: 'Claro', icon: Sun },
          { value: 'dark', label: 'Oscuro', icon: Moon },
        ]}
      />
    </Card>
  )
}

function DataSettings({ confirm }: { confirm: Confirm }) {
  const settings = useAppStore((s) => s.settings)
  const count = useAppStore((s) => s.transactions.length)
  const update = useAppStore((s) => s.updateSettings)
  const replaceData = useAppStore((s) => s.replaceData)
  const resetData = useAppStore((s) => s.resetData)
  const toast = useUiStore((s) => s.toast)
  const fileRef = useRef<HTMLInputElement>(null)
  const [persisted, setPersisted] = useState<boolean | null>(null)

  useEffect(() => {
    navigator.storage?.persisted?.().then(setPersisted).catch(() => setPersisted(null))
  }, [])

  const backup = () => {
    const data = { ...getData(), settings: { ...settings, lastBackupAt: Date.now() } }
    downloadFile(`mis-cuentas-respaldo-${today()}.json`, JSON.stringify(createBackup(data), null, 2), 'application/json')
    update({ lastBackupAt: Date.now() })
    toast('Respaldo descargado')
  }

  const restore = async (file: File) => {
    try {
      const data = parseBackup(await file.text())
      const ok = await confirm({
        title: '¿Restaurar este respaldo?',
        text: `Se reemplazarán los datos actuales de este dispositivo por los del archivo (${data.transactions.length} movimientos).`,
        confirmLabel: 'Restaurar',
        danger: true,
      })
      if (!ok) return
      replaceData(data)
      toast('Respaldo restaurado')
    } catch (e) {
      toast(e instanceof BackupError ? e.message : 'No se pudo leer el archivo.')
    }
  }

  const reset = async () => {
    const ok = await confirm({
      title: '¿Borrar todos los datos?',
      text: 'Se eliminarán todos tus movimientos y pagos registrados en este dispositivo, y se restaurará la configuración inicial. Te recomendamos descargar un respaldo antes.',
      confirmLabel: 'Borrar todo',
      danger: true,
    })
    if (ok) {
      resetData()
      toast('Datos borrados')
    }
  }

  return (
    <Card>
      <CardHeader icon={HardDrive} title="Tus datos" subtitle="Se guardan automáticamente en este navegador." />
      <div className="space-y-3 p-5">
        <div className="flex gap-3 rounded-2xl bg-surface-2 p-3.5 text-[13px] leading-relaxed text-ink-2">
          <ShieldCheck className="mt-0.5 size-[18px] shrink-0 text-brand-ink" aria-hidden />
          <p>
            Nadie más ve tu información: no se envía a ningún servidor. Descarga un respaldo de vez en cuando para no perderla y para
            pasarla a otro dispositivo.
            {persisted && <span className="mt-1 block font-semibold text-good">✓ El navegador protege estos datos contra borrado automático.</span>}
          </p>
        </div>
        <div className="flex items-center justify-between text-[13px] text-ink-3">
          <span>{count} movimientos guardados</span>
          <span>
            Último respaldo:{' '}
            <strong className="text-ink-2">
              {settings.lastBackupAt ? new Date(settings.lastBackupAt).toLocaleDateString('es-GT', { day: 'numeric', month: 'short', year: 'numeric' }) : 'nunca'}
            </strong>
          </span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button variant="primary" icon={Download} onClick={backup}>
            Descargar respaldo
          </Button>
          <Button icon={Upload} onClick={() => fileRef.current?.click()}>
            Restaurar respaldo
          </Button>
          <Button icon={FileSpreadsheet} className="sm:col-span-2" onClick={() => {
            downloadFile(`mis-cuentas-movimientos-${today()}.csv`, toCsv(getData()), 'text/csv;charset=utf-8')
            toast('Archivo para Excel descargado')
          }}>
            Exportar a Excel (CSV)
          </Button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (file) void restore(file)
          }}
        />
        <Field label="Mostrar historial desde" hint="Primer mes que aparece en el Historial.">
          {(id) => (
            <input
              id={id}
              type="month"
              className="field"
              value={settings.startMonth}
              max={currentMonth()}
              onChange={(e) => e.target.value && update({ startMonth: e.target.value })}
            />
          )}
        </Field>
        <div className="border-t border-line pt-3">
          <Button variant="danger" icon={Trash2} className="w-full" onClick={reset}>
            Borrar todos los datos
          </Button>
        </div>
      </div>
    </Card>
  )
}
