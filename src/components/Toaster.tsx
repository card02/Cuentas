import { useUiStore } from '../store/useUiStore'

export function Toaster() {
  const toasts = useUiStore((s) => s.toasts)
  const dismiss = useUiStore((s) => s.dismissToast)
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(9.5rem+env(safe-area-inset-bottom))] z-50 flex flex-col items-center gap-2 px-4 lg:bottom-6"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl bg-[#0f1a17] px-4 py-3 text-sm font-medium text-white shadow-xl animate-[toast-in_.2s_ease-out] dark:bg-[#e8eeeb] dark:text-[#0f1a17]"
        >
          <span className="flex-1">{t.message}</span>
          {t.action && (
            <button
              type="button"
              className="font-bold text-emerald-300 dark:text-emerald-700"
              onClick={() => {
                t.action?.run()
                dismiss(t.id)
              }}
            >
              {t.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
