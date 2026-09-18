# Backlog — funciones nuevas (18 sep 2026)

> **Nada de esto está implementado todavía.** Este archivo existe para tener el diseño
> mapeado en el repo y poder retomarlo sin volver a discutirlo. Formato: `[ ]` pendiente,
> `[x]` hecho. Las referencias entre backticks son archivos reales, leídos del repo.
>
> Abarca los dos repos: `moneyapp` (Expo/RN) y `budget-app-django` (backend). Cada punto
> separa el trabajo por repo y, aparte, **lo que hay que configurar por fuera del código**
> (cuentas, keys, dominios) — que es lo que suele frenar estas cosas más que el código.
>
> Lo ya implementado que está esperando configuración tuya vive en otro archivo:
> `budget-app-django/CONFIG-PENDIENTE.md`.

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

---

## 1. Base de IA (hace falta antes de los puntos 2 a 5)

Una app nueva `apps/ai` en el backend, que es el único lugar que conoce la key y el único que
habla con Gemini. Todo lo demás la usa por dentro.

**Backend (`budget-app-django`)**
- [ ] `apps/ai/client.py` — envoltorio fino sobre la API de Gemini: timeout, reintento,
      y traducir cualquier fallo a un error propio (que la IA se caiga nunca debe tumbar el
      alta de una transacción; el camino manual siempre tiene que seguir andando).
- [ ] `GEMINI_API_KEY` en `settings` + `.env.example`. **Vacío = todas las funciones de IA se
      apagan solas** y la app no muestra sus entradas, igual que se hace hoy con Sentry, VAPID
      y el botón de Google.
- [ ] Throttle propio (`THROTTLE_AI`, scope `ai`) además del límite normal de DRF.
- [ ] **Tope de consumo por usuario y por mes**, atado al plan de `apps.billing`. Sin esto, una
      sola cuenta puede gastarte la factura del mes. Contador en base (no en cache) porque hay
      que poder mostrarle al usuario "te quedan N de N" y el cache de prod es por instancia.
- [ ] Registro de cada llamada (modelo, tokens, costo estimado, latencia, éxito/error) para
      poder ver qué se está gastando. Sin datos personales en el log.

**Frontend (`moneyapp`)**
- [ ] Un solo lugar que pregunte al backend si la IA está disponible y cuánto queda del tope
      (mismo patrón que `vapidPublicKey()` en `src/lib/notifications.ts`), para que las
      entradas de IA no aparezcan cuando no hay key.

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

**Lo que ya existe y se reusa (no hay que construirlo)**
- `Transaction.receipt` (`FileField`) con su `receipt_upload_path`, servido por el propio API
  en `/transactions/{id}/receipt/` y nunca por una URL directa del storage.
- `expo-image-picker` ya configurado en `app.json`, con permisos de cámara y fotos en español.
- `guess_category_by_merchant` y `find_possible_duplicates` en `apps/transactions/services.py`.

**Backend**
- [ ] `POST /api/v1/ai/receipt/` — recibe la imagen o PDF, devuelve una **candidata** (monto,
      fecha, comercio, moneda, categoría sugerida y, si se puede leer, los ítems) con un nivel
      de confianza por campo. **No crea la transacción.**
- [ ] Orden de resolución de la categoría: primero `guess_category_by_merchant` (gratis y
      determinista), y recién si no acierta, la sugerencia de la IA. Nunca al revés.
- [ ] Pasar la candidata por `find_possible_duplicates` antes de devolverla, para que la app
      pueda avisar "esto parece que ya lo registraste".
- [ ] Guardar el recibo como `Transaction.receipt` cuando el usuario confirma, no antes.

**Frontend**
- [ ] En el alta de transacción: botón "Escanear recibo" → cámara → pantalla de confirmación
      con los campos ya llenos y **editables**, marcando los de baja confianza. El usuario
      siempre confirma; nada se guarda solo.

**Configuración externa:** ninguna aparte de `GEMINI_API_KEY`. Ojo: esto **necesita**
`GS_BUCKET_NAME` configurado, o los recibos se pierden en cada deploy (ver `CONFIG-PENDIENTE.md`).

---

## 3. Entrada por texto libre (NLP) y canales

**Lo que ya existe y se reusa**
- `apps/quickadd` completo: `PersonalAccessToken` por cartera, endpoint de alta rápida con su
  propio throttle (`quick_add`) y `AUTO_CATEGORY` para dejar que el backend elija categoría.
  Es exactamente la puerta que ya usa el Atajo de Apple.
- `guess_category_by_merchant` y `find_possible_duplicates`.

**Backend**
- [ ] `POST /api/v1/ai/parse/` — texto libre ("gasté 12.50 en almuerzo con la tarjeta", "me
      pagaron 800") → candidata estructurada (tipo, monto, moneda, fecha relativa resuelta,
      cartera si la nombra, categoría, nota). Devuelve candidata, no transacción.
- [ ] Reusar `find_possible_duplicates` igual que en los recibos.

### 3.1 Telegram
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
- [ ] `expo-audio` para grabar (no está instalado todavía; **leer primero los docs de la
      versión exacta de Expo del repo**, ver `AGENTS.md`).
- [ ] `POST /api/v1/ai/voice/` — el audio va a Gemini (acepta audio directo, no hace falta un
      proveedor aparte de transcripción) y sale por el mismo parser que el texto libre.
- [ ] Botón de micrófono en el alta rápida. En web, `MediaRecorder`; verificar que Safari
      grabe en un formato que Gemini acepte.

---

## 4. Analítica — GA4 y Microsoft Clarity

> **⚠️ Bloqueante, no técnico: hay que decidir esto primero.**
> `src/app/(app)/privacy.tsx` hoy dice, textual: *"No usamos cookies ni rastreadores de
> publicidad, ni de nosotros ni de terceros"*. GA4 pone cookies (`_ga`) y Clarity **graba la
> sesión** (movimiento de mouse, clics, y por defecto texto de la página). Meter cualquiera de
> los dos **contradice la política publicada**. Tres salidas, en orden de lo que yo elegiría:
>
> 1. **Analítica sin cookies** (Plausible o Umami, self-hosted o de pago): da páginas vistas,
>    fuentes y embudos sin cookies ni datos personales, y la política actual sigue siendo
>    cierta. Pierdes las grabaciones de sesión de Clarity.
> 2. **GA4 + Clarity con banner de consentimiento**, cargando los scripts sólo después del
>    "sí", y reescribiendo esa sección de la política. Es la opción con más insight de UX y la
>    que más trabajo y más responsabilidad legal trae.
> 3. **Eventos propios en el backend** (ya tenés la base de datos y el API): cero terceros,
>    pero te toca construir hasta el gráfico más simple.

**Si se va por GA4 + Clarity (web, ahora)**
- [ ] Inyectar los snippets sólo en el build web. `app.json` tiene `web.output: "single"`, así
      que va por el HTML del bundle, no por un `<Head>` de cada pantalla.
- [ ] Cargar ambos scripts **después** del consentimiento, nunca antes.
- [ ] En Clarity, activar el enmascarado estricto de texto. Esta app muestra montos, nombres de
      carteras y notas de transacciones: eso **no** puede quedar grabado en un tercero.
- [ ] Eventos mínimos que valen la pena: alta de transacción (por canal: manual / recibo / voz /
      Telegram), creación de presupuesto, invitación aceptada, inicio de trial, abandono en el
      onboarding.
- **Configuración externa:** propiedad de GA4 (`EXPO_PUBLIC_GA4_MEASUREMENT_ID`) y proyecto de
  Clarity (`EXPO_PUBLIC_CLARITY_PROJECT_ID`).

**Nativo (cuando haya build de tiendas)**
- [ ] GA4 nativo = `@react-native-firebase/analytics`: necesita **dev client / EAS Build** (no
      corre en Expo Go) más `google-services.json` y `GoogleService-Info.plist`.
- [ ] Clarity nativo = `@microsoft/react-native-clarity` (el paquete `react-native-clarity`
      viejo está camino a deprecarse). También necesita build nativo; no hay config plugin de
      Expo oficial, así que hay que verificar cómo entra en el prebuild.
- [ ] Va junto con la primera subida a tiendas, que ya requiere `eas init` y credenciales
      (ver `CONFIG-PENDIENTE.md`, prioridad 3).

---

## 5. Chat sobre tus finanzas

**Backend**
- [ ] `POST /api/v1/ai/chat/`. **No darle acceso a la base ni generar SQL.** Darle un juego
      chico de funciones ya existentes y que elija cuál llamar: `budget_vs_actual`,
      `upcoming_scheduled`, `behavior_insights` y totales por categoría/mes, todo en
      `apps/reports/services.py`.
- [ ] Todas las lecturas tienen que pasar por `visible_transactions(workspace, user)`, que ya
      respeta carteras privadas y compartidas. El aislamiento por workspace no se negocia:
      hay tests dedicados a eso (`apps/common/tests/test_workspace_isolation.py`) y esto
      tiene que sumar los suyos.
- [ ] Respuestas con cifras **siempre** citando el período y la moneda base, y excluyendo lo
      que no tenga tasa de cambio (mismo criterio que los reportes: se excluye, no se estima).
- [ ] Sin consejos de inversión ni nada que suene a asesoría financiera regulada: describir lo
      que pasó con sus datos, no recomendar productos.

**Frontend**
- [ ] Pantalla de chat en Herramientas, con historial local (no en el servidor, al menos al
      principio) y un aviso claro de que puede equivocarse.

---

## 6. Resumen y consejos mensuales

**Lo que ya existe y se reusa**
- `behavior_insights()` en `apps/reports/services.py` con sus 6 detectores (fin de semana,
  después de cobrar, gasto hormiga, día pico, alza de categoría, alza de frecuencia).
- `notify_insights()` en `apps/notifications/services.py`, el kind `insight` y el toggle
  `warn_insights`, más el truco de la `dedupe_key` con el mes calendario para que un job que
  corre a diario entregue algo mensual.

**Backend**
- [ ] Tomar la salida de `behavior_insights()` (que hoy son títulos y cuerpos armados a mano) y
      pasarla por Gemini para redactar **un** texto mensual que los conecte, en vez de seis
      avisos sueltos. La detección sigue siendo determinista: la IA sólo redacta. Así, si la IA
      no está disponible, se sigue mandando el texto de siempre.
- [ ] Kind nuevo (`monthly_summary`) o reusar `insight` con `dedupe_key` mensual. Inclinado a
      kind nuevo, para que se pueda apagar aparte de los patrones.

**Frontend**
- [ ] Icono y ruta en `KIND_ICON` (`src/app/(app)/notification-center.tsx`) y en
      `src/lib/notificationRouting.ts` — el `Record<NotificationKind, IconName>` obliga a no
      olvidarse, `tsc` lo caza.
- [ ] Toggle propio en Ajustes → Notificaciones si se va por kind nuevo.

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

## Orden sugerido

1. **Base de IA** (punto 1) — sin esto no hay nada de lo demás. Con el tope de consumo desde el
   día uno, no después.
2. **Recibos** (punto 2) — el que más se nota y el que menos piezas nuevas necesita.
3. **Texto libre + Telegram** (punto 3) — Telegram es el canal más rápido de montar y sirve de
   banco de pruebas del parser antes de invertir en voz.
4. **Decisión de analítica** (punto 4) — decidir ya, implementar cuando se decida: es la que
   menos código lleva y la que más depende de una decisión tuya.
5. **JSON de DTE por correo** (punto 7, segunda mitad) — reusa toda la importación por correo y
   es el que da datos más ricos.
6. **Resumen mensual** (punto 6) y **chat** (punto 5) — los dos suben encima de todo lo
   anterior; el chat es el de mayor superficie de riesgo, así que va al final.
