# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).
Versionado manual: cada release que cambia algo de cara al usuario se
bumpea a mano acá y en `package.json`/`app.json`, en el mismo commit/PR que
trae el cambio. Es independiente de la versión del backend
(`budget-app-django`, que tiene su propio changelog).

La versión visible en la app está en Ajustes → Acerca de.

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
