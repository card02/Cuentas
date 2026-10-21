import { useEffect } from 'react'
import { Layout } from './components/Layout'
import { Toaster } from './components/Toaster'
import { TransactionSheet } from './components/TransactionSheet'
import { useApplyTheme } from './hooks/useTheme'
import { useRoute } from './hooks/useRoute'
import { Dashboard } from './pages/Dashboard'
import { FixedPayments } from './pages/FixedPayments'
import { History } from './pages/History'
import { Movements } from './pages/Movements'
import { Settings } from './pages/Settings'

const pages = {
  resumen: Dashboard,
  movimientos: Movements,
  pagos: FixedPayments,
  historial: History,
  ajustes: Settings,
}

export default function App() {
  const route = useRoute()
  useApplyTheme()

  useEffect(() => {
    // Pide al navegador que no borre los datos guardados cuando falte espacio.
    navigator.storage?.persist?.().catch(() => undefined)
  }, [])

  const Page = pages[route]
  return (
    <>
      <Layout route={route}>
        <Page />
      </Layout>
      <TransactionSheet />
      <Toaster />
    </>
  )
}
