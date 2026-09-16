import { Linking, ScrollView, Text } from 'react-native';

import { Card } from '@/components/ui/Card';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { Screen } from '@/components/ui/Screen';
import { haptics } from '@/lib/haptics';
import { fonts } from '@/theme/typography';

const CONTACT_EMAIL = 'me@wxlter.dev';
const LAST_UPDATED = '13 de septiembre de 2026';

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
          notas que cargás vos; si activás notificaciones, un token de tu dispositivo para
          poder enviártelas; si conectás la importación por correo, el contenido de los
          correos bancarios que vos mismo reenviás; y si usás "Continuar con Google", tu
          nombre y foto de perfil de esa cuenta.
        </Section>

        <Section title="Qué NO recolectamos">
          No accedemos a tu cuenta bancaria real, no vemos tu número de tarjeta completo
          (el cobro de Pro lo procesa un proveedor externo, hoy Wompi) y no vendemos tus
          datos a nadie.
        </Section>

        <Section title="Con quién los compartimos">
          Sólo con los proveedores que hacen funcionar la app: Wompi (cobro del plan Pro),
          Mailgun (envío de correos de invitación y recepción de la importación bancaria),
          Google (si usás "Continuar con Google"), y la infraestructura donde corre el
          backend y la base de datos (Google Cloud Run y Neon/PostgreSQL). Ninguno de ellos
          puede usar tus datos para fines propios -- los procesan sólo para prestarnos el
          servicio.
        </Section>

        <Section title="Dónde vive tu información">
          Tu base de datos corre en servidores gestionados (Neon, sobre infraestructura de
          AWS) y el backend en Google Cloud Run -- fuera de El Salvador. Al usar porksupuesto,
          aceptás esa transferencia internacional de tus datos.
        </Section>

        <Section title="Cuánto tiempo la guardamos">
          Mientras tu cuenta exista. Si la borrás (Herramientas → Cuenta → Borrar cuenta),
          eliminamos tu presupuesto y tus datos de inmediato, salvo lo que estemos
          obligados a conservar por ley (por ejemplo, comprobantes fiscales de un cobro
          real, una vez que exista facturación formal).
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
