# Backlog — Auditoría de Producto (porsupuesto-audit-plan.md)

> Generado a partir de `~/Downloads/porsupuesto-audit-plan.md` (auditoría del 14 sep 2026 contra
> **producción**, money.wxlter.dev) y contrastado contra el código real en `feat/financial-calendar`.
>
> **Importante:** el repo local va adelante de lo que se auditó. Varios hallazgos ya están resueltos
> aquí (ver "✅ Ya resuelto" en cada sección) — no los volvamos a trabajar. Todo lo marcado
> "⚠️ Verificar" no se confirmó contra código, solo contra la descripción del audit.
>
> Formato: `[ ]` pendiente, `[x]` hecho. Referencias de archivo entre backticks son reales (leídas del repo).

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

- [ ] **Fila de transacción sin nombre accesible explícito**
  `TransactionRow.tsx` — el `Pressable` principal (línea ~101-113) tiene `accessibilityRole`
  pero no `accessibilityLabel`; solo el botón anidado "Eliminar movimiento" lo tiene. En web
  probablemente hereda nombre del texto hijo, pero conviene un label explícito y descriptivo
  (ej. `"Transferencia, Banco Agrícola a Fondo de emergencias, USD 150.00"`) para no depender
  de heurística de accesibilidad del navegador.
- [ ] **Selector de workspace sin `accessibilityLabel`**
  `WorkspaceSwitcher.tsx` línea ~53-61 — el botón "Casa ⌄" no anuncia que es un selector
  de presupuesto/workspace. Agregar `accessibilityLabel="Cambiar de presupuesto, actual: {nombre}"`.
- [ ] Auditar rápido el resto de `Pressable`/`TouchableOpacity` sin `accessibilityLabel` en
  componentes de alta superficie (`WalletRow`, `CategoryGrid`, `CalendarGrid`) — no se
  verificaron todos en esta pasada.

### Design tokens base (sin tocar composición visual todavía)

- [ ] Revisar `src/theme/` — confirmar si ya existen tokens semánticos `positive/caution/danger`
      o si todo pasa por `colors.expense`/`colors.income`/`colors.primary` sin un tercer estado
      "cerca del límite". Esto es prerequisito directo del fix de P0-3.
- [ ] Confirmar escala de radios/espaciado actual (`tailwind.config.js`, `theme/index.ts`) contra
      la propuesta de tokens del audit (§4.1) antes de decidir si vale la pena formalizarla o si
      ya es razonablemente consistente (varias pantallas leídas ya usan `rounded-3xl` consistente).

---

## Fase 2 — Core UX

- [ ] Fusionar tabs "Restante"/"Información" del Presupuesto en un solo toggle sobre el mismo
      número (verificar si `budgets.tsx` todavía tiene esta duplicación).
- [ ] Confirmación consistente para acciones destructivas ("Eliminar transacción") — verificar
      el flujo real de borrado (no se probó en el audit para no tocar datos reales).
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

## Preguntas abiertas antes de arrancar

1. **¿Seguimos con "Ledger Brutalism" (Fase 3) o priorizamos primero cerrar Fases 1-2** (bugs +
   accesibilidad + UX), dejando la identidad visual para después? Es la pieza de mayor esfuerzo
   del documento y toca casi todos los componentes.
2. ¿La auditoría se hizo contra `money.wxlter.dev` (producción) — sabes si ese deploy corresponde
   a `main` actual o está más atrás? Cambia cuánto del resto del documento (secciones no
   verificadas acá: Trends, Categorías, Tendencias, Carteras) sigue vigente.
3. Fase 4 (bootstrap ~12 requests, P1-5) requiere cambios de backend (`budget-api-*.run.app`,
   repo `budget-app-django`) — ¿esa parte la trabajamos en este repo o coordinamos aparte?
