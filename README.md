# Mis Cuentas

App web para llevar tus cuentas personales en **quetzales**: salario por quincena, pagos fijos (apartamento, carro, préstamo, celular…) y gastos del día a día, para saber siempre **cuánto te queda libre**.

Funciona en el celular y en la computadora, se puede **instalar como app** desde el navegador y sigue funcionando sin internet.

## Qué puedes hacer

- **Resumen del mes**: cuánto te queda libre después de pagos fijos y gastos, cuánto tienes en mano, cuánto debes reservar para los pagos de fin de mes y cuánto puedes gastar hoy sin afectarlos.
- **Quincenas**: marca cada quincena como recibida con un toque. La app te avisa si tu 2ª quincena no alcanza para los pagos de fin de mes y cuánto guardar de la 1ª.
- **Pagos fijos**: marca cada pago como hecho, cambia el monto de un mes en particular si fue distinto, agrega o quita pagos (lo ya pagado conserva su historial).
- **Gastos e ingresos extra**: registra la gasolina, el súper, la comida… con categoría, fecha y descripción. Busca y filtra por categoría.
- **Presupuestos** por categoría (por ejemplo, cuánto quieres gastar en gasolina al mes), con aviso cuando te acercas o te pasas.
- **Historial** mes a mes con gráfica, tabla y las categorías en las que más gastas.
- **Respaldos**: descarga tus datos en un archivo y restáuralos en otro dispositivo; exporta tus movimientos a Excel (CSV).
- Tema claro, oscuro o automático.

### Configuración inicial

| Concepto | Monto | Cuándo |
|---|---|---|
| 1ª quincena | Q4,500.00 | Día 15 |
| 2ª quincena | Q4,500.00 | Fin de mes |
| Apartamento | Q2,000.00 | Fin de mes |
| Carro | Q2,000.00 | Fin de mes |
| Préstamo | Q660.65 | Fin de mes |
| Línea de celular | Q120.00 | Fin de mes |

Con eso te quedan **Q4,219.35 libres al mes** antes de gastos variables. Todo se puede cambiar desde **Ajustes** y **Pagos fijos**.

## ¿Dónde se guardan mis datos?

En tu navegador (almacenamiento local del dispositivo). No se envían a ningún servidor, así que nadie más los ve. Por lo mismo:

- Los datos del celular y los de la computadora son independientes. Para pasarlos de uno a otro usa **Ajustes → Descargar respaldo** y luego **Restaurar respaldo** en el otro dispositivo.
- Si borras los datos de navegación del sitio, se borran tus cuentas. Descarga un respaldo de vez en cuando (la app te lo recuerda).

## Publicarla en internet (GitHub Pages)

El repositorio ya trae el flujo `.github/workflows/deploy.yml`, que revisa, prueba y publica la app cada vez que hay cambios en la rama `main`.

1. En GitHub, entra a **Settings → Pages** y en **Source** elige **GitHub Actions**.
2. Lleva estos cambios a la rama `main` (por ejemplo, fusionando el pull request).
3. Al terminar el flujo, la app queda en `https://<tu-usuario>.github.io/<repositorio>/` (para este repo: `https://card02.github.io/Cuentas/`).

### Instalarla en el celular

Abre la dirección en el navegador del celular y:

- **Android (Chrome)**: menú ⋮ → **Instalar app** / **Agregar a pantalla principal**.
- **iPhone (Safari)**: botón **Compartir** → **Agregar a pantalla de inicio**.

## Desarrollo

Requiere Node.js 22 o superior.

```bash
npm install
npm run dev        # servidor local en http://localhost:5173
npm test           # pruebas de los cálculos, fechas y respaldos
npm run build      # revisa tipos y genera la versión final en dist/
```

Tecnologías: React, TypeScript, Vite, Tailwind CSS, Zustand (estado guardado en el navegador) y vite-plugin-pwa (app instalable y sin conexión).

```
src/
  lib/          cálculos del mes, fechas, montos y respaldos (con pruebas)
  store/        datos guardados y configuración inicial
  components/   piezas de la interfaz, gráficas y formularios
  pages/        Resumen, Movimientos, Pagos fijos, Historial y Ajustes
```
