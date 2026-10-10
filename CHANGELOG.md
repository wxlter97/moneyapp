# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).
Versionado manual: cada release que cambia algo de cara al usuario se
bumpea a mano acá y en `package.json`/`app.json`, en el mismo commit/PR que
trae el cambio. Es independiente de la versión del backend
(`budget-app-django`, que tiene su propio changelog).

La versión visible en la app está en Ajustes → Acerca de.

## [1.11.0] - 2026-10-10

Requiere el backend 1.11.0.

### Agregado
- "¿Me alcanza?": ponés un monto (y opcionalmente la categoría) y te dice
  cómo queda el presupuesto, contando lo programado. Desde el dashboard o
  Herramientas → Análisis.
- Dashboard: aviso de cobros que se repiten (suscripciones) para marcarlos
  como recurrentes, ya con su nombre («Netflix»), y en presupuestos compartidos, quién gastó cuánto este mes.
- Metas de ahorro compartidas: quién aportó cuánto, en la cartera de ahorro.
- Avisos nuevos: corte de tarjeta cerca y resumen semanal.
- Onboarding: se cargan todas las cuentas con su saldo en un solo paso; el
  tour pasó de 8 a 5 pasos.
- Perfil: cambiar tu nombre (es el que ven los demás en un presupuesto
  compartido). Etiquetas: renombrar.
- Carteras: acceso a las carteras ocultas desde la misma pestaña.
- Presupuestos: quien no es dueño puede ir a Miembros o salir desde la lista.
- Miembros: la lista de invitaciones que todavía nadie aceptó, con
  "Reenviar correo" y "Cancelar invitación" para el dueño.
- Miembros: "Salir del presupuesto". Si no se puede (sos el único dueño o
  es tu único presupuesto), la pantalla dice por qué en vez del botón.

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
- Volver a invitar a alguien que se había ido o al que habían quitado
  fallaba con un error del servidor (arreglado en el backend 1.11.0).

## [1.10.1] - 2026-10-08

No requiere cambios de backend (ya permitía presupuestar un grupo sin subcategorías).

### Corregido
- «Ajustar» presupuesto: un grupo de categorías que no tiene subcategorías ahora
  se puede presupuestar directamente (antes salía de solo lectura). Los grupos
  con subcategorías siguen mostrando la suma de las suyas.

## [1.10.0] - 2026-10-08

Requiere el backend 1.10.0 (`POST /ai/statement/`).

### Agregado
- «Leer estado de cuenta» (Herramientas → Análisis, y desde «Nueva cartera»):
  sube el PDF o una foto del banco, revisa lo leído (lo dudoso sale marcado
  «revisar») y crea la cartera con banco, últimos 4, límite, día de corte y de
  pago y tasa ya llenos, junto con sus movimientos. También sirve para
  importar los movimientos a una cartera que ya existe; los que parecen
  duplicados arrancan sin marcar. El saldo inicial se calcula para que el saldo
  final coincida con el del estado de cuenta. Comparte la cuota mensual de IA
  con los recibos.

## [1.9.3] - 2026-10-07

### Corregido
- Monto de «Agregar transacción»: se quita el anillo de foco del navegador
  (en iOS se veía como dos barras azules alrededor de la cifra grande).

## [1.9.2] - 2026-10-07

### Corregido
- El monto de «Agregar transacción» seguía chico en iOS aunque se le subiera
  el tamaño al campo. Ahora la cifra que se ve es un texto grande (56 → 28 px
  según la longitud) y el campo de entrada va transparente encima, sólo para
  recibir el teclado.

## [1.9.1] - 2026-10-06

No requiere cambios de backend.

### Corregido
- El monto de «Agregar transacción» seguía chico en iOS: el tamaño calculado
  por `style` no se aplicaba. Ahora va por `className` (56 → 28 px según la
  cifra), como cuando sí se aplicaba.

## [1.9.0] - 2026-10-06

Requiere el backend 1.9.0 (`week_start_day`).

### Agregado
- Presupuesto semanal: se elige y se puede cambiar el día en que arranca la
  semana (lunes … domingo) desde «Ajustar».
- «Ojito» en los headers de Inicio y Presupuesto para ocultar la cifra grande
  (se recuerda entre sesiones).
- Colores de cartera: 16 colores bien distintos con su nombre, más
  «Personalizado» (matiz + hex).
- «Más usadas» arriba en el selector de categoría de una transacción, por
  orden de uso; los grupos también se ordenan por el uso de lo que contienen.

### Cambiado
- Monto en «Agregar transacción»: mucho más grande, se achica solo cuando la
  cifra crece, y muestra «$» en vez de «USD».
- El selector Claro/Oscuro/Sistema (y todo `Segmented`) se desliza como la
  barra inferior, sin rebote.
- Los colores de cartera ya no se desaturan casi a gris.

### Corregido
- Sesión que «no se guardaba»: un fallo pasajero al refrescar el token (sin
  red, timeout, 5xx) cerraba la sesión; ahora sólo se cierra si el servidor
  rechaza el token. El arranque reintenta ante 5xx/arranque en frío y no se
  queda cargando si el Keychain no responde; en iOS los tokens se leen
  también con el teléfono bloqueado tras el primer desbloqueo.

## [1.8.1] - 2026-10-03

No requiere cambios de backend.

### Agregado
- Acceso directo a «Compras a plazo» arriba de Herramientas y desde «Agregar
  transacción» (gasto): ya no hay que entrar a Organización.
- Selector de presupuesto: «Renombrar o administrar» abre la pantalla de
  Presupuestos.

### Cambiado
- Cerrar sesión desde la cabecera pide confirmación.
- Cartera: «Cuenta bancaria» pasa a «Cuenta / débito» (con nota de que la
  débito usa el saldo de la cuenta); «Cartera padre» pasa a «Dentro de otra
  cartera», con explicación; los selectores de banco aclaran de qué catálogo
  salen y «Sin especificar» pasa a nombres más claros.
- Tarjetas de crédito ya no piden «fecha de vencimiento» (ya está el día de
  pago mensual); en préstamos se llama «Fecha final de la deuda».

## [1.8.0] - 2026-10-02

Requiere el backend 1.8.0 (campos y endpoints nuevos de provisión acumulada).

### Agregado
- Provisión acumulada apagable: interruptor global en «Ajustar» presupuesto
  (solo dueño) y, por categoría, en su ficha. Botones para poner en cero lo
  acumulado, de una categoría o de todo el presupuesto (con confirmación).
- Presupuesto: etiqueta «Te pasaste» / «Disponible» en la cabecera y en cada
  grupo, con ícono, para que el estado no dependa sólo del color.

### Corregido
- El restante de un grupo o del total, ya pasado, se pintaba en verde: ahora
  el color es explícito (rojo si te pasaste, verde si queda margen).
- «Ver resumen» del resumen mensual abría el mes nuevo, vacío: ahora abre la
  lista del mes del que habla («Ver movimientos del mes»).

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
