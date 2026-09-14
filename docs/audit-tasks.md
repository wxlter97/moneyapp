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

## Fase 1 — Foundations (bugs reales + accesibilidad + tokens)

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
  - Pendiente opcional: aplicar el mismo tratamiento de 3 estados al anillo de "restante"
    si usa lógica propia — no se revisó `src/components/ui/Ring.tsx` en esta pasada.

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

- [ ] Revisar `src/theme/` — confirmar si ya existen tokens semánticos `positive/caution/danger`
      o si todo pasa por `colors.expense`/`colors.income`/`colors.primary` sin un tercer estado
      "cerca del límite". Esto es prerequisito directo del fix de P0-3.
- [ ] Confirmar escala de radios/espaciado actual (`tailwind.config.js`, `theme/index.ts`) contra
      la propuesta de tokens del audit (§4.1) antes de decidir si vale la pena formalizarla o si
      ya es razonablemente consistente (varias pantallas leídas ya usan `rounded-3xl` consistente).

---

## Fase 2 — Core UX

- [ ] **Corrección: no son tan idénticas como dice el audit.** Confirmado en `(tabs)/budgets.tsx`:
      "Restante" muestra el `Ring` grande + la lista de grupos; "Información" reemplaza el ring
      por una card "Total del período" (presupuestado/gastado/disponible) y le agrega
      `showProvision` a cada `GroupCard` (línea de provisión acumulada, ausente en "Restante").
      La lista de categorías de abajo sí se repite igual entre ambas. Pendiente real, más acotado
      que "fusionar en un toggle": decidir si esa diferencia (ring visual vs. desglose numérico +
      provisión) amerita 2 tabs o si cabe todo en una sola vista — no es un bug, es una decisión
      de producto.
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
- [ ] Vista unificada "Próximos pagos" cruzando Recurrentes + Compras a plazo — confirmar si
      ya existe algo parcial dado que el repo ya tiene `installment/` y `recurring/` como rutas
      separadas (`src/app/(app)/installment`, `src/app/(app)/recurring`).
- [ ] Revisar si "Historial" (header) y Herramientas → Análisis → Patrimonio siguen siendo dos
      entradas a la misma pantalla `/net-worth-history`.

---

## Fase 3 — Visual identity ("Ledger Brutalism", si se decide seguir esa dirección)

> Nota: no se decidió todavía si adoptar la propuesta de identidad del audit (§6) — es la más
> grande en esfuerzo (P1, Effort L) y afecta a casi todos los componentes de UI. Vale la pena
> confirmarla con Walter antes de empezar (ver pregunta abajo).

- [ ] Bordes de 1px en vez de sombras difusas en `Card`, `TabBar`/`GlassSurface`, etc.
- [ ] Tipografía tabular obligatoria en cifras de dinero (`Money.tsx`, `AmountInput.tsx`) —
      confirmar si `theme/typography.ts` ya define una familia mono/tabular.
- [ ] Reescribir `ProgressBar` con los 3 estados semánticos de Fase 1 como parte del mismo trabajo.
- [ ] Iconografía propia de categoría en vez de emoji (`CategoryAvatar.tsx`, `CategoryGrid.tsx`) —
      cambio grande, evaluar esfuerzo real primero.

---

## Fase 4 — Dashboard / información financiera

- [ ] Estado explícito de "aún no hay suficiente historial" en `NetWorthChart.tsx`/`NetWorthPager.tsx`
      cuando hay <3 puntos — el código actual solo chequea `snapshots.length === 0`, no maneja el
      caso de 1-2 puntos (parece confirmarse el hallazgo del audit, sin verificar el render exacto).
- [ ] Resumen de deuda de tarjetas en el dashboard ("Debes en tarjetas: USD X").
- [ ] **Corrección: sí existe onboarding** — `src/app/(app)/onboarding.tsx` (8 pasos: bienvenida,
      presupuestos/workspaces, carteras, crear primera cartera, categorías, cómo cargar un
      movimiento, "y hay más", listo). Es un tour operativo, no vende diferenciación todavía —
      pendiente real: revisar si el copy engancha con "cuotas y recurrentes / multi-cartera y
      moneda / presupuesto por categoría" como ganchos explícitos (lo que pedía el audit en
      §1.1), no reescribirlo desde cero.
- [ ] Bootstrap del dashboard: contar requests reales de red (Network tab) del dashboard actual
      para ver si sigue el patrón de ~12 requests secuenciales del audit, antes de invertir en
      agregación de backend (P1, Effort L, depende de `budget-api-*` en Cloud Run).

---

## Fase 5 — Mobile / responsive

- [ ] Layout propio de tablet (2 columnas en Presupuesto/Carteras a ~768-1024px) — confirmar si
      `useIsDesktop`/`useResponsive` (`src/lib/responsive`) ya tiene un breakpoint intermedio o
      es binario mobile/desktop como describe el audit.
- [ ] Formularios full-screen también en desktop — revisar `TransactionForm.tsx`, `WalletForm.tsx`
      y si usan `Screen` full-bleed en desktop; evaluar variante `Drawer` (no existe hoy, confirmado
      por grep).
- [ ] Carrusel "De un vistazo" (`NetWorthPager.tsx`) sin soporte de mouse/click-en-dots en desktop.

---

## Fase 6 — Polish

- [ ] Skeletons de layout en vez de spinner — no existe ningún componente Skeleton hoy (confirmado
      por grep). Empezar por dashboard y detalle de cartera.
- [ ] Motion: números que cuentan al cambiar de mes/categoría; transición de color de `ProgressBar`
      al cruzar 80%/100% (depende del fix de Fase 1).
- [ ] Revisar `prefers-reduced-motion` en las animaciones de Reanimated existentes.
- [ ] Casos límite de §11 del audit: orden de transacciones futuras/recurrentes vs. históricas en
      listas; subtipo por defecto incorrecto al editar cartera "Efectivo" (bug de datos a confirmar
      contra el modelo real, no contra la UI).

---

## Preguntas abiertas

Resueltas — ver "Decisiones (14 sep 2026)" al principio del documento.
