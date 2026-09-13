import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { Screen } from '@/components/ui/Screen';
import { haptics } from '@/lib/haptics';
import { useColors } from '@/theme';
import { fonts } from '@/theme/typography';

interface FaqSection {
  title: string;
  body: string;
}

const SECTIONS: FaqSection[] = [
  {
    title: 'Presupuestos y miembros',
    body:
      'Un "presupuesto" (workspace) es un espacio con sus propias carteras, categorías y movimientos. Podés tener más de uno (Casa, Viaje, Negocio) y cambiar entre ellos desde el selector del encabezado. Invitar gente (Herramientas → Miembros) lo vuelve compartido: todos ven y cargan movimientos en las carteras que no sean privadas. Solo el dueño puede invitar, echar miembros o borrar el presupuesto entero.',
  },
  {
    title: 'Carteras',
    body:
      'Cada cuenta, tarjeta de crédito/débito, efectivo o meta de ahorro es una cartera. Una tarjeta de crédito puede tener plásticos adicionales asociados, y una cartera puede tener "hijas" (por ejemplo, dividir una tarjeta compartida entre titular y adicional). Marcarla como privada la oculta para el resto de los miembros del presupuesto.',
  },
  {
    title: 'Categorías y etiquetas',
    body:
      'Las categorías se organizan en grupos (Vivienda, Comida...) con subcategorías asignables adentro -- ya vienen armadas por defecto, se editan en Herramientas → Categorías. Las etiquetas son transversales: agrupan gasto que cruza categorías (por ejemplo, "Viaje a Playa" con transporte, comida y hospedaje a la vez).',
  },
  {
    title: 'Cargar movimientos',
    body:
      'A mano con el botón "+". Automático reenviando el aviso de compra de tu banco a tu dirección de Importaciones (Herramientas → Importaciones tiene la dirección y una guía por proveedor de correo) -- cada correo queda pendiente de tu confirmación antes de crear el movimiento, nunca se agrega solo. También se puede cargar en bloque desde una planilla Excel (Herramientas → Importar Excel).',
  },
  {
    title: 'Recurrentes y compras a plazo',
    body:
      'Un gasto o ingreso recurrente (alquiler, sueldo, una suscripción) genera su movimiento solo en cada fecha de vencimiento. Una compra a plazo reparte un monto grande en cuotas -- no genera un movimiento por cuota, pero sí calcula cuánto entra en cada estado de cuenta.',
  },
  {
    title: 'Presupuesto por categoría',
    body:
      'Ponele un límite mensual a cualquier categoría (o grupo) desde la pestaña Presupuesto, y seguí cuánto llevás gastado contra ese límite. Podés activar un aviso cuando una categoría se acerca a agotarlo (Herramientas → Notificaciones).',
  },
  {
    title: 'Seguridad',
    body:
      'Bloqueo con PIN o Face ID/Touch ID al volver del segundo plano (Herramientas → Seguridad), y verificación en dos pasos (2FA) para el inicio de sesión con tu app de autenticación favorita. Ninguno de los dos es obligatorio, pero se recomiendan si compartís el celular o el presupuesto tiene movimientos sensibles.',
  },
  {
    title: 'Respaldo y exportar',
    body:
      'Descargá un respaldo completo del presupuesto (carteras, categorías, etiquetas, movimientos) en JSON para guardarlo o restaurarlo después -- restaurar borra todo lo que había antes de traer el respaldo. Para uso puntual, exportar a CSV es más simple y no se puede restaurar.',
  },
];

function FaqItem({ section, open, onToggle }: { section: FaqSection; open: boolean; onToggle: () => void }) {
  const colors = useColors();
  return (
    <View>
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        className="flex-row items-center justify-between py-3 active:opacity-60"
      >
        <Text className="text-text flex-1 pr-3 text-sm" style={{ fontFamily: fonts.semibold }}>
          {section.title}
        </Text>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
      </Pressable>
      {open ? (
        <Text className="text-text-muted pb-3 text-sm leading-5">{section.body}</Text>
      ) : null}
    </View>
  );
}

/**
 * Herramientas → Ayuda: referencia siempre disponible (a diferencia del tour
 * de bienvenida, que se ve una sola vez) -- FAQ por tema, para consultar
 * cuando haga falta, no un recorrido forzado.
 */
export default function HelpScreen() {
  const colors = useColors();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <Screen edges={['top', 'bottom']}>
      <ModalHeader title="Ayuda" />
      <ScrollView contentContainerClassName="gap-4 py-2">
        <Pressable
          onPress={() => {
            haptics.tap();
            router.push('/onboarding');
          }}
          accessibilityRole="button"
          className="flex-row items-center justify-between rounded-2xl bg-surface-2 px-4 py-3.5 active:opacity-70"
        >
          <Text className="text-text text-sm" style={{ fontFamily: fonts.semibold }}>
            Ver el tour de bienvenida de nuevo
          </Text>
          <Icon name="chevron-right" size={16} color={colors.textMuted} />
        </Pressable>

        <Card>
          {SECTIONS.map((section, i) => (
            <View key={section.title}>
              {i > 0 ? <View className="h-px bg-border/30" /> : null}
              <FaqItem
                section={section}
                open={openIndex === i}
                onToggle={() => {
                  haptics.selection();
                  setOpenIndex((cur) => (cur === i ? null : i));
                }}
              />
            </View>
          ))}
        </Card>
      </ScrollView>
    </Screen>
  );
}
