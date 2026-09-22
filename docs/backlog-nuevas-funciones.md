# Backlog — funciones nuevas (18 sep 2026)

> **Estado (22 sep 2026): implementados el 1 (base de IA), el 2 (recibos), el 3 completo (texto
> libre y voz/dictado), el 5 (chat) y el 6 (resumen mensual). Telegram (3.1), el 4 (analítica),
> el 7 (DTE/QR) y el 8 quedaron diferidos por decisión, no por bloqueo técnico.** Este archivo existe
> para tener el diseño mapeado en el repo y poder retomarlo sin volver a discutirlo. Formato:
> `[ ]` pendiente, `[x]` hecho. Las referencias entre backticks son archivos reales, leídos
> del repo.
>
> Abarca los dos repos: `moneyapp` (Expo/RN) y `budget-app-django` (backend). Cada punto
> separa el trabajo por repo y, aparte, **lo que hay que configurar por fuera del código**
> (cuentas, keys, dominios) — que es lo que suele frenar estas cosas más que el código.
>
> Lo ya implementado que está esperando configuración tuya vive en otro archivo:
> `budget-app-django/CONFIG-PENDIENTE.md`.
>
> **Para saber qué sigue y en qué orden, empezá por `budget-app-django/ROADMAP.md`**, que junta
> esto con todo lo que falta para salir a producción y lleva el estimado de tiempo.

## Decisiones tomadas (18 sep 2026)

1. **Proveedor de IA: Gemini (Google), con una sola API key del proyecto.** La key vive
   **sólo en el backend**: nunca en el bundle de Expo (todo lo que es `EXPO_PUBLIC_*` queda
   embebido y a la vista). Elegido por ser el más barato por token con visión (recibos) y
   tener capa gratis para probar. La app le habla a nuestro backend, y el backend a Gemini.
2. **Los cuatro casos de uso de IA están en alcance:** recibos, entrada por texto libre,
   chat sobre los datos propios, y resumen/consejos mensuales.
3. **Canales de ingreso: Telegram y voz/dictado en la app.** WhatsApp queda fuera por ahora
   (requiere WhatsApp Business API, verificación de negocio y costo por conversación).
4. **Analítica: web ahora, nativo cuando exista build de tiendas.** Hoy el uso real es la web
   en Vercel y no hay ni `extra.eas.projectId` en `app.json`.
5. **Hosting del front: mover a Cloudflare Pages.** El plan Hobby de Vercel no permite uso
   comercial, y el build es estático (`expo export -p web`), así que Pages hace lo mismo gratis,
   con banda ilimitada y sin esa restricción. Pasos en `budget-app-django/DEPLOY.md` §3 opción C;
   comparación de opciones en `budget-app-django/COSTOS-Y-ESCALA.md`.

---

## 1. Base de IA (hace falta antes de los puntos 2 a 5)

> **Implementada el 18 sep 2026.** Falta sólo la key y las dos decisiones de privacidad de más
> abajo. Lo que sigue queda como registro de qué se hizo y por qué.

Una app nueva `apps/ai` en el backend, que es el único lugar que conoce la key y el único que
habla con Gemini. Todo lo demás la usa por dentro.

**Backend (`budget-app-django`)**
- [x] `apps/ai/client.py` — envoltorio fino sobre la API REST de Gemini: timeout, **un** reintento
      (sólo de lo que tiene sentido reintentar: red, timeout, 429/5xx; un 400 va a fallar igual),
      y todo fallo traducido a `AIUnavailable`. Nada de lo que devuelve Google — ni el cuerpo del
      error, que puede traer el prompt de vuelta — llega al usuario.
- [x] `GEMINI_API_KEY` en `settings` + `.env.example`. **Vacía = todas las funciones de IA se
      apagan solas** y `GET /api/v1/ai/status/` responde `enabled: false`.
- [x] Throttle propio (`THROTTLE_AI`, scope `ai`, 12/min por defecto) además del límite normal
      de DRF. Es contra la ráfaga; el tope real es la cuota mensual.
- [x] **Tope de consumo por usuario y por mes**, atado al plan (`apps/ai/quotas.py`). Los números
      viven en `Plan.features` (`ai_receipts_per_month`, `ai_parses_per_month`,
      `ai_chats_per_month`), sembrados por `seed_billing_plans`, así que ajustarlos no lleva
      deploy. **Fail-closed a propósito**, al revés que el resto de los feature flags de
      `apps.billing`: un plan sin esas claves aplica los números del gratis, porque acá el costo
      de equivocarse es una factura y no una pantalla de más.
- [x] Registro de cada llamada en `AIUsage` (operación, modelo, tokens, costo estimado en
      millonésimas de dólar, latencia, éxito/error). **Sin nada de lo que el usuario escribió ni
      de lo que la IA respondió.** La misma tabla es el contador de la cuota: un contador aparte
      terminaría discrepando con el log.
- [x] `services.run()` como único camino: chequea cuota → llama → registra. Una llamada que falla
      del lado de Google se registra pero **no le come la cuota al usuario**.

**Frontend (`moneyapp`)**
- [x] `useAIStatus()` (`src/api/queries/index.ts`) — el único lugar que pregunta si la IA existe
      y cuánto queda, igual que `vapidPublicKey()` con los push. Todas las entradas de IA van a
      colgar de acá, así que sin key en el backend simplemente no aparecen.

**Privacidad — decidir antes de escribir código**
- [ ] `src/app/(app)/privacy.tsx` va a necesitar una sección nueva: qué se manda a Gemini,
      qué no, y si Google puede usarlo para entrenar (con la API de pago **no** se usa para
      entrenar; con la capa gratis **sí** — no usar la capa gratis con datos reales de nadie
      más que vos).
- [ ] Decidir si la IA se aplica sobre datos de un workspace compartido sin avisarles a los
      demás miembros. Mi sugerencia: un toggle por workspace, apagado por defecto, y que sólo
      el dueño lo pueda prender.

---

## 2. Leer y clasificar recibos

> **Implementado el 19 sep 2026.** Sólo falta la `GEMINI_API_KEY` (y `GS_BUCKET_NAME`, o los
> recibos confirmados se borran en cada deploy).

**Lo que ya existe y se reusa (no hay que construirlo)**
- `Transaction.receipt` (`FileField`) con su `receipt_upload_path`, servido por el propio API
  en `/transactions/{id}/receipt/` y nunca por una URL directa del storage.
- `expo-image-picker` ya configurado en `app.json`, con permisos de cámara y fotos en español.
- `guess_category_by_merchant` y `find_possible_duplicates` en `apps/transactions/services.py`.

**Backend** (`apps/ai/receipts.py`)
- [x] `POST /api/v1/ai/receipt/` — recibe la imagen o PDF, devuelve una **candidata** (monto,
      fecha, comercio, moneda, categoría sugerida y, si se puede leer, los ítems) con un nivel
      de confianza por campo. **No crea la transacción.**
- [x] Orden de resolución de la categoría: primero `guess_category_by_merchant` (gratis y
      determinista), y recién si no acierta, la sugerencia de la IA. Nunca al revés. La
      sugerencia del modelo sólo matchea categorías **asignables** del workspace: sugerir un
      grupo daría una transacción que no se puede guardar.
- [x] Pasar la candidata por `find_possible_duplicates` antes de devolverla, para que la app
      pueda avisar "esto parece que ya lo registraste".
- [x] Guardar el recibo como `Transaction.receipt` cuando el usuario confirma, no antes. Un
      escaneo descartado no deja nada en el bucket.
- [x] **Normalización defensiva**, que resultó ser lo más importante: un monto que no parsea,
      negativo o absurdo queda vacío y marcado en vez de inventado; una fecha futura o de hace
      más de dos años (típico año mal leído en tickets térmicos) cae a hoy; el modelo no puede
      declararse seguro de un campo que no se pudo usar.

**Frontend** (`src/components/ReceiptScanButton.tsx`)
- [x] En el alta de transacción: botón "Escanear recibo" → cámara/galería/PDF → los campos del
      mismo formulario ya llenos y **editables**, con un resumen que nombra los de baja
      confianza. El usuario siempre confirma; nada se guarda solo.
- [x] El botón no aparece si el backend no tiene IA; con la cuota agotada queda deshabilitado
      diciendo por qué, en vez de desaparecer como si la función no existiera.
- [x] El archivo escaneado queda como `pendingReceipt` y se sube solo al confirmar: el usuario
      no elige la foto dos veces.

**Configuración externa:** ninguna aparte de `GEMINI_API_KEY`. Ojo: esto **necesita**
`GS_BUCKET_NAME` configurado, o los recibos se pierden en cada deploy (ver `CONFIG-PENDIENTE.md`).

---

## 3. Entrada por texto libre (NLP) y canales

> **El parser está implementado el 19 sep 2026.** Los canales (Telegram, voz) siguen
> pendientes y entran por el mismo endpoint, sin formato nuevo.

**Lo que ya existe y se reusa**
- `apps/quickadd` completo: `PersonalAccessToken` por cartera, endpoint de alta rápida con su
  propio throttle (`quick_add`) y `AUTO_CATEGORY` para dejar que el backend elija categoría.
  Es exactamente la puerta que ya usa el Atajo de Apple.
- `guess_category_by_merchant` y `find_possible_duplicates`.

**Backend** (`apps/ai/parsing.py`)
- [x] `POST /api/v1/ai/parse/` — texto libre ("gasté 12.50 en almuerzo con la tarjeta", "me
      pagaron 800") → candidata estructurada (tipo, monto, moneda, fecha relativa resuelta,
      cartera si la nombra, categoría, nota). Devuelve candidata, no transacción. **Misma forma
      de respuesta que `/ai/receipt/`**, para que el cliente la muestre con la misma pantalla y
      los canales que vienen no inventen un formato nuevo.
- [x] Reusar `find_possible_duplicates` igual que en los recibos, contra la cartera que nombró
      la frase o, si no nombró ninguna, la que el cliente ya tenía elegida.
- [x] **Al modelo se le dan los nombres reales de carteras y categorías** y se le pide que elija
      de esa lista. Sin eso, "con la tarjeta" vuelve como texto libre que hay que adivinar.
      Las carteras privadas ajenas **no entran al prompt**: que el modelo las viera ya sería
      filtrarlas. Y lo que responde se matchea contra esa misma lista, nunca contra la base de
      nuevo, así que no puede resolver algo que el usuario no podía elegir.
- [x] La normalización que ya usaban los recibos se mudó a `apps/ai/normalize.py`, compartida
      por las dos entradas (y por la voz, que es la misma con audio).

**Frontend** (`src/components/ParseTextField.tsx`)
- [x] Campo de una línea en el alta: se escribe la frase, se llenan los campos del mismo
      formulario. Mismas reglas que el escaneo: no aparece sin IA en el backend, con la cuota
      agotada queda deshabilitado diciendo por qué, y si falla la frase queda escrita para
      reintentar sin volver a tipearla.
- [x] Sirve para gasto e ingreso (la frase puede decir "me pagaron"), a diferencia del escaneo,
      que es sólo gasto.

### 3.1 Telegram
> **Diferido por decisión (22-sep-2026).** No es prioridad ahora; queda diseñado para retomar.

- [ ] Bot con token de @BotFather (gratis), webhook a `POST /api/v1/channels/telegram/`,
      verificado con el `secret_token` del propio webhook de Telegram (mismo criterio que
      `INBOUND_WEBHOOK_SECRET`: sin secreto, el endpoint rechaza todo).
- [ ] **Vinculación de cuenta:** deep link con un token de un solo uso generado desde la app
      (Herramientas → Canales). Reusar el patrón de `PersonalAccessToken`, que ya guarda a qué
      cartera va lo que entra por ese token. Un chat de Telegram sin vincular no debe poder
      escribir nada.
- [ ] El bot responde con la candidata y dos botones (Confirmar / Descartar). Confirmar es lo
      que crea la transacción.
- **Configuración externa:** crear el bot (2 minutos) y setear `TELEGRAM_BOT_TOKEN`.

### 3.2 Voz / dictado en la app

> **Implementado el 22 sep 2026.**

- [x] `expo-audio` instalado (`57.0.5`, la que matchea el SDK 57 del repo — instalada leyendo
      los tipos del propio paquete, ya que `docs.expo.dev` está bloqueado por la política de red
      de este entorno; **vale la pena una pasada por la doc real cuando se pueda**, ver
      `AGENTS.md`).
- [x] `POST /api/v1/ai/voice/` — el audio va a Gemini como `inline_data` con `has_audio=True`
      (mismo precio de audio que ya tenía `pricing.py`) y sale por el mismo parser que el texto
      libre: `apps/ai/parsing.py` se separó en un contexto compartido
      (`_build_context`/`_candidate_from_response`) y `parse()`/`parse_audio()` arriba de eso.
      Comparte la cuota de `parse`, no es una operación aparte.
- [x] Botón de dictado (`VoiceInputButton`) en el alta de transacción, junto al campo de texto
      libre. En nativo graba `.m4a` (AAC) con `RecordingPresets.HIGH_QUALITY`. En web, el
      `mimeType` de `MediaRecorder` se fuerza a `audio/mp4` (el único que Gemini documenta que
      además sabe grabar un navegador) — **Safari lo soporta, Chrome/Firefox de escritorio no**;
      en esos navegadores el botón directamente no aparece (mismo criterio que "sin IA no se
      muestra el botón, en vez de mostrarlo y fallar al tocarlo"), en vez de grabar en un
      formato que el backend termina rechazando.

---

## 4. Analítica — decidido: sin cookies (Umami Cloud)

> **Decisión tomada el 22-sep-2026: opción 1, analítica sin cookies.** Quedan documentadas las
> tres salidas que se evaluaron, en orden de lo que se recomendaba:
>
> 1. **Analítica sin cookies** (Plausible o Umami, self-hosted o de pago): da páginas vistas,
>    fuentes y embudos sin cookies ni datos personales, y la política actual sigue siendo
>    cierta. Pierdes las grabaciones de sesión de Clarity. **Elegida.**
> 2. GA4 + Clarity con banner de consentimiento, cargando los scripts sólo después del "sí", y
>    reescribiendo esa sección de la política. Más insight de UX, pero más trabajo y más
>    responsabilidad legal.
> 3. Eventos propios en el backend: cero terceros, pero hay que construir hasta el gráfico más
>    simple.

**Implementado (22-sep-2026): Umami Cloud**
- [x] `src/lib/analytics.ts` — envoltorio `track(event, data)` sobre `window.umami`, no hace
      nada si el script no cargó (sin `EXPO_PUBLIC_UMAMI_WEBSITE_ID`, nativo, o bloqueado) para
      que un tracker caído nunca rompa la acción real.
- [x] El script se inyecta en `scripts/pwa-postbuild.js`, **no** en `src/app/+html.tsx`: con
      `web.output: "single"` Expo genera su propio `index.html` e ignora ese archivo por
      completo (ver el comentario del propio script) — confirmado con un build real
      (`expo export -p web && node scripts/pwa-postbuild.js`), con y sin la variable puesta.
      Umami no usa cookies ni identifica personas: la política de privacidad sigue siendo
      cierta tal cual está, sin banner de consentimiento.
- [x] Eventos: alta de transacción (`transaction_created`, con el canal: manual/recibo/texto/voz
      — Telegram queda para cuando se retome, ver punto 3.1), presupuesto creado
      (`workspace_created`), invitación aceptada (`invitation_accepted`), inicio de trial
      (`trial_started`), y el par `onboarding_started`/`onboarding_finished` como proxy de
      abandono (quien empieza y nunca manda el segundo evento cerró la app o navegó afuera).
- **Configuración externa:** cuenta gratis en `cloud.umami.is`, `EXPO_PUBLIC_UMAMI_WEBSITE_ID`
  en el entorno de build de Cloudflare Pages (mismo lugar que el resto de `EXPO_PUBLIC_*`).

**Nativo (cuando haya build de tiendas)** — queda de cuando se evaluaba GA4/Clarity; con la
decisión de ir sin cookies esto no aplica salvo que se reconsidere para nativo específicamente.
- [ ] GA4 nativo = `@react-native-firebase/analytics`: necesita **dev client / EAS Build** (no
      corre en Expo Go) más `google-services.json` y `GoogleService-Info.plist`.
- [ ] Clarity nativo = `@microsoft/react-native-clarity` (el paquete `react-native-clarity`
      viejo está camino a deprecarse). También necesita build nativo; no hay config plugin de
      Expo oficial, así que hay que verificar cómo entra en el prebuild.
- [ ] Va junto con la primera subida a tiendas, que ya requiere `eas init` y credenciales
      (ver `CONFIG-PENDIENTE.md`, prioridad 3).

---

## 5. Chat sobre tus finanzas

> **Implementado el 22 sep 2026.**

**Backend** (`apps/ai/chat.py`)
- [x] `POST /api/v1/ai/chat/`. **No le da acceso a la base ni genera SQL:** dos llamadas a
      Gemini, no `tools` nativas de la API. La primera sólo ELIGE una función cerrada de
      `apps/reports/services.py` (`budget_vs_actual`, `spending_by_category`,
      `monthly_cashflow`, `upcoming_scheduled`, `behavior_insights`) o ninguna; la segunda sólo
      redacta con lo que esa función devuelve, ejecutada en código, nunca por el modelo. Las dos
      llamadas cuentan como **una sola** unidad de la cuota de chat, no dos.
- [x] Todas las lecturas pasan por las funciones de `apps/reports/services.py` que ya usan
      `visible_transactions(workspace, user)` — el aislamiento por workspace lo hereda de ahí,
      no hay una query nueva que pueda saltárselo.
- [x] El prompt de la segunda llamada exige citar período y moneda base en toda cifra, y avisar
      si algo quedó afuera por no tener tasa de cambio (mismo criterio que el resto de la app:
      se excluye, no se estima).
- [x] El prompt de la primera llamada dice explícitamente que una pregunta de inversión o que no
      tenga que ver con las finanzas del workspace elige `function: "none"` con un motivo corto,
      en vez de intentar responderla igual.

**Frontend** (`src/app/(app)/chat.tsx`)
- [x] Pantalla de chat en Herramientas → Análisis, con historial sólo en memoria de la pantalla
      (no se guarda ni se lee del servidor) y un aviso fijo arriba de la conversación de que
      puede equivocarse y no da consejos de inversión.

---

## 6. Resumen y consejos mensuales

> **Implementado el 22 sep 2026.**

**Lo que ya existía y se reusó**
- `behavior_insights()` en `apps/reports/services.py` con sus 6 detectores (fin de semana,
  después de cobrar, gasto hormiga, día pico, alza de categoría, alza de frecuencia) —
  **sin cambios**: la detección sigue siendo 100% determinista, la IA sólo redacta.
- `notify_insights()`, el kind `insight` y el toggle `warn_insights` — se dejaron intactos: el
  resumen mensual es un aviso aparte, no un reemplazo (dos toggles independientes a propósito).

**Backend** (`apps/ai/summary.py` + `apps/notifications/services.py`)
- [x] `apps/ai/summary.generate()` toma la salida de `behavior_insights()` (títulos y cuerpos) y
      la pasa por Gemini para redactar **un** texto que los conecta, en 2-4 oraciones. Si Gemini
      no responde, `notifications.services._monthly_summary_text` cae al texto armado a mano
      concatenando los mismos títulos y cuerpos — nunca se manda "nada".
- [x] Kind nuevo `monthly_summary` (no reusa `insight`), con su propio
      `NotificationPreference.warn_monthly_summary`. `notify_monthly_summary()` corre el día 1
      de cada mes, sobre `behavior_insights()` calculado con el último día del mes que terminó.
      No consume cuota (`OP_SUMMARY` no está en `quotas.PLAN_FEATURE_KEYS`): lo dispara el
      servidor, no el usuario.

**Frontend**
- [x] El resumen mensual llega como una notificación más del centro de notificaciones
      (`Notification.kind = "monthly_summary"`) — no necesitó ícono ni ruta nuevos en
      `KIND_ICON`/`notificationRouting.ts` porque no abre una pantalla propia, igual que
      `insight`.
- [x] Toggle propio ("Resumen mensual") en `NotificationsScreen.tsx`, junto a "Patrones de
      gasto".

---

## 7. Escaneo de QR de facturas (DTE de Hacienda, El Salvador)

Investigado el 18 sep 2026. **El QR solo no alcanza para llenar una transacción**, y conviene
saberlo antes de invertir en esto:

- El QR de un DTE lleva a la **consulta pública** de Hacienda
  (`admin.factura.gob.sv`, con el *código de generación* y la fecha de emisión). Esa página
  confirma que el documento existe y su estado (aprobado, anulado, rechazado) y muestra un
  **resumen sin datos del emisor ni del receptor**. Sirve para *validar*, no para obtener el
  detalle.
- El detalle completo (ítems, IVA, NIT, total) está en el **JSON del DTE que el emisor está
  obligado a mandarte por correo** junto al PDF.

**Por eso el plan tiene dos mitades, y la segunda es la que más rinde:**

- [ ] **QR (captura rápida).** `expo-camera` para leer el código, extraer código de generación
      y fecha, y guardarlos en la transacción como comprobante verificable. Opcionalmente
      consultar el portal para confirmar que el DTE existe y no está anulado.
      Cuidado: depender de raspar una página pública del gobierno es frágil; que el fallo no
      bloquee el alta.
- [ ] **JSON del DTE por correo (el detalle de verdad).** Reusar `apps/email_import` completo:
      ya recibe correos por webhook, ya tiene `EmailImportLog` con candidatas pendientes de
      confirmación y ya detecta duplicados. Falta un parser de DTE en JSON — que es **formato
      estándar y estable**, muchísimo más confiable que parsear el HTML de un banco. Con esto
      una factura entra con sus ítems y su IVA sin que el usuario escriba nada.
- [ ] Decidir si los ítems del DTE se guardan (hoy no hay modelo de ítems de transacción; la
      división entre personas existe, pero no un desglose de línea de factura). Sin eso, del
      DTE sólo se aprovecha la cabecera.
- **Configuración externa:** para la mitad del correo, la importación por correo tiene que estar
  configurada (ver `CONFIG-PENDIENTE.md`, prioridad 2). Ninguna para el QR.

---

## 8. Cómo nos posicionamos frente a mipisto.net — no se pudo hacer

- [ ] **Bloqueado desde esta sesión.** `mipisto.net` está bloqueado por el proxy de red del
      entorno (`403` en el túnel CONNECT, tanto por herramienta como por `curl`), y no aparece
      indexado en la búsqueda web disponible acá. No hay forma de verlo desde este sandbox.
- Para desbloquearlo, cualquiera de estas sirve: (a) agregar el dominio a la política de red
  del entorno de Claude Code en la web, (b) pegar acá el contenido de la landing y su lista de
  funciones y precios, o (c) correr esta parte desde una sesión local, donde no hay proxy.
- Cuando se pueda, el análisis que vale la pena es contra lo que esta app ya tiene y que casi
  ninguna competencia local suele tener: workspaces compartidos con carteras privadas,
  importación por correo bancario, programas de lealtad de tarjetas por categoría,
  multi-moneda con tasas propias, y los insights de comportamiento.

---

## Costos de IA y topes por plan

> **Actualización del 20 sep 2026: las tablas de abajo quedaron viejas.** Se calcularon con los
> modelos 2.5, que **ya no están disponibles para cuentas nuevas** (la API responde 404 aunque
> figuren en la lista de modelos). Hoy el texto libre y el chat van en `gemini-3.5-flash-lite`
> (`$0.30` entrada / `$2.50` salida por millón de tokens) y los recibos, el resumen y el audio en
> `gemini-3.8-flash` (`$0.75` / `$3.75` **hasta el 31-dic-2026**, `$1.50` / `$7.50` desde el
> 1-ene-2027). Mismos tokens que en las tablas de abajo. **No incluye los tokens de razonamiento**
> de los 3.x, que se cobran como salida y pueden subir estas cifras; `AIUsage` los va a mostrar
> desde la primera llamada real.
>
> | Operación | Modelo | Ahora (promo) | Desde 1-ene-2027 |
> |---|---|---|---|
> | Parseo de texto libre | 3.5 Flash-Lite | ~$0.0005 | ~$0.0005 |
> | Dictado de voz (5 s) | 3.8 Flash | ~$0.0010 | ~$0.0021 |
> | Recibo (foto, 1.5–3k tokens) | 3.8 Flash | ~$0.0028–0.0034 | ~$0.0056–0.0067 |
> | Pregunta de chat | 3.5 Flash-Lite | ~$0.0022 | ~$0.0022 |
> | Resumen mensual | 3.8 Flash | ~$0.0024 | ~$0.0048 |
>
> | Perfil de usuario | Ahora (promo) | Desde 1-ene-2027 |
> |---|---|---|
> | Ligero | ~$0.010 (1% de $0.99) | ~$0.018 (2%) |
> | Medio | ~$0.057 (6%) | ~$0.092 (9%) |
> | Intensivo | ~$0.23 (23%) | ~$0.37 (37%) |
> | Sin tope (500 recibos + 500 chats) | ~$2.51 (253%) | ~$3.91 (395%) |
>
> | Plan (topes de abajo) | Techo de costo ahora | Techo desde 1-ene-2027 |
> |---|---|---|
> | Free | ~$0.015 | ~$0.025 |
> | Plus ($0.99) | ~$0.17 (**17%**, antes 9%) | ~$0.27 (27%) |
> | Pro ($1.99) | ~$0.66 (**33%**, antes 18%) | ~$0.99 (**50%**) |
>
> Techos calculados con recibos de 3 000 tokens (el peor caso razonable). **La comisión del
> procesador de pagos no está incluida**, y a estos precios pesa más que los tokens (ver la nota
> al final de esta sección). Conclusión que mueve una decisión: con los modelos vigentes el
> techo de Pro se come la mitad de su precio en 2027, así que conviene revisar el tope de Pro
> o el precio **antes** de encender la IA para todos.


Calculado el 18 sep 2026 con los precios de la API de Gemini de esa fecha (tier de pago) y
los precios de plan que siembra `manage.py seed_billing_plans`: **Plus $0.99/mes · $9.99/año**,
**Pro $1.99/mes · $14.99/año · $19.99 lifetime**.

**Precio de los modelos** (por millón de tokens): 2.5 Flash-Lite `$0.10` entrada / `$0.40`
salida · 2.5 Flash `$0.30` / `$2.50`, audio de entrada `$1.00` · 3.5 Flash `$1.50` / `$9.00` ·
3.1 Pro `$2.00` / `$12.00`. **Los precios de los Flash son promocionales hasta fin de 2026**,
así que el tope y el registro de consumo van en código desde el día uno, no en una planilla.

**Costo por operación** (estimado; los tokens de una imagen dependen de su tamaño):

| Operación | Modelo | Tokens aprox. | Costo |
|---|---|---|---|
| Parseo de texto libre | 2.5 Flash-Lite | 630 in / 120 out | ~$0.0001 |
| Dictado de voz (5 s ≈ 160 tokens de audio) | 2.5 Flash | 800 in / 120 out | ~$0.0005 |
| Recibo (foto) | 2.5 Flash | 1.5–3k in / 300 out | ~$0.0017 |
| Pregunta de chat (2 vueltas con herramientas) | 2.5 Flash | ~4k in / 400 out | ~$0.0022 |
| Resumen mensual | 2.5 Flash | 1.2k in / 400 out | ~$0.0014 |

**Costo de IA por usuario al mes:**

| Perfil | Uso mensual | Costo | Sobre Plus ($0.99) |
|---|---|---|---|
| Ligero | 5 parseos, 2 recibos, 1 resumen | ~$0.004 | 0.4% |
| Medio | 25 entradas (5 por voz), 10 recibos, 5 chats, resumen | ~$0.03 | 3% |
| Intensivo | 80 entradas (20 por voz), 40 recibos, 30 chats, resumen | ~$0.12 | 12% |
| Sin tope | 500 recibos + 500 chats | ~$1.95 | **197% — pérdida** |

**Conclusiones que mandan sobre el diseño:**

1. **El chat es más de la mitad del costo del usuario intensivo.** Corriéndolo en Flash-Lite baja
   de `$0.0022` a `~$0.0006` por pregunta. Y como el prompt de sistema y el esquema de funciones
   son idénticos en todas las llamadas, el *context caching* recorta otra parte grande de la
   entrada. Con las dos cosas, el intensivo cae de ~12 ¢ a ~5 ¢.
2. **El riesgo es el tope, no el precio unitario.** Una cuenta sin límite se come el plan entero.
3. **El lifetime de $19.99 es la exposición real:** un usuario intensivo son ~14 años de IA sólo
   para empatar ese pago único. Decisión tomada: **el lifetime no lleva IA ilimitada**, lleva la
   misma cuota mensual que Pro.
4. **Free no lleva IA** (o a lo sumo 3 recibos al mes de muestra): ahí es pérdida pura.
5. **La capa gratis de Gemini usa los datos para entrenar** — sólo sirve para probar con datos
   propios, nunca con datos de usuarios.

**Topes por plan** (dejan el techo de costo acotado sin molestar al 95% de la gente):

| Plan | Recibos/mes | Parseos (texto+voz)/mes | Chats/mes | Techo de costo | Sobre el precio |
|---|---|---|---|---|---|
| Free | 3 | 10 | 0 | ~$0.006 | — |
| Plus | 30 | 50 | 20 | ~$0.085 | 9% de $0.99 |
| Pro | 100 | 200 | 100 | ~$0.36 | 18% de $1.99 |

- [x] Guardar estos límites como `features` del plan en `seed_billing_plans.py` (mismo lugar que
      `import_email`, `quick_add`, etc.), no cableados en el código de IA. **Hecho**: claves
      `ai_receipts_per_month`, `ai_parses_per_month` y `ai_chats_per_month`; `apps/ai/quotas.py`
      las lee de ahí.
- [x] Mostrar "te quedan N de N" en la app antes de que el usuario choque con el tope — en los
      cuatro puntos de entrada (recibo, texto, voz, chat).

> Aparte de la IA: **la tarifa real de Wompi ya se confirmó (22-sep-2026)** — 3.5% de comisión +
> 2% de anticipo de IVA, **sin cuota fija por cobro**. Con eso la comisión deja de pesar
> desproporcionadamente en Plus/Pro mensual (antes se asumía un fijo de $0.30 que sí pesaba
> ~un tercio del ingreso de $0.99). Detalle y tablas actualizadas:
> `budget-app-django/ECONOMIA-POR-PLAN.md`. La capacidad y el costo de la infraestructura están
> en `budget-app-django/COSTOS-Y-ESCALA.md`.

---

## Orden sugerido

> **Actualizado 22-sep-2026** — 1 a 3 (parte de texto/voz) y 5, 6 ya están. Lo que sigue,
> diferido por decisión y no por bloqueo técnico:

1. ~~**Base de IA** (punto 1)~~ — hecho.
2. ~~**Recibos** (punto 2)~~ — hecho.
3. ~~**Texto libre + voz** (punto 3, salvo Telegram)~~ — hecho. **Telegram (3.1) queda
   diferido**: era el canal más rápido de montar y el banco de pruebas del parser antes de
   invertir en voz, pero ya no hace falta ese orden porque la voz se hizo directo.
4. **Decisión de analítica** (punto 4) — sigue pendiente de una decisión tuya; es la que menos
   código lleva.
5. ~~**Resumen mensual** (punto 6) y **chat** (punto 5)~~ — hechos, sin esperar al DTE.
6. **JSON de DTE por correo y QR** (punto 7) — diferido por decisión. Reusa toda la importación
   por correo y sigue siendo el que daría los datos más ricos cuando se retome.
