# Backlog — Auditoría de Producto (porsupuesto-audit-plan.md)

> Generado a partir de `~/Downloads/porsupuesto-audit-plan.md` (auditoría del 14 sep 2026 contra
> **producción**, money.wxlter.dev) y contrastado contra el código real en `feat/financial-calendar`.
>
> **Importante:** el repo local va adelante de lo que se auditó. Varios hallazgos ya están resueltos
> aquí (ver "✅ Ya resuelto" en cada sección) — no los volvamos a trabajar. Todo lo marcado
> "⚠️ Verificar" no se confirmó contra código, solo contra la descripción del audit.
>
> Formato: `[ ]` pendiente, `[x]` hecho. Referencias de archivo entre backticks son reales (leídas del repo).

## Decisiones (14 sep 2026)

1. **Orden de fases:** Fases 1-2 (bugs + accesibilidad + UX) primero. "Ledger Brutalism" (Fase 3)
   se arranca después, no en paralelo — Fase 1 ya está cerrada, sigue Fase 2.
2. **Vigencia del audit:** producción (`money.wxlter.dev`) está al día con `main`. Dicho esto, ya
   se confirmó código en mano que varias secciones del audit **no describen el estado actual**
   (ver Fase 0 — FAB/bottom-nav, bug de monto, empty states, jerarquía de Herramientas, etc. ya
   resueltos) y que "Restante"/"Información" en Presupuesto **no son tan idénticas** como dice el
   audit (§1.2) — "Información" ya suma una card "Total del período" + línea de provisión que
   "Restante" no tiene (ver nota en Fase 2 abajo). Conclusión práctica: seguimos verificando
   contra código antes de ejecutar cada ítem, no asumimos el audit al pie de la letra aunque
   esté "vigente" en términos de deploy.
3. **Backend (P1-5, bootstrap ~12 requests):** en alcance. `budget-app-django` está disponible
   como directorio de trabajo adicional en esta sesión — se puede proponer el endpoint agregado
   o los cambios de ese lado cuando se llegue a Fase 4.
4. **Fase 3, dirección final:** ni el "Ledger Brutalism" genérico del audit ni un reskin amarillo
   encima de él — identidad personal **wxlter.** (Faro `#FFDB00` / Tinta `#111111` / Papel
   `#F4F3EF`, Archivo Black/Archivo/JetBrains Mono), tomando de Ledger Brutalism sólo su
   disciplina estructural. El amarillo es identidad, nunca semántica: verde/naranja/rojo siguen
   siendo ingreso/aviso/problema, sin excepción. Explorado en 3 artifacts antes de tocar código,
   implementado y verificado con tests — ver Fase 3 abajo.

---

## Fase 0 — Ya resuelto (no hacer, solo confirmar que sigue así)

- [x] Empty states diseñados — existen y se usan en ~20 pantallas (`src/components/ui/states.tsx`)
- [x] FAB + bottom nav tapando listas en mobile — las pantallas tab ya reservan espacio
      (`pb-36`/`pb-32` en `dashboard.tsx`, `wallets.tsx`, `budgets.tsx`, `tools.tsx`)
- [x] "Herramientas" como cajón de sastre plano — ya está reestructurado en carpetas
      (`TOOL_GROUPS` → `/tools/[group]`, ver `src/lib/toolGroups.ts` y `src/app/(app)/(tabs)/tools.tsx`)
- [x] Check de acento ambiguo (flotando entre columnas) — ya es una lista vertical con
      nombre + check por fila (`AccentOption` en `tools.tsx`)
- [x] Accesibilidad de los 3 tabs del dashboard y del FAB — ya tienen `accessibilityLabel`/label
      explícito (`TabBar.tsx`, `AddTransactionFab.tsx`)
- [x] Bug crítico de monto ×1000 al escribir el punto — no reproducible en el código actual;
      `AmountInput.tsx` descarta `.` como no-dígito antes de reinterpretar

---

## Fase 1 — Foundations (bugs reales + accesibilidad + tokens) ✅ cerrada (14 sep 2026)

### P0 — Confirmado en código, corregir primero

- [x] **P0-3 — Barra de presupuesto no distingue "al 100%" ni "sin presupuesto" como sobregiro**
  ✅ Resuelto. `ProgressBar` ahora recibe `state: 'ok' | 'warning' | 'over'` en vez del booleano
  `over` (`src/components/ui/ProgressBar.tsx`); `BudgetProgressRow` calcula el estado con
  `>=` (no `>`) y trata `budgeted === 0 && spent > 0` como sobregiro
  (`src/components/BudgetProgressRow.tsx`). Se agregó el ícono `alert` (`Icon.tsx`) junto al
  monto — no depende solo del color (WCAG 1.4.1) — y un tono `warning` en `Money.tsx` para
  el aviso "cerca del límite" (≥80%). `WalletRow.tsx` (barra de crédito usado) se migró al
  nuevo prop. Test de regresión con los dos casos exactos del audit (Servicios 6.00/6.00,
  Miscelánea 120.38/0.00) en `src/components/__tests__/BudgetProgressRow.test.tsx` — 4/4 ok,
  suite completo 161/161, typecheck limpio.
  - ~~Pendiente opcional: aplicar el mismo tratamiento de 3 estados al anillo de "restante"~~
    — moot: `Ring.tsx` se borró en Fase 3 (reemplazado por `BudgetMeter.tsx`, que ya nace con
    los 3 estados vía `budgetState` compartido).

### P1 — Accesibilidad (quick wins, revisar antes de asumir que faltan)

- [x] **Fila de transacción sin nombre accesible explícito**
  ✅ Resuelto. `TransactionRow.tsx` arma un `accessibilityLabel` explícito en el `Pressable`
  principal (solo cuando la fila es interactiva, `onPress` presente): tipo (Gasto/Ingreso/
  Transferencia), categoría o descripción + cartera (u origen→destino en transferencias),
  monto, y "fuera de presupuesto"/badge de origen al final. Tests en
  `TransactionRow.test.tsx` (`describe('accessibilityLabel')`, 4 casos).
- [x] **Selector de workspace sin `accessibilityLabel`**
  ✅ Resuelto. `WorkspaceSwitcher.tsx` — `accessibilityLabel="Cambiar de presupuesto, actual: {nombre}"`
  + `accessibilityState={{ expanded: open }}`. Test nuevo en `WorkspaceSwitcher.test.tsx`.
- [x] **Auditoría de `WalletRow`, `CategoryGrid`, `CalendarGrid`** ✅ Resuelto.
  - `WalletRow.tsx` no tiene `Pressable` propio (es solo contenido); el botón que lo envuelve
    vive en `(tabs)/wallets.tsx` y tampoco tenía label. Se agregó `walletRowLabel(wallet,
    hasChildren)` exportado desde `WalletRow.tsx` (reusa el mismo cálculo de saldo que se
    muestra) y se aplicó en `wallets.tsx`.
  - `CategoryGrid.tsx` tenía 4 `Pressable` sin label (el tile de categoría, el encabezado de
    grupo editable — que ni siquiera tenía `accessibilityRole`—, "+ Subcategoría", y el toggle
    de `CategoryPickerField`) más el ítem "Sin categoría". Los 5 quedaron etiquetados.
  - `CalendarGrid.tsx` ya tenía label, pero decía `"{día} de {mes}"` con el mes en número (ej.
    "13 de 8") y no comunicaba los puntos de ingreso/gasto/programado. Ahora usa el mes en
    palabras + año, y anuncia "hoy"/"con gastos"/"con ingresos"/"con movimientos programados".
  - Tests nuevos: `WalletRow.test.tsx`, `CategoryGrid.test.tsx`, caso agregado en
    `CalendarGrid.test.tsx`. Suite completo 175/175, typecheck limpio.

### Design tokens base (sin tocar composición visual todavía)

- [x] Revisar `src/theme/` — **resuelto de hecho, no solo confirmado**: `income`/`expense`/
      `warning` son los 3 tokens semánticos (`theme/index.ts`), fijos e independientes del
      acento desde la identidad wxlter. de Fase 3 — exactamente el "tercer estado (cerca del
      límite)" que este ítem pedía confirmar, ya en uso activo en `ProgressBar`/`BudgetMeter`/
      `BudgetProgressRow`.
- [x] Confirmar escala de radios/espaciado — **resuelto de hecho, en Fase 3**: `tailwind.config.js`
      `borderRadius` se redefinió a propósito (radios chicos, disciplina Ledger) al implementar la
      identidad wxlter., reemplazando la escala "esquinas suaves" que tenía antes.

Fase 1 queda cerrada -- lo que faltaba lo resolvió el trabajo de fases posteriores, no hizo falta
una pasada aparte.

---

## Fase 2 — Core UX ✅ cerrada (14 sep 2026)

- [x] **Fusionadas "Restante"/"Información" en una sola vista.** ✅ Resuelto en
      `(tabs)/budgets.tsx`. Se decidió con una maqueta comparativa (mismos tokens/componentes
      reales, datos de ejemplo) antes de tocar código — ver el hallazgo de que no eran tan
      idénticas como decía el audit: "Restante" tenía el `Ring`, "Información" la card "Total del
      período" + la provisión acumulada por fila.
  - Se eliminaron los `SubTabs` y el estado `tab`. La cabecera mantiene el framing "te
    queda/te pasaste" (era el de "Restante") como número protagonista.
  - El contenido ahora es continuo, sin nada oculto detrás de una pestaña: `Ring` → card
    "Total del período" (presupuestado/gastado/disponible, antes solo en "Información") →
    las 2 tarjetas de grupo, con la línea de provisión acumulada siempre visible cuando aplica
    (antes solo en "Información").
  - Limpieza de paso: `showProvision` era un prop siempre en `true` desde el único call site —
    se sacó de `GroupCard` y `BudgetProgressRow` en vez de dejarlo como bandera muerta.
  - Sin test nuevo: ninguna pantalla de `src/app` tiene test en este repo (convención existente,
    la cobertura vive en `components`/`lib`/`store`) — se validó con `tsc --noEmit` limpio y el
    suite completo (180/180) sin regresiones.
- [x] **Corrección: el borrado ya tiene confirmación/undo en los dos puntos de entrada — no hay
      bug.** El audit no lo probó "para no tocar datos reales"; en código ya está bien resuelto:
  - Swipe-to-delete en la lista del dashboard (`(tabs)/dashboard.tsx:534`, `onSwipeDelete`):
    oculta la fila al instante (optimista, `pendingDeleteIds`) y muestra un Snackbar
    "Movimiento eliminado. Deshacer" por 4s (`store/snackbar.ts`) — solo llama al DELETE real
    si nadie deshace a tiempo. Es exactamente el patrón que pide el audit en §14 ("un toast con
    Deshacer... en vez de un diálogo bloqueante").
  - Botón "Eliminar transacción" en la pantalla de edición (`TransactionForm.tsx:667-687`):
    confirmación inline de 2 pasos ("¿Eliminar esta transacción? No se puede deshacer." +
    Cancelar/Eliminar), con estado de carga y manejo de error (`onDelete`, línea 338).
  - **Inconsistencia encontrada (no estaba en el audit) → ✅ resuelta.** El swipe-to-delete solo
    estaba cableado en `dashboard.tsx`; `wallet-transactions.tsx`, `category-transactions.tsx` y
    `tag-transactions.tsx` usaban la misma `TransactionRow` sin `onSwipeDelete`. Se extrajo la
    lógica a un hook compartido `useSwipeDeleteTransactions` (`src/lib/transactions.ts`) y se
    cableó en las 3 pantallas + se refactorizó `dashboard.tsx` para usar el mismo hook (antes
    tenía su propia copia inline).
    - De paso se corrigió un bug real que ya tenía la versión de `dashboard.tsx`: el Snackbar es
      global y de un solo mensaje a la vez (`store/snackbar.ts`) — deslizar un segundo borrado
      mientras el primero seguía sin confirmar reemplazaba su snackbar en silencio, y ese primer
      borrado nunca se comprometía (quedaba oculto de la lista para siempre sin borrarse de
      verdad). El hook ahora compromete el borrado anterior cuando llega uno nuevo.
    - En `wallet-transactions.tsx` el saldo por fila (`balanceAfterEach`) se calcula contra el
      historial COMPLETO sin filtrar (necesita el efecto de todos los movimientos, incluidos los
      pendientes de confirmar) y recién después se ocultan las filas en borrado optimista.
    - Tests nuevos en `lib/__tests__/transactions.test.ts` (`describe('useSwipeDeleteTransactions')`,
      5 casos, incluyendo el caso de doble-swipe). Suite completo 180/180, typecheck limpio.
- [x] **Corrección: "Próximos pagos" ya existía, completo — no había que construirlo.**
      ✅ Backend + frontend verificados y corregido un bug real encontrado en el camino.
  - `reports/scheduled/` (`upcoming_scheduled` en `budget-app-django/apps/reports/services.py`)
    ya unifica recurrentes + cuotas + pago de tarjeta + vencimiento de deuda en una sola lista
    ordenada por fecha — más completo que lo que pedía el audit (solo recurrentes+cuotas).
    Alimenta 3 superficies: la card "Programado" del dashboard, el detalle de día del
    calendario financiero, y los recordatorios push de `notify_due_items`.
  - **Bug real encontrado:** `ScheduledItem` no traía si el recurrente de origen era
    income/expense/transfer — un sueldo recurrente se mostraba en "Programado" en gris con
    paréntesis, igual que un gasto, y tocarlo para registrarlo prellenaba el formulario como
    "Gasto" en vez de "Ingreso". La notificación push del día anterior también decía "Gasto
    recurrente mañana" para un ingreso.
  - Arreglado en los dos repos:
    - `budget-app-django`: `upcoming_scheduled` agrega `"type"` a cada ítem (`rec.type` para
      recurrentes; `"expense"` fijo para cuota/tarjeta/deuda, que nunca son entradas de plata);
      `ScheduledItemSerializer` lo expone; `notify_due_items` usa el mismo campo para el título
      de la notificación ("Ingreso recurrente mañana" / "Transferencia recurrente mañana" /
      "Gasto recurrente mañana"). Tests nuevos en `test_scheduled.py` y `test_notifications.py`
      — suite completo del backend 611/611.
    - `moneyapp`: `ScheduledItem.type` en `api/types.ts`; `ScheduledRow` (dashboard.tsx, la
      comparten la card "Programado" y el detalle de día del calendario) usa `item.type` para
      signo/color/`accessibilityLabel`, y `openScheduledItem` prellena `prefillType` con
      `item.type` en vez de asumir siempre "expense". De paso se agregó el
      `accessibilityLabel`/`accessibilityRole` que le faltaba a la fila (mismo hallazgo de
      accesibilidad del resto de la sesión). Typecheck limpio, suite completo 180/180 (sin test
      nuevo: ninguna pantalla de `src/app` tiene test en este repo, convención existente).
- [x] **Verificado: sigue siendo la misma pantalla, y está bien así — no es un bug.**
      Confirmado en código: el botón "Historial" del header de Vista general
      (`(tabs)/dashboard.tsx:62`) y el tile "Patrimonio" de Herramientas → Análisis
      (`lib/toolGroups.ts:117`) llevan los dos a `/net-worth-history`. Pero no es la misma
      situación que "Restante"/"Información" (ahí sí había 2 implementaciones parecidas de la
      misma pantalla) — acá hay **una sola pantalla** con dos accesos deliberados:
  - El botón del header es un atajo chico a propósito, con su propia historia ya documentada en
    el código (comentario en `dashboard.tsx:71-76`): antes todo el número de patrimonio neto
    (el elemento más grande de la pantalla) era tocable y llevaba a Historial, generando toques
    accidentales al buscar el switch de mes debajo — se extrajo a un botón chico y explícito
    para dejar de romper eso.
  - El tile de Herramientas sirve a quien navega el menú completo de Análisis sin recordar que
    también está en el dashboard.
  - Es exactamente la alternativa que el propio audit daba por buena en §1.2 ("...o convertirlo
    en atajo explícito al mismo lugar") — ya es así. Dos entradas a una pantalla no es
    duplicación de UI, es una IA normal (como cualquier ajuste con más de un camino para
    llegar). No se tocó código.

---

## Fase 3 — Visual identity ✅ dirección decidida e implementada (14 sep 2026)

**Decisión final: identidad personal wxlter.**, no la propuesta genérica "Ledger Brutalism" del
audit (§6) ni un reskin amarillo encima de ella. De Ledger Brutalism se tomó únicamente la
disciplina estructural (borde fino, radio chico, sin sombra); color y tipografía son enteramente
de `assets/LEEME.txt`. Explorado primero en 3 artifacts (vidrio actual vs. Ledger Brutalism
genérico vs. wxlter.) antes de tocar código — ver hilo de la sesión.

Reglas que se mantuvieron desde la decisión hasta el código, sin excepciones:

- **El amarillo (`Faro` `#FFDB00`) es identidad, nunca semántica** — vive en el acento
  (`theme/accents.ts`, elegible en Herramientas → Apariencia, ahora por defecto), en foco/CTA y en
  el pin de límite del medidor de presupuesto. `income`/`expense`/`warning` son verde/rojo/naranja
  fijos, independientes del acento (`theme/index.ts`) — precisamente para que nunca dependan de
  qué acento haya elegido la persona usuaria.
- **3 roles tipográficos fijos** (`theme/typography.ts`): Archivo Black sólo en la cifra
  protagonista de una pantalla (`Money hero`), Archivo en toda la UI (`fonts.*`, reemplaza a
  Manrope), JetBrains Mono sólo en datos financieros (`Money` no-`hero`, siempre — es la única
  responsabilidad del componente).

Implementado:

- [x] Tokens base (`theme/index.ts`, `global.css`): neutros Tinta/Papel, `income`/`expense`/
      `warning` semánticos fijos.
- [x] Acento `wxlter` (Faro `#FFDB00`) agregado a `theme/accents.ts` y puesto como
      `DEFAULT_ACCENT` — la paleta "tierra" existente (Herramientas → Apariencia) se conserva
      intacta como opciones alternativas, no se borró el selector.
- [x] Tipografía: Archivo/Archivo Black/JetBrains Mono cargadas en `_layout.tsx`
      (`@expo-google-fonts/archivo`, `-archivo-black`, `-jetbrains-mono`), Manrope removida.
      `Money.tsx` usa JetBrains Mono siempre salvo `hero` (Archivo Black).
- [x] Bordes de 1px + radios chicos en vez de sombra difusa (`Card.tsx`, `borderRadius` de
      `tailwind.config.js`) en vez de los radios grandes que había.
- [x] **El anillo circular de presupuesto se reconsideró de fondo, no se recoloreó** — nuevo
      `BudgetMeter.tsx`: pista horizontal con un pin de límite en Faro (identidad) y relleno
      verde/ámbar/rojo (semántica compartida con `BudgetProgressRow` vía `lib/budgetState.ts`,
      extraída para que la regla de sobregiro de P0-3 no pueda vivir en un solo lugar); la porción
      que excede el límite se dibuja con trama diagonal, no solo un cambio de color. Reemplaza
      `Ring.tsx` (borrado, quedó sin otro uso) en `budgets.tsx` (medidor grande, con ticks) y
      `ProgressBar` en `BudgetProgressRow` (medidor chico, mismo componente — antes eran dos
      visualizaciones distintas para el mismo dato).
- [x] Filas de presupuesto rediseñadas para mobile (no comprimidas): nombre de categoría envuelve
      en vez de truncar (`numberOfLines={1}` sacado de `BudgetProgressRow`).
- [x] Regresión real encontrada al implementar (no estaba en la maqueta): `ProgressBar` sin `tone`
      explícito cae a `colors.primary` en estado `'ok'` — con Faro como acento por defecto, la
      barra de uso de crédito de `WalletRow` iba a mostrar "vas bien" en amarillo, exactamente la
      conflación identidad/semántica que esta fase existe para evitar. Fix: `tone="income"`
      explícito en ese call site.
- [x] Tests: `budgetState.test.ts` (nuevo, la lógica de 3 estados extraída), `BudgetMeter.test.tsx`
      (nuevo, 7 casos), `BudgetProgressRow.test.tsx` sigue pasando sin cambios (misma semántica,
      otra vista). 36 suites / 193 tests, `tsc --noEmit` limpio.

Pendiente, fuera de esta pasada (alcance deliberado, ver commit):

- [ ] `WalletRow`'s barra de meta de ahorro (`tone="income"`) y el resto de las cards (`TabBar`,
      `AddTransactionFab`, gráfico de patrimonio neto) no se tocaron más allá de heredar los
      tokens/radios nuevos automáticamente — no se auditó cada sombra/radio a mano, solo el
      cambio global de `tailwind.config.js`.
- [ ] Iconografía propia de categoría en vez de emoji (`CategoryAvatar.tsx`, `CategoryGrid.tsx`) —
      cambio grande y no pedido en esta ronda, se mantiene emoji personalizable.
- [x] **Verificado en el navegador** (14 sep 2026): backend Django local + `expo start --web`,
      workspace real con los 6 casos de la maqueta (excedido justo al límite ×2, cerca del
      límite, dentro, sin presupuesto, nombre largo sin truncar). Confirmado por DOM/CSS:
      `ArchivoBlack_400Regular` en la cifra protagonista, `JetBrainsMono_*` en el resto de
      `Money`, Faro `#FFDB00` sólo en el pin de límite/nav (nunca en un estado "ok"), Tinta de
      fondo, `Card` con borde 1px + radio 10px + sombra casi nula. Selector de acento intacto,
      `wxlter.` primero en la lista. Sin errores de consola.
      Bug real encontrado, **no arreglado acá** (ver tarea aparte): `GoogleSignInButton.tsx`
      llama a `Google.useIdTokenAuthRequest` antes del `if (!GOOGLE_CONFIGURED) return null`,
      así que en web sin client IDs configurados el login entero crashea en vez de simplemente
      no mostrar el botón — no tiene relación con la identidad visual, preexistente.

---

## Fase 4 — Dashboard / información financiera ✅ cerrada (14 sep 2026)

- [x] **Estado explícito de "aún no hay suficiente historial"** (14 sep 2026) — confirmado el
      hallazgo: el 0 ya lo resolvía `NetWorthHistoryScreen` con `EmptyState`, pero 1-2 puntos
      pasaban directo a `NetWorthChart` sin aviso (un punto suelto o una línea de 2 se leían como
      "el gráfico completo"). Fix en `NetWorthChart.tsx`: con 1-2 snapshots se sigue dibujando la
      línea real (nunca se oculta el dato) + un aviso "Todavía es poca historia para ver una
      tendencia clara — llevás N mes(es)." `NetWorthPager.tsx` no necesitó cambios (son totales
      del momento actual, no una serie de tiempo). Verificado extremo a extremo con datos reales
      (1, 2 y 3 snapshots vía API real, no solo mock) además de `NetWorthChart.test.tsx` (4 casos).
      37 suites / 197 tests, `tsc --noEmit` limpio.
- [x] **Resumen de deuda de tarjetas en el dashboard** (14 sep 2026) — tile nueva "Deuda en
      tarjetas" en "De un vistazo" (`dashboard.tsx`, `ResumenTab`), solo visible cuando existe al
      menos una cartera `kind === 'credit'`. Monto = `Σ max(0, -current_balance)` de las tarjetas
      en la moneda base (mismo criterio de no mezclar monedas que el resto de los totales de esta
      pantalla); el conteo de tarjetas sí cuenta todas, cualquier moneda. Sin endpoint nuevo — ya
      estaba en `useWallets()`, que `ResumenTab` ya pedía. Ancho completo (`wide`, como "Gasto
      principal") para no dejar una fila a medias cuando aparece. Verificado en el navegador con
      una tarjeta real en deuda (`USD 430.50`): color/tipografía correctos (rojo semántico,
      JetBrains Mono), patrimonio neto del header se actualiza en consecuencia. Sin test dedicado
      (convención del proyecto: pantallas bajo `src/app/` no tienen tests).
- [x] **Corrección: sí existe onboarding, y ya enganchaba mejor de lo que decía el audit** (14 sep
      2026) — `src/app/(app)/onboarding.tsx` (8 pasos). §1.1 del audit original literalmente decía
      "no hay onboarding observable" (falso — probablemente porque solo se ve una vez por cuenta,
      `User.onboarding_completed`, y un crawl de audit con cuenta ya usada nunca lo dispara) y
      pedía que el primer paso mostrara explícito "cuotas y recurrentes / múltiples carteras y
      monedas / presupuestos por categoría" como ganchos concretos. Confirmado el hallazgo real:
      esos 3 temas SÍ estaban, pero enterrados en el último paso ("Y hay más... no hace falta
      memorizarlo ahora") — restándoles peso en vez de venderlos. Fix de copy únicamente (2 de los
      8 pasos, sin tocar estructura ni agregar pasos): el paso de bienvenida ahora abre con los 3
      ganchos explícitos ("efectivo, varias tarjetas y cuotas a la vez, en más de una cartera y
      moneda... con presupuesto por categoría"); el paso "Carteras" suma media frase sobre
      multi-moneda. Deliberadamente NO se hardcodeó "Centroamérica" (lo sugería el audit) — el
      copy ya implica la región sin excluir a nadie fuera de ella. Verificado en el navegador
      forzando `onboarding_completed=False`. `tsc`/`jest`/`expo lint` limpios.
- [x] **Bootstrap del dashboard — medido, no solo contado** (14 sep 2026): sesión limpia (login
      real, sin cache), `performance.getEntriesByType('resource')` contra el backend local. El
      conteo del audit es correcto (~12: 1 login + `auth/me` + 2 en paralelo `workspaces`/
      `push-devices` + 7 más en paralelo una vez resuelto el workspace: `notifications/
      unread-count`, `wallets`, `reports/summary`, `reports/scheduled`, `reports/budget`,
      `reports/net-worth`, `categories`) — pero "secuenciales" **no** es correcto: son 2 rondas
      (`auth/me` sola, ~6ms; el resto -- 7 requests -- en paralelo, arrancan todas dentro de 1ms
      entre sí, ~50ms). Total medido en local: ~105ms de red para todo el bootstrap, no una
      cadena de 12 round-trips. **Conclusión: no se justifica invertir en agregación de backend
      (P1, Effort L) como estaba planteado** — el problema que resolvería (latencia acumulada de
      una cadena secuencial) no existe tal como se describió; si hay una optimización real es
      mucho más chica (evitar que la 2ª ronda espere a `auth/me` cuando el workspace activo ya
      está en `AsyncStorage` desde la sesión anterior). Se retira de la lista de trabajo activo;
      si se quiere perseguir esa micro-optimización puntual, es un ítem nuevo y acotado, no el
      proyecto de agregación original.

---

## Fase 5 — Mobile / responsive ✅ cerrada (14 sep 2026)

- [x] **Layout propio de tablet/desktop en Presupuesto y Carteras** (14 sep 2026) — confirmado:
      `useIsDesktop` era binario (900px, sin intermedio) y el contenido quedaba fijo en 560px
      siempre, dejando la mitad de una pantalla de escritorio vacía. Ojo con el rango del audit
      (~768-1024px): por debajo de 900 sigue la barra de pestañas de mobile (ver `TabBar.tsx`), así
      que una grilla de escritorio ahí se sentiría desacoplada de esa navegación compacta -- se
      activa junto con el sidebar (mismo umbral), no en un tercer breakpoint nuevo.
      - `budgets.tsx`: los grupos (Hogar, Variables…) pasan a 2 columnas cuando sobra ancho de
        verdad — son cards independientes entre sí, sin jerarquía que romper.
      - `wallets.tsx`: sólo se ensancha la columna (560→720px), sin pasar a grilla — la lista tiene
        jerarquía padre/hijo (`node.depth`) y partirla a la mitad separaría una cartera de sus
        sub-carteras en columnas distintas; una grilla de verdad ahí necesita agrupar por cartera
        raíz primero, que es su propio rediseño, no este ajuste.
      - **Bug real encontrado al implementar** (no estaba en la maqueta ni en el plan): `SideNav`
        es `position: fixed` y vive en el margen vacío que dejaba el contenido de 560px (ver su
        propio docstring) — no empuja nada. Un ancho fijo más grande sin más lo tapaba: el
        sidebar quedaba ENCIMA de las cards en vez de al costado, a partir de ~1024px de viewport.
        Fix: `useDesktopContentWidth(desiredMax)` nuevo en `lib/responsive.ts` — ancho responsivo
        que nunca invade el margen reservado del sidebar (se queda en 560, como mobile, hasta que
        el viewport realmente tiene lugar de sobra; recién ahí escala hacia `desiredMax`).
        `NetWorthPager` recibe el mismo ancho por prop (`maxWidth`) para no quedar más angosto que
        la lista de carteras debajo.
      - Verificado en el navegador a 1024px (sin overlap, cae a 1 columna como antes — el fix
        funciona) y 1280px (2 columnas en Presupuesto, sin overlap con el sidebar) y en mobile
        (sin cambios). `tsc`/`expo lint`/`jest` limpios (37 suites / 199 tests, sin regresiones).
- [x] **Formularios full-screen también en desktop** (14 sep 2026) — confirmado el hallazgo con
      captura: "Agregar transacción" en 1280px abría a pantalla completa, el formulario pegado
      arriba-izquierda con casi toda la pantalla vacía. Al investigar apareció más grande de lo
      que sugería el ítem: `Screen.tsx` lo usan **54 rutas** (no sólo `TransactionForm`/
      `WalletForm`) — login/register, todas las páginas de Herramientas, vistas de detalle largas
      (estado de cuenta, historial). Se consultó el alcance antes de construir: **sólo los
      formularios rápidos de alta/edición** pasan a `Drawer` (nueva `variant="drawer"` en
      `Screen.tsx`, panel de 440px que entra desde la derecha en vez de tomar toda la pantalla,
      sólo activo en desktop -- en mobile se comporta exactamente igual que antes, hoja completa).
      Rutas: `transaction/new`, `transaction/[id]`, `wallet/new`, `wallet/[id]`, `category/new`,
      `category/[id]`, `recurring/new`, `recurring/[id]`, `installment/new`, `installment/[id]`,
      `split-transaction`, `budget-edit` (12). El resto (Herramientas, detalle, login/register)
      se queda `variant="page"` (el default) a propósito -- no encajan en un panel chico o no
      tienen una pantalla "detrás" con sentido.
      - Se cierra con click en el backdrop, la X de `ModalHeader` (sin cambios) o Escape (nuevo,
        sólo web). El backdrop es puntero-only, sin `accessibilityLabel` propio -- duplicar la
        misma etiqueta "Cerrar" que ya usa la X sólo confundía qué botón es cuál.
      - **Limitación real, documentada a propósito**: en web `expo-router` desmonta la ruta
        anterior al navegar (a diferencia de un modal nativo en iOS, que la deja viva detrás) --
        así que el panel no dimeriza la pantalla previa de verdad, es un backdrop propio. Sigue
        resolviendo el problema real (el formulario ya no ocupa el ancho completo con casi todo
        vacío), pero no es un modal-sobre-contenido-vivo -- lograr eso necesitaría no desmontar la
        ruta anterior en web, cambio de arquitectura de navegación aparte, no este ajuste.
      - Verificado en el navegador: medido por DOM (no sólo visual -- la captura del panel a
        1280px se veía "centrado" por el letterboxing del propio panel del navegador al emular un
        viewport más grande que el visible; `getBoundingClientRect()` confirmó el panel pegado al
        borde derecho, ancho 440, sin invadir nada) y confirmado el cierre disparando el click
        real por DOM. Mobile sin cambios (hoja completa con manija de arrastre, igual que
        siempre). `tsc`/`expo lint`/`jest` limpios (37 suites / 199 tests).
- [x] **Carrusel "De un vistazo" (`NetWorthPager.tsx`)** (14 sep 2026) — confirmado el hallazgo:
      los puntos eran `View`, no `Pressable`, así que en desktop (sin swipe) no había forma de
      saltar de página sin arrastrar. Ahora cada punto es un botón accesible
      (`accessibilityLabel="Ver {título de la página}"`) que llama a `scroller.scrollTo(...)`.
      El arrastre con mouse en sí ya funcionaba (`ScrollView horizontal` de RN Web lo soporta
      nativo) -- no hacía falta tocarlo. Verificado en el navegador a ancho desktop: click en un
      punto mueve el carrusel y lo resalta en Faro. 2 tests nuevos, 37 suites / 199 tests,
      `tsc`/`expo lint` limpios.

---

## Fase 6 — Polish ✅ cerrada (14 sep 2026)

- [x] **Skeletons de layout en vez de spinner** (14 sep 2026) — `Skeleton.tsx` nuevo (`ui/`): pulso
      de opacidad con `withRepeat`, no un spinner centrado que deja la pantalla en blanco.
      `TransactionRowSkeleton`/`TransactionListSkeleton` (forma real de `TransactionRow`: avatar +
      2 líneas + monto) en el detalle de cartera (`wallet-transactions.tsx`); `ResumenSkeleton`
      local en `dashboard.tsx` (triple de "Este mes" + card de "Programado" + grilla de "De un
      vistazo"). Verificado en el navegador forzando `loading=true` a mano (con backend local no
      hay latencia real que capturar en pantalla) — coincide con la forma real en ambos casos.
- [x] **`prefers-reduced-motion`** (14 sep 2026) — auditado el uso real de Reanimated: sin
      `withRepeat` previo a `Skeleton.tsx` (0 animaciones en loop, confirmado por grep) y ninguna
      llamada fuerza `ReduceMotion.Never`, así que **ya estaba resuelto por default** —
      Reanimated 4 usa `ReduceMotion.System` por default en `withTiming`/`withSpring`/`withRepeat`
      (confirmado contra el código fuente de la librería, no solo la doc), que en web chequea
      `matchMedia('(prefers-reduced-motion: reduce)')` de verdad. La única animación de la app que
      NO pasa por Reanimated es `FadeInView.tsx` (usa el `Animated` del core de RN, sin ese
      default) — ahí sí hacía falta código: ahora chequea `AccessibilityInfo.isReduceMotionEnabled()`
      y salta directo al estado final si está activo.
- [x] **Motion: números que cuentan + transición de color** (14 sep 2026) — `useCountingNumber.ts`
      nuevo (`requestAnimationFrame` + estado de React, no Reanimated: el contenido de un `<Text>`
      no es un estilo animable en el hilo de UI): `Money` gana un prop `animate` (default `false`,
      opt-in por pantalla) que hace que la cifra cuente hasta el valor nuevo en vez de saltar de
      golpe. Aplicado a `SummaryTriple` (Lista, cambia con `MonthSwitcher`) y a los totales de
      Presupuesto (cambia con `PeriodSwitcher`) -- no a cada fila de categoría, para no volver la
      pantalla "ruidosa". Respeta reducir movimiento (mismo criterio que `FadeInView`). Además,
      `ProgressBar`/`BudgetMeter` ya no saltan de color de golpe al cruzar 80%/100%: un
      `stateIndex` 0/1/2 interpolado con `interpolateColor` (compartido entre los dos componentes,
      `PROGRESS_STATE_INDEX`). Verificado en el navegador cambiando de período en Presupuesto
      (capturada la cuenta a mitad de camino, USD 55.88 → 11.60 → 0.00). 3 tests nuevos en
      `useCountingNumber.test.ts` (mock de `requestAnimationFrame`, sin esperas reales).
- [x] **Casos límite de §11** (14 sep 2026):
      - **Transacciones futuras sin distinguir del historial** — confirmado el hallazgo exacto del
        audit ("1 dic" arriba de "ayer"): una transacción real con fecha futura (alguien la carga
        a mano de antemano) es indistinguible de una pasada en la lista. `DayHeader.tsx` nuevo
        (compartido entre `ListaTab` y el detalle de cartera): agrega un rótulo "próximo" en Faro
        cuando `date > hoy` (`isFutureDay` nuevo en `lib/date.ts`). No es un bug de orden (`-date`
        ordenando "lo más nuevo arriba" es correcto tal cual) sino de falta de separación visual.
        Verificado en el navegador con una transacción real fechada a futuro.
      - **Subtipo "Banco" en vez de "Efectivo" al editar esa cartera** — confirmado contra el
        modelo real, no era un bug de datos: `wallet.kind` llega bien desde el backend. Es una
        carrera de un solo frame en `WalletForm.tsx`: el `useState` de `kind` arranca en `'bank'`
        (default de cartera nueva) y sólo se corrige en un `useEffect` que corre *después* de
        pintar -- entre que `existing.isLoading` pasa a `false` y ese efecto corre, hay un render
        de tránsito donde el formulario ya se ve pero con los defaults viejos. Fix: la pantalla
        espera también a `prefilled` (que el efecto prende al final, después de aplicar todos los
        campos), no sólo a `isLoading` -- y de paso se agregó el `ErrorState` que le faltaba a esa
        carga (si no, con la carrera cerrada por `prefilled`, una carga fallida hubiera dejado el
        formulario pegado en "Cargando…" para siempre en vez de mostrar el error). Verificado en
        el navegador con una cartera "Efectivo" real (`kind=cash`): Subtipo abre en "Efectivo".

      `tsc`/`expo lint`/`jest` limpios en cada paso de esta fase — 39 suites / 210 tests, sin
      regresiones.

---

## Preguntas abiertas

Resueltas — ver "Decisiones (14 sep 2026)" al principio del documento.
