import { Pressable, ScrollView, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useColorScheme } from 'nativewind';

import { ScreenHeader } from '@/components/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { FadeInView } from '@/components/ui/FadeInView';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Segmented } from '@/components/ui/Segmented';
import { haptics } from '@/lib/haptics';
import { useColors } from '@/theme';
import { ACCENTS } from '@/theme/accents';
import { fonts } from '@/theme/typography';
import { useThemeStore, type ThemePref } from '@/store/theme';
import { useAccentStore } from '@/store/accent';

interface Tool {
  icon: IconName;
  label: string;
  hint: string;
  onPress?: () => void;
  /** Acción destructiva: es el único ícono que se pinta con color (rojo). */
  destructive?: boolean;
  soon?: boolean;
}

const TOOLS: Tool[] = [
  {
    icon: 'tag',
    label: 'Categorías',
    hint: 'Grupos y subcategorías',
    onPress: () => router.push('/categories'),
  },
  {
    icon: 'users',
    label: 'Miembros',
    hint: 'Quién ve y edita este presupuesto',
    onPress: () => router.push('/members'),
  },
  {
    icon: 'inbox',
    label: 'Importaciones',
    hint: 'Correos bancarios por revisar',
    onPress: () => router.push('/imports'),
  },
  {
    icon: 'bolt',
    label: 'Atajos',
    hint: 'Agregar gastos desde Apple Shortcuts',
    onPress: () => router.push('/shortcuts'),
  },
  {
    icon: 'bell',
    label: 'Notificaciones',
    hint: 'Recordatorios de recurrentes, cuotas y presupuesto',
    onPress: () => router.push('/notifications'),
  },
  {
    icon: 'lock',
    label: 'Seguridad',
    hint: 'Bloqueo con Face ID o PIN',
    onPress: () => router.push('/security'),
  },
  {
    icon: 'trending',
    label: 'Patrimonio',
    hint: 'Evolución mes a mes',
    onPress: () => router.push('/net-worth-history'),
  },
  {
    icon: 'bars',
    label: 'Tendencias',
    hint: 'Ingresos, gastos y qué categorías crecieron',
    onPress: () => router.push('/trends'),
  },
  {
    icon: 'swap',
    label: 'Monedas',
    hint: 'Moneda base y tasas de cambio',
    onPress: () => router.push('/currencies'),
  },
  {
    icon: 'repeat',
    label: 'Recurrentes',
    hint: 'Gastos e ingresos fijos',
    onPress: () => router.push('/recurring'),
  },
  {
    icon: 'receipt',
    label: 'Compras a plazo',
    hint: 'Pagos en cuotas',
    onPress: () => router.push('/installments'),
  },
  {
    icon: 'card',
    label: 'Estado de cuenta',
    hint: 'Cuánto debes en tus tarjetas',
    onPress: () => router.push('/statements'),
  },
  {
    icon: 'download',
    label: 'Exportar datos',
    hint: 'Descarga en CSV',
    onPress: () => router.push('/export'),
  },
  {
    icon: 'reset',
    label: 'Restablecer',
    hint: 'Borrar datos del presupuesto',
    onPress: () => router.push('/reset'),
    destructive: true,
  },
];

const THEME_OPTIONS: { value: ThemePref; label: string }[] = [
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Oscuro' },
  { value: 'system', label: 'Sistema' },
];

export default function ToolsScreen() {
  const colors = useColors();
  const version = Constants.expoConfig?.version ?? '—';
  const themePref = useThemeStore((s) => s.pref);
  const setThemePref = useThemeStore((s) => s.setPref);
  const { colorScheme } = useColorScheme();
  const scheme = colorScheme === 'light' ? 'light' : 'dark';
  const accentId = useAccentStore((s) => s.accent);
  const setAccent = useAccentStore((s) => s.setAccent);

  return (
    <View className="flex-1 bg-bg">
      <ScrollView contentContainerClassName="px-4 pb-32 self-center w-full max-w-[560px] gap-4">
        <ScreenHeader title="Herramientas" />

        <Card title="Gestión">
          <View className="-my-1 flex-row flex-wrap">
            {TOOLS.map((tool, i) => (
              <View key={tool.label} className="w-1/2 p-1">
                <FadeInView index={i}>
                  <Pressable
                    onPress={() => {
                      if (!tool.onPress) return;
                      haptics.tap();
                      tool.onPress();
                    }}
                    disabled={!tool.onPress}
                    accessibilityRole="button"
                    className={`rounded-3xl bg-surface-2 p-3 ${
                      tool.onPress ? 'active:opacity-60' : 'opacity-50'
                    }`}
                  >
                    <Icon
                      name={tool.icon}
                      size={20}
                      color={tool.destructive ? colors.expense : colors.text}
                    />
                    <Text
                      className="text-text mt-2.5 text-sm"
                      style={{ fontFamily: fonts.semibold }}
                    >
                      {tool.label}
                    </Text>
                    <Text className="text-text-muted mt-0.5 text-xs" numberOfLines={1}>
                      {tool.soon ? 'Pronto' : tool.hint}
                    </Text>
                  </Pressable>
                </FadeInView>
              </View>
            ))}
          </View>
        </Card>

        <Card title="Apariencia">
          <Segmented value={themePref} onChange={setThemePref} options={THEME_OPTIONS} />

          <Text className="text-text-muted mb-2 mt-4 text-xs">Acento</Text>
          <View className="flex-row flex-wrap gap-3">
            {ACCENTS.map((accent) => {
              const active = accent.id === accentId;
              return (
                <Pressable
                  key={accent.id}
                  onPress={() => {
                    if (!active) haptics.selection();
                    setAccent(accent.id);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={accent.label}
                  style={{ backgroundColor: accent[scheme].primary }}
                  className={`h-9 w-9 rounded-full border-2 ${
                    active ? 'border-text' : 'border-transparent'
                  }`}
                />
              );
            })}
          </View>
        </Card>

        <Text className="text-text-muted self-center text-xs">Versión {version}</Text>
      </ScrollView>
    </View>
  );
}
