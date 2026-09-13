import { Text, View } from 'react-native';
import { router } from 'expo-router';

import { useMyPlan } from '@/api/queries';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { LoadingState } from '@/components/ui/states';
import { FEATURE_COPY, type FeatureKey } from '@/lib/planFeatures';
import { useColors } from '@/theme';
import { fonts } from '@/theme/typography';

interface ProFeatureGateProps {
  feature: FeatureKey;
  children: React.ReactNode;
  /** 'screen' (default): reemplaza toda la pantalla por el upsell, para
   * pantallas dedicadas por completo a la función (backup, atajos...).
   * 'inline': un Card más chico, para gatear sólo una sección de una
   * pantalla que tiene otras cosas gratis al lado (ver `currencies.tsx`). */
  variant?: 'screen' | 'inline';
}

/**
 * Envuelve contenido que sólo tiene sentido en Pro. Mientras se resuelve el
 * plan no muestra nada todavía (más honesto que dejar pasar y que el
 * backend lo rechace después, ver
 * `apps.billing.services.require_feature_for_workspace`); si el plan
 * efectivo no tiene la función, reemplaza `children` por un upsell en vez
 * de dejar que la persona la use para toparse con un error.
 */
export function ProFeatureGate({ feature, children, variant = 'screen' }: ProFeatureGateProps) {
  const colors = useColors();
  const myPlan = useMyPlan();
  const copy = FEATURE_COPY[feature];

  if (myPlan.isLoading) {
    return variant === 'screen' ? <LoadingState /> : null;
  }

  // Sin plan resuelto (entorno sin seedear), igual de "fail-open" que el
  // backend -- una feature ausente en `features` si HAY plan es `false`.
  const plan = myPlan.data?.plan;
  const enabled = plan ? Boolean(plan.features[feature]) : true;
  if (enabled) return <>{children}</>;

  const upsellButton = (
    <Button label="Pasate a Pro" onPress={() => router.push('/pro')} />
  );

  if (variant === 'inline') {
    return (
      <Card title={copy.title}>
        <View className="items-start gap-3">
          <Text className="text-text-muted text-sm leading-5">{copy.description}</Text>
          {upsellButton}
        </View>
      </Card>
    );
  }

  return (
    <View className="flex-1 items-center justify-center gap-4 px-8">
      <View
        className="h-14 w-14 items-center justify-center rounded-full"
        style={{ backgroundColor: colors.surface2 }}
      >
        <Icon name="star" size={22} color={colors.textMuted} />
      </View>
      <Text className="text-text text-center text-base" style={{ fontFamily: fonts.bold }}>
        {copy.title}
      </Text>
      <Text className="text-text-muted text-center text-sm leading-5">{copy.description}</Text>
      {upsellButton}
    </View>
  );
}
