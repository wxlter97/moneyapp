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
 * Herramientas → Cuenta → Pro → Reembolsos. Borrador de política de
 * cancelación/reembolso -- necesaria porque el cobro va directo por Wompi,
 * no por Apple/Google IAP (que tienen su propia política automática): acá
 * nadie más la hace cumplir, hay que definirla y sostenerla nosotros
 * mismos. Ajustar los plazos si el criterio de negocio cambia.
 */
export default function RefundPolicyScreen() {
  return (
    <Screen edges={['top', 'bottom']}>
      <ModalHeader title="Reembolsos y cancelación" />
      <ScrollView contentContainerClassName="gap-4 py-2">
        <Card>
          <Text className="text-text-muted text-xs">Última actualización: {LAST_UPDATED}</Text>
        </Card>

        <Section title="Cancelar en cualquier momento">
          Cancelá tu suscripción Pro cuando quieras desde Herramientas → Cuenta → Pro →
          Cancelar suscripción. No hay penalidad ni permanencia mínima: seguís teniendo
          acceso Pro hasta el final del período ya pagado (mensual, anual o de por vida,
          según lo que hayas contratado), y no se te cobra de nuevo después de eso.
        </Section>

        <Section title="Garantía de devolución (primera compra)">
          Si contrataste Pro por primera vez y no es lo que esperabas, escribinos dentro de
          los 7 días del cobro y te devolvemos el 100% -- sin pedirte explicaciones. Pasado
          ese plazo, no hacemos devoluciones parciales por el tiempo que no llegaste a usar
          tras cancelar.
        </Section>

        <Section title="Renovaciones">
          Un plan mensual o anual se renueva solo hasta que lo cancelás. Si un cobro de
          renovación fue un error de nuestro lado (por ejemplo, se renovó después de que
          ya lo habías cancelado), lo reembolsamos completo apenas nos escribís.
        </Section>

        <Section title="Cobros fallidos">
          Si tu método de pago falla, no perdés el acceso Pro de inmediato -- tenés un
          período de gracia para actualizar el método de pago antes de volver al plan
          Gratis.
        </Section>

        <Section title="Cómo pedir un reembolso">
          Escribinos al correo de abajo con el motivo y, si podés, la fecha del cobro.
          Respondemos en 2-3 días hábiles. El reembolso lo procesa el mismo proveedor de
          pago (Wompi) al método original -- puede tardar unos días más en reflejarse
          según tu banco.
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
