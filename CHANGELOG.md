# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).
Versionado manual: cada release que cambia algo de cara al usuario se
bumpea a mano acá y en `package.json`/`app.json`, en el mismo commit/PR que
trae el cambio. Es independiente de la versión del backend
(`budget-app-django`, que tiene su propio changelog).

La versión visible en la app está en Ajustes → Acerca de.

## [1.9.0] - 2026-09-23

### Agregado
- "¿Me alcanza?": ponés un monto (y opcionalmente la categoría) y te dice
  cómo queda el presupuesto, contando lo programado. Desde el dashboard o
  Herramientas → Análisis.
- Dashboard: aviso de cobros que se repiten (suscripciones) para marcarlos
  como recurrentes, ya con su nombre («Netflix»), y en presupuestos compartidos, quién gastó cuánto este mes.
- Metas de ahorro compartidas: quién aportó cuánto, en la cartera de ahorro.
- Estado de cuenta: cuánto pagar para no pagar intereses, el próximo corte y
  un botón para registrar el pago.
- Avisos nuevos: corte de tarjeta cerca y resumen semanal.
- Onboarding: se cargan todas las cuentas con su saldo en un solo paso; el
  tour pasó de 8 a 5 pasos.
- Perfil: cambiar tu nombre (es el que ven los demás en un presupuesto
  compartido). Etiquetas: renombrar.
- Carteras: acceso a las carteras ocultas desde la misma pestaña.
- Presupuestos: quien no es dueño puede ir a Miembros o salir desde la lista.

### Corregido
- Muchas acciones de un toque que fallaban sin decir nada (sólo vibraban,
  en la web ni eso) ahora muestran el error: quitar un miembro, subir un
  comprobante, marcar un recurrente, saldar una cuenta, entre otras. Si es
  un límite del plan, ofrecen ver los planes.
- Pantallas que quedaban cargando para siempre si fallaba la carga
  (importación por correo, reporte de soporte, dividir transacción) o que
  mostraban un formulario vacío que al guardar pisaba los datos (editar
  presupuesto, transacción, recurrente, compra a plazo).
- Aceptar una invitación ahora te lleva al presupuesto nuevo.
- Las notificaciones de cuotas, recurrentes, saldo bajo y tarjeta abren su
  pantalla en vez del dashboard; las de resumen mensual y suscripción tenían
  ícono vacío.

## [1.8.0] - 2026-09-23

### Agregado
- Miembros: la lista de invitaciones que todavía nadie aceptó, con
  "Reenviar correo" y "Cancelar invitación" para el dueño.
- Miembros: "Salir del presupuesto". Si no se puede (sos el único dueño o
  es tu único presupuesto), la pantalla dice por qué en vez del botón.

### Corregido
- Volver a invitar a alguien que se había ido o al que habían quitado
  fallaba con un error del servidor (arreglado en el backend 1.8.0).

## [1.7.1] - 2026-09-23

### Corregido
- Las fuentes (Archivo, Archivo Black, JetBrains Mono) no cargaban en
  producción desde la mudanza a Cloudflare Pages: Expo las exporta a
  `assets/node_modules/`, y Pages no sube nada dentro de una carpeta
  `node_modules`. El navegador recibía el `index.html` del rewrite SPA en vez
  de la fuente. Ahora el build las mueve a `assets/vendor/`. Afectaba a
  cualquier navegador; la PWA lo disimulaba con fuentes viejas en caché,
  hasta que el cambio de caché de la 1.7.0 las borró.
- El service worker ya no guarda como asset una respuesta HTML (lo que
  devuelve el rewrite SPA para un archivo que no existe).
- La app espera a que las fuentes estén descargadas antes de mostrarse en
  Safari/iOS, donde `expo-font` no lo hace, y en web cada fuente tiene un
  respaldo del sistema en vez de caer en Times.

## [1.7.0] - 2026-09-22

Antes de este archivo no hubo changelog formal. Esta primera entrada
consolida lo más reciente como punto de partida.

### Agregado
- Dictado por voz para cargar transacciones (`VoiceInputButton`): graba,
  manda el audio a `/ai/voice/` y prellena el formulario igual que el texto
  libre. No aparece en navegadores de escritorio que sólo saben grabar
  `audio/webm` (Chrome/Firefox), que el backend no acepta.
- Chat de finanzas: preguntas en lenguaje natural sobre los reportes ya
  calculados (nunca inventa datos ni accede directo a la base).
- Analítica de producto sin cookies (Umami Cloud) para entender uso agregado
  sin trackear a nadie individualmente.

### Corregido
- Fuente serif en el navegador (no en la PWA instalada): faltaba un
  fallback sans-serif mientras la fuente custom termina de cargar en
  Safari/iOS/Edge.
- Registrar a mano desde "Programado" una ocurrencia de un gasto recurrente
  un día antes de que corriera el proceso automático la duplicaba al día
  siguiente.

## [1.6.0] y anteriores

Sin changelog formal. Ver el historial de git.
