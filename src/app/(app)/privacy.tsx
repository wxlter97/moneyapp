import { Linking, ScrollView, Text } from 'react-native';

import { Card } from '@/components/ui/Card';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { Screen } from '@/components/ui/Screen';
import { haptics } from '@/lib/haptics';
import { fonts } from '@/theme/typography';

const CONTACT_EMAIL = 'me@wxlter.dev';
const LAST_UPDATED = '20 de septiembre de 2026';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card title={title}>
      <Text className="text-text-muted text-sm leading-5">{children}</Text>
    </Card>
  );
}

/**
 * Herramientas → Acerca de → Privacidad. Primer borrador: describe con
 * precisión qué datos recolecta la app HOY y con quién los comparte,
 * a partir del código real (ver checklist de producción, sección legal,
 * para lo pendiente de revisión formal -- sobre todo la ley salvadoreña de
 * protección de datos personales, todavía en implementación).
 */
export default function PrivacyScreen() {
  return (
    <Screen edges={['top', 'bottom']}>
      <ModalHeader title="Privacidad" />
      <ScrollView contentContainerClassName="gap-4 py-2">
        <Card>
          <Text className="text-text-muted text-xs">Última actualización: {LAST_UPDATED}</Text>
        </Card>

        <Section title="Qué datos recolectamos">
          Correo y nombre de usuario (cuenta); las transacciones, carteras, categorías y
          notas que cargás vos; los recibos (foto o PDF) que adjuntás a una transacción; los
          mensajes que nos mandás desde Soporte; si activás notificaciones, un token de tu
          dispositivo para poder enviártelas; si conectás la importación por correo, el contenido de los
          correos bancarios que vos mismo reenviás; y si usás "Continuar con Google", tu
          nombre y foto de perfil de esa cuenta.
        </Section>

        <Section title="Qué NO recolectamos">
          No accedemos a tu cuenta bancaria real, no vemos tu número de tarjeta completo
          (el cobro de Pro lo procesa un proveedor externo, hoy Wompi) y no vendemos tus
          datos a nadie.
        </Section>

        {/*
          Inteligencia artificial. NO PUBLICAR hasta activar GEMINI_API_KEY, y sólo
          es cierta con la API de PAGO de Gemini: en la capa gratis Google usa el
          contenido para entrenar y personas pueden leerlo. Revisar este texto al
          agregar dictado por voz o el chat (hoy sólo recibos y texto libre), y si
          alguna vez se guarda el contenido de las consultas (hoy `AIUsage` guarda
          sólo operación, modelo, tokens, costo y latencia).
        */}
        <Section title="Inteligencia artificial (opcional)">
          Si usás las funciones de IA -- leer un recibo con la cámara o escribir un gasto en
          lenguaje natural -- mandamos esa consulta a Google (API de Gemini): la foto o el
          PDF del recibo, o la frase que escribiste, junto con los nombres de tus carteras y
          categorías para que pueda elegir una de ellas. Usamos el servicio de pago de la
          API, cuyas condiciones establecen que Google no usa ese contenido para entrenar ni
          mejorar sus modelos. Nosotros no guardamos el contenido de la consulta: sólo un
          registro de uso (qué operación, cuándo y cuántos tokens) para aplicar el límite
          mensual de tu plan. Si no usás estas funciones, no se envía nada a Google.
        </Section>

        <Section title="Cookies y almacenamiento local">
          No usamos cookies ni rastreadores de publicidad, ni de nosotros ni de terceros --
          no hay nada que vender ni ningún anunciante al que rendirle cuentas. En la versión
          web (PWA) guardamos en el almacenamiento local de tu navegador (`localStorage`,
          nunca cookies) tu sesión iniciada, el presupuesto activo, el tema (claro/oscuro) y
          una copia de tus datos más recientes para que la app abra al instante en vez de en
          blanco; en la app nativa es el equivalente del sistema operativo (SecureStore /
          AsyncStorage). Nada de esto sale de tu dispositivo salvo lo que ya se sincroniza
          con nuestro servidor de todas formas (tus transacciones, carteras, etc). Si activás
          notificaciones push guardamos el token que nos da Apple/Google/el navegador para
          poder enviártelas -- ver la sección de arriba sobre qué datos recolectamos. Usamos
          Sentry para
          enterarnos si la app se cae o tira un error (versión de la app, modelo de
          dispositivo, y el error en sí) -- no arma un perfil tuyo ni cruza esos datos con
          publicidad. Podés borrar todo este almacenamiento local vos mismo cerrando sesión,
          desinstalando la app, o borrando los datos del sitio desde la configuración de tu
          navegador.
        </Section>

        <Section title="Con quién los compartimos">
          Sólo con los proveedores que hacen funcionar la app: Wompi (cobro del plan Pro),
          Mailgun (envío de correos de invitación y recepción de la importación bancaria),
          Google (si usás "Continuar con Google" o las funciones de IA), Sentry (reportes de
          errores), Cloudflare (que sirve la versión web de la app), y la infraestructura
          donde corre el backend, los recibos y la base de datos (Google Cloud Run, Google
          Cloud Storage y Neon/PostgreSQL). Estos proveedores procesan tus datos sólo para
          prestarnos el servicio. Además, cuando nos escribís desde Soporte llega un aviso
          a un canal privado de Discord que sólo ve el equipo, con tu correo, el asunto y el
          comienzo del mensaje.
        </Section>

        <Section title="Dónde vive tu información">
          Tu base de datos corre en servidores gestionados (Neon, sobre infraestructura de
          AWS), y el backend, los recibos y las copias de seguridad en Google Cloud -- todo en
          Estados Unidos, fuera de El Salvador. Al usar porksupuesto,
          aceptás esa transferencia internacional de tus datos.
        </Section>

        <Section title="Cuánto tiempo la guardamos">
          Mientras tu cuenta exista. Si la borrás (Herramientas → Cuenta → Borrar cuenta),
          eliminamos tu presupuesto y tus datos de inmediato, salvo lo que estemos
          obligados a conservar por ley (por ejemplo, comprobantes fiscales de un cobro
          real, una vez que exista facturación formal). Los recibos adjuntos se borran junto
          con la cuenta. Las copias de seguridad diarias de la base se conservan hasta 30
          días, así que tus datos borrados pueden seguir en ellas hasta que esas copias
          caduquen.
        </Section>

        <Section title="Tus derechos">
          Podés pedirnos en cualquier momento: una copia de tus datos (o exportarlos vos
          mismo, plan Pro), que corrijamos algo incorrecto, o que borremos tu cuenta por
          completo. Escribinos al correo de abajo para cualquiera de estos pedidos que no
          puedas hacer vos mismo desde la app.
        </Section>

        <Section title="Seguridad">
          Las contraseñas se guardan con hash (nunca en texto plano), las conexiones van
          cifradas (HTTPS) y podés activar verificación en dos pasos y bloqueo con
          biometría/PIN desde Herramientas → Seguridad.
        </Section>

        <Section title="Menores de edad">
          porksupuesto no está dirigido a menores de 18 años. Si te enterás de que un menor creó
          una cuenta, avisanos y la borramos.
        </Section>

        <Section title="Cambios a esta política">
          Si cambiamos algo importante sobre qué datos recolectamos o con quién los
          compartimos, te avisamos dentro de la app antes de que entre en vigencia.
        </Section>

        <Card title="Contacto">
          <Text className="text-text-muted mb-2 text-sm leading-5">
            Para cualquier pedido sobre tus datos:
          </Text>
          <Text
            className="text-primary text-sm"
            style={{ fontFamily: fonts.semibold }}
            onPress={() => {
              haptics.tap();
              Linking.openURL(`mailto:${CONTACT_EMAIL}`);
            }}
          >
            {CONTACT_EMAIL}
          </Text>
        </Card>
      </ScrollView>
    </Screen>
  );
}
