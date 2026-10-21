import { useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'

const media = () => window.matchMedia('(prefers-color-scheme: dark)')

/** Aplica el tema elegido (o el del sistema) al documento. */
export function useApplyTheme() {
  const theme = useAppStore((s) => s.settings.theme)

  useEffect(() => {
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && media().matches)
      document.documentElement.dataset.theme = dark ? 'dark' : 'light'
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0a0f0d' : '#f3f5f4')
    }
    apply()
    if (theme !== 'system') return
    const mq = media()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [theme])
}
