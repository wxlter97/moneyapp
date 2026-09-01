# Budget — cliente (Expo / React Native Web)

Interfaz de la app de presupuesto personal/compartido. Un solo proyecto Expo
(Expo Router) que corre en **web** hoy y servirá para la **app iOS nativa** más
adelante: el código compartible vive en `src/`, las rutas en `src/app/` son
cascarones finos.

## Requisitos

- Node 20+ (probado con 24).
- El backend Django corriendo en `http://localhost:8000` (repo hermano `../budget`).

## Puesta en marcha

```bash
npm install
cp .env.example .env.local   # ajusta EXPO_PUBLIC_API_URL si hace falta
npm run web                  # http://localhost:8081
```

Para iOS (cuando exista): `npm run ios`.

### CORS en el backend (ya configurado en este repo)

Expo web sirve en **`http://localhost:8081`** (o `8082` si el puerto está ocupado).
El backend ya trae:

- `CORS_ALLOWED_ORIGINS` con `http://localhost:8081,http://localhost:8082` (en `.env`).
- `CORS_ALLOW_HEADERS` extendido con `x-workspace-id` (en `config/settings.py`) —
  sin esto el preflight rechaza cada request scoped.

Si cambias el puerto del dev server, añade el origen nuevo a `CORS_ALLOWED_ORIGINS`.

## Arquitectura

```
src/
  app/                 rutas Expo Router (finas: sólo montan pantallas)
    _layout.tsx        providers (React Query, SafeArea, tema) + bootstrap de sesión
    index.tsx          redirección según auth
    login.tsx          login/logout
    (app)/_layout.tsx  guard de sesión + carga de workspaces
    (app)/(tabs)/      Historial · Resumen · Presupuestos · Patrimonio
    (app)/transaction/new.tsx    alta de transacción (modal)
    (app)/transaction/[id].tsx   edición / borrado (modal)
  api/
    client.ts          axios central: Bearer JWT, X-Workspace-ID, refresh auto
    tokenStorage.ts    tokens JWT (SecureStore en nativo / localStorage en web)
    auth.ts            login / register / me / logout
    resources.ts       funciones tipadas por endpoint
    queries/           hooks de React Query (scoped por workspace)
    types.ts           tipos del API (a mano; regenerables desde /api/schema/)
  store/
    auth.ts            usuario + fase de sesión (zustand)
    workspace.ts       workspace activo + lista (zustand, id persistido)
  components/ui/        primitivos (Screen, Button, TextField)
  lib/                 money, date, queryClient
  theme/               tokens (espejo de tailwind.config.js)
```

### Cliente de API (puntos clave)

- **JWT**: el access token se guarda en memoria + almacenamiento seguro. Ante un
  `401`, el interceptor hace **un solo** `POST /auth/token/refresh/` (single-flight),
  reintenta la request original y, si el refresh falla, limpia la sesión.
  El backend rota el refresh (`ROTATE_REFRESH_TOKENS`), así que se re-persiste.
- **Multi-workspace**: cada request lleva `X-Workspace-ID` con el workspace activo
  del store, **excepto** `/auth/*` y `/workspaces/*`. El id activo se persiste
  entre arranques; la lista se recarga del API al iniciar sesión.
- **Estado servidor**: todo vía React Query. Las query keys incluyen el id de
  workspace, así que cambiar de "Casa ▾" refresca los datos automáticamente.

## Estado actual

Hecho y probado contra el backend real:

- Estructura + NativeWind (dark-first), cliente de API, estado global (auth + workspace).
- **Login / registro / logout** (login por `username`; `/register` usa `POST /auth/register/`).
- **5 pantallas**:
  1. Historial mensual — selector de mes (permite meses futuros), resumen
     ingresos/gastos/neto, lista **agrupada por día** (hoy / ayer / "vie 29 ago").
  2. Dashboard — patrimonio neto, mes actual, carteras de gasto, top presupuestos.
  3. Agregar transacción (modal) — gasto / ingreso / **transferencia entre
     carteras**, monto con máscara estilo cajero, categoría, cartera (preselecciona
     la marcada por defecto), fecha (permite futuro), nota, y toggle
     "cuenta para el presupuesto" en gastos.
  4. Presupuestos — totales del mes + barra por categoría + provisión acumulada.
  5. **Carteras** — tarjeta deslizable (Valor neto total / Gasto / Ahorro / Deuda
     / Activo) + lista de todas las carteras en árbol (padres con `aggregated_balance`,
     hijos indentados), meta de ahorro con barra de progreso.
- FAB "+" para alta rápida de transacción desde Historial y Dashboard.
- **Editar / eliminar** transacción y **cartera**: tocar una fila abre el
  formulario en modo edición (PATCH) con confirmación en línea para borrar.
- **Crear presupuesto (workspace)** desde el selector "Casa ▾" y desde el estado
  vacío; el nuevo queda activo automáticamente.
- **Crear / editar cartera** (`WalletForm`, rutas `wallet/new` · `wallet/[id]`):
  nombre, tipo, saldo/valor inicial, cartera padre, meta (ahorro), flag de neto.
- `AmountInput`: los dígitos se acumulan desde los centavos (123456 → 1234.56).
- Selector de fecha con calendario propio (`DateField`), sin dependencias nativas.

### Nota sobre overlays

`Screen`, `Select`, `DateField` y el selector de workspace **no usan el
componente `Modal` de RN**: en react-native-web (SDK 57) su prop `visible` no se
oculta de forma fiable al togglear desde un handler interno. Los desplegables se
expanden en el flujo (empujan el contenido); las pantallas modales de verdad
(`transaction/new`, `transaction/[id]`) sí son rutas `presentation: 'modal'` de
Expo Router.

Pruebas: `npm test` (Jest, 17 tests sobre `lib/` y el cliente de API).
`npm run typecheck` para `tsc --noEmit`.

Pendiente: gestión de miembros del workspace; pulido visual de alta fidelidad;
más tests (componentes con React Native Testing Library — pendiente de afinar el
setup con RN 0.86 / React 19).

## Cambios hechos en el backend para este cliente

- `django-filter` + `TransactionFilter` en `/api/v1/transactions/`
  (`date_after`, `date_before`, `type`, `account`, `category`, `source`) + tests.
- `CORS_ALLOW_HEADERS` extendido con `x-workspace-id`.
- `CORS_ALLOWED_ORIGINS` incluye los puertos de Expo web.
