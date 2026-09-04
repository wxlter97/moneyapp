import { Pressable, ScrollView, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';

import { ScreenHeader } from '@/components/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { FadeInView } from '@/components/ui/FadeInView';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Segmented } from '@/components/ui/Segmented';
import { haptics } from '@/lib/haptics';
import { useThemeStore, type ThemePref } from '@/store/theme';

interface Tool {
  icon: IconName;
  tint: string;
  label: string;
  hint: string;
  onPress?: () => void;
  soon?: boolean;
}

const TOOLS: Tool[] = [
  {
    icon: 'tag',
    tint: '#7C5CFC',
    label: 'Categorías',
    hint: 'Grupos y subcategorías',
    onPress: () => router.push('/categories'),
  },
  {
    icon: 'repeat',
    tint: '#2FBF71',
    label: 'Recurrentes',
    hint: 'Gastos e ingresos fijos',
    onPress: () => router.push('/recurring'),
  },
  {
    icon: 'receipt',
    tint: '#F0568F',
    label: 'Compras a plazo',
    hint: 'Pagos en cuotas',
    onPress: () => router.push('/installments'),
  },
  {
    icon: 'download',
    tint: '#4F8CFF',
    label: 'Exportar datos',
    hint: 'Descarga en CSV',
    onPress: () => router.push('/export'),
  },
  {
    icon: 'reset',
    tint: '#D6363C',
    label: 'Restablecer',
    hint: 'Borrar datos del presupuesto',
    onPress: () => router.push('/reset'),
  },
];

const THEME_OPTIONS: { value: ThemePref; label: string }[] = [
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Oscuro' },
  { value: 'system', label: 'Sistema' },
];

export default function ToolsScreen() {
  const version = Constants.expoConfig?.version ?? '—';
  const themePref = useThemeStore((s) => s.pref);
  const setThemePref = useThemeStore((s) => s.setPref);

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
                    className={`rounded-xl border border-border bg-surface-2 p-3 ${
                      tool.onPress ? 'active:opacity-60' : 'opacity-50'
                    }`}
                  >
                    <View
                      className="h-9 w-9 items-center justify-center rounded-lg"
                      style={{ backgroundColor: tool.tint + '26' }}
                    >
                      <Icon name={tool.icon} size={18} color={tool.tint} />
                    </View>
                    <Text className="text-text mt-2 text-sm font-semibold">
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
        </Card>

        <Text className="text-text-muted self-center text-xs">Versión {version}</Text>
      </ScrollView>
    </View>
  );
}
