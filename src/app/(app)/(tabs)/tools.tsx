import { Pressable, ScrollView, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';

import { ScreenHeader } from '@/components/ScreenHeader';
import { Card } from '@/components/ui/Card';

interface Tool {
  glyph: string;
  label: string;
  hint: string;
  onPress?: () => void;
  soon?: boolean;
}

const TOOLS: Tool[] = [
  {
    glyph: '🏷️',
    label: 'Categorías',
    hint: 'Grupos y subcategorías',
    onPress: () => router.push('/categories'),
  },
  {
    glyph: '🔁',
    label: 'Recurrentes',
    hint: 'Gastos e ingresos fijos',
    onPress: () => router.push('/recurring'),
  },
  {
    glyph: '📤',
    label: 'Exportar datos',
    hint: 'Descarga en CSV',
    onPress: () => router.push('/export'),
  },
  {
    glyph: '♻️',
    label: 'Restablecer',
    hint: 'Borrar datos del presupuesto',
    onPress: () => router.push('/reset'),
  },
];

export default function ToolsScreen() {
  const version = Constants.expoConfig?.version ?? '—';

  return (
    <View className="flex-1 bg-bg">
      <ScrollView contentContainerClassName="px-4 pb-24 self-center w-full max-w-[560px] gap-4">
        <ScreenHeader title="Herramientas" />

        <Card title="Gestión">
          <View className="-my-1 flex-row flex-wrap">
            {TOOLS.map((tool, i) => (
              <View key={tool.label} className="w-1/2 p-1">
                <Pressable
                  onPress={tool.onPress}
                  disabled={!tool.onPress}
                  accessibilityRole="button"
                  className={`rounded-xl border border-border bg-surface-2 p-3 ${
                    tool.onPress ? 'active:opacity-60' : 'opacity-50'
                  }`}
                >
                  <Text className="text-2xl">{tool.glyph}</Text>
                  <Text className="text-text mt-2 text-sm font-semibold">
                    {tool.label}
                  </Text>
                  <Text className="text-text-muted mt-0.5 text-xs" numberOfLines={1}>
                    {tool.soon ? 'Pronto' : tool.hint}
                  </Text>
                </Pressable>
              </View>
            ))}
          </View>
        </Card>

        <Text className="text-text-muted self-center text-xs">Versión {version}</Text>
      </ScrollView>
    </View>
  );
}
