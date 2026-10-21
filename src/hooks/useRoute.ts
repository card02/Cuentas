import { useEffect, useState } from 'react'

export const routes = ['resumen', 'movimientos', 'pagos', 'historial', 'ajustes'] as const
export type Route = (typeof routes)[number]

function read(): Route {
  const hash = window.location.hash.replace(/^#\/?/, '')
  return (routes as readonly string[]).includes(hash) ? (hash as Route) : 'resumen'
}

export function navigate(route: Route) {
  if (read() !== route) window.location.hash = `/${route}`
}

/** Enrutado mínimo por hash: funciona en GitHub Pages sin configuración extra. */
export function useRoute(): Route {
  const [route, setRoute] = useState(read)
  useEffect(() => {
    const onChange = () => {
      setRoute(read())
      window.scrollTo({ top: 0 })
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}
