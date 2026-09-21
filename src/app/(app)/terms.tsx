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
 * Herramientas → Acerca de → Términos. Primer borrador propio, no revisado
 * todavía por un abogado -- ver el checklist de producción ("legal") para
 * lo pendiente antes de cobrar suscripciones de verdad: constituir una
 * figura fiscal en El Salvador, facturación electrónica (DTE), y una
 * revisión legal real de este texto. Mientras tanto describe con precisión
 * lo que la app hace hoy, sin inventar garantías que no existen.
 */
export default function TermsScreen() {
  return (
    <Screen edges={['top', 'bottom']}>
      <ModalHeader title="Términos de servicio" />
      <ScrollView contentContainerClassName="gap-4 py-2">
        <Card>
          <Text className="text-text-muted text-xs">Última actualización: {LAST_UPDATED}</Text>
        </Card>

        <Section title="Qué es porksupuesto">
          porksupuesto es una aplicación personal de presupuesto: registro de transacciones,
          carteras, categorías, presupuestos y reportes. No es un banco, no mueve dinero
          real entre cuentas y no ofrece asesoría financiera, legal ni fiscal -- las
          decisiones que tomes con la información que ves acá son tu responsabilidad.
        </Section>

        <Section title="Tu cuenta">
          Sos responsable de mantener segura tu contraseña y de toda actividad que ocurra
          bajo tu cuenta. Tenés que darnos datos verdaderos al registrarte (correo,
          nombre de usuario) y ser mayor de 18 años para usar porksupuesto, sobre todo si vas a
          contratar el plan Pro.
        </Section>

        <Section title="Tus datos financieros">
          Todo lo que cargás (transacciones, montos, carteras, notas) es tuyo. Podés
          exportarlo (plan Pro) o pedir que se borre junto con tu cuenta, con la excepción
          de lo que estemos obligados a conservar por ley (por ejemplo, comprobantes de un
          cobro real, una vez que exista facturación formal).
        </Section>

        <Section title="Importación de correos bancarios">
          Si activás la importación automática (plan Pro), reenviás vos mismo los correos
          de tu banco a una dirección que te asignamos; los procesamos para sugerir
          transacciones, nunca para acceder a tu cuenta bancaria ni mover dinero. Podés
          desactivarlo en cualquier momento desde Herramientas.
        </Section>

        <Section title="Plan Pro y pagos">
          El plan Pro es una suscripción paga (mensual, anual o de por vida, según elijas).
          Se cobra a través de un proveedor de pagos externo (hoy, Wompi) -- nunca vemos ni
          guardamos el número completo de tu tarjeta. Podés cancelar cuando quieras desde
          Herramientas → Cuenta → Pro; seguís teniendo acceso Pro hasta el final del
          período ya pagado, sin renovación automática después de cancelar. Ver también
          &quot;Reembolsos y cancelación&quot;.
        </Section>

        <Section title="Qué no podés hacer">
          Usar porksupuesto para actividad ilegal, intentar acceder a cuentas de otras personas,
          revender el servicio, o forzar/automatizar el acceso a la API por fuera de lo que
          la app ofrece (Atajos de Apple Shortcuts, con tu propio token, sí está permitido).
        </Section>

        <Section title="Disponibilidad">
          Hacemos lo posible por mantener el servicio disponible, pero no lo garantizamos
          sin interrupciones -- puede haber mantenimiento, fallas del proveedor de
          hosting, o del proveedor de pagos, fuera de nuestro control directo.
        </Section>

        <Section title="Cambios a estos términos">
          Si cambiamos algo importante, te avisamos dentro de la app (centro de
          notificaciones) antes de que entre en vigencia. Seguir usando porksupuesto después de
          ese aviso implica que aceptás los términos actualizados.
        </Section>

        <Section title="Ley aplicable">
          Estos términos se rigen por las leyes de El Salvador. Cualquier disputa se
          resuelve ante los tribunales competentes de El Salvador, salvo que la ley
          aplicable exija otra cosa.
        </Section>

        <Card title="Contacto">
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
